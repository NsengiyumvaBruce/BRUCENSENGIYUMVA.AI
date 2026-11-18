import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildMasterSystemInstruction,
  getDisciplineById,
  getLevelById,
  parseDataUrl,
  prepareTextForSpeech,
} from './src/lib/pedagogy.ts';
import type {
  AdaptiveStageId,
  DisciplineId,
  EducationalLevelId,
  TeachingMode,
} from './src/lib/pedagogy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FAST_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
const TTS_MODEL = 'gemini-3.8-flash-lite-tts';

function createAiClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractCleanErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed?.error?.message) {
      try {
        const inner = JSON.parse(parsed.error.message) as { error?: { message?: string } };
        if (inner?.error?.message) return inner.error.message;
      } catch {
        return parsed.error.message;
      }
    }
  } catch {
    // Plain error string
  }
  return raw;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function runWithModelFallback<T>(
  runner: (model: string, thinkingLevel: ThinkingLevel) => Promise<T>,
  options?: { preferDeep?: boolean; timeoutMs?: number }
): Promise<T> {
  const primaryLevel = options?.preferDeep ? ThinkingLevel.HIGH : ThinkingLevel.LOW;
  const timeoutMs = options?.timeoutMs ?? 10000;

  try {
    return await withTimeout(runner(PRIMARY_MODEL, primaryLevel), timeoutMs, PRIMARY_MODEL);
  } catch (primaryErr) {
    console.warn('[BRUCE AI] Primary model fallback triggered:', extractCleanErrorMessage(primaryErr));
    try {
      return await withTimeout(
        runner(FAST_FALLBACK_MODEL, ThinkingLevel.MINIMAL),
        20000,
        FAST_FALLBACK_MODEL
      );
    } catch (fallbackErr) {
      const msg = extractCleanErrorMessage(fallbackErr);
      console.warn('[BRUCE AI] Fallback attempt 1 failed:', msg);
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        await new Promise((r) => setTimeout(r, 800));
        return await withTimeout(
          runner(PRIMARY_MODEL, ThinkingLevel.LOW),
          20000,
          PRIMARY_MODEL
        );
      }
      throw fallbackErr;
    }
  }
}

function formatApiError(err: unknown): { status: number; message: string } {
  const cleanMessage = extractCleanErrorMessage(err);
  console.error('[BRUCE AI] API Error:', cleanMessage);
  if (
    cleanMessage.includes('API_KEY_INVALID') ||
    cleanMessage.includes('PERMISSION_DENIED') ||
    cleanMessage.includes('not configured')
  ) {
    return {
      status: 400,
      message: 'Unable to reach Gemini API with the configured key. Please verify your API key in Settings > Secrets.',
    };
  }
  if (cleanMessage.includes('RESOURCE_EXHAUSTED') || cleanMessage.includes('429')) {
    return {
      status: 429,
      message: 'API rate limit reached. Please wait a moment and try again.',
    };
  }
  if (
    cleanMessage.includes('503') ||
    cleanMessage.includes('high demand') ||
    cleanMessage.includes('UNAVAILABLE') ||
    cleanMessage.includes('timed out')
  ) {
    return {
      status: 503,
      message: 'The AI model is temporarily busy. Please tap Retry to get your answer.',
    };
  }
  return {
    status: 500,
    message: cleanMessage || 'Unexpected server error while processing your question.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      system: 'BRUCENSENGIYUMVA AI',
      developer: 'BRUCE DIGITAL 360',
      model: PRIMARY_MODEL,
      fallbackModel: FAST_FALLBACK_MODEL,
      transcribeModel: TRANSCRIBE_MODEL,
      ttsModel: TTS_MODEL,
    });
  });

  // Fast Streaming Multimodal Personal Teacher Chat
  app.post('/api/tutor/chat', async (req, res) => {
    try {
      const {
        messages,
        levelId = 'high_school',
        disciplineId = 'mathematics',
        stageId = 'teach',
        teachingMode = 'direct',
        responseSpeed = 'fast',
        voiceMode = false,
        actionDirective,
      } = req.body as {
        messages: Array<{
          role: 'user' | 'assistant';
          content: string;
          attachments?: Array<{ mimeType: string; dataUrl: string }>;
        }>;
        levelId?: EducationalLevelId;
        disciplineId?: DisciplineId;
        stageId?: AdaptiveStageId;
        teachingMode?: TeachingMode;
        responseSpeed?: 'fast' | 'deep';
        voiceMode?: boolean;
        actionDirective?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'At least one message is required.' });
        return;
      }

      const ai = createAiClient();
      const baseInstruction = buildMasterSystemInstruction({
        levelId,
        disciplineId,
        stageId,
        teachingMode,
      });
      const systemInstruction = voiceMode
        ? `${baseInstruction}\n\nVOICE ASSISTANT MODE:\nThe learner requested a spoken voice response. Deliver a clear, conversational, well-paced explanation suitable for listening aloud—avoid wide Markdown tables, dense ASCII diagrams, or excessive symbol clutter while keeping academic accuracy.`
        : baseInstruction;

      let hasAttachments = false;
      const contents = messages.map((m, idx) => {
        const isLast = idx === messages.length - 1;
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        if (Array.isArray(m.attachments)) {
          for (const att of m.attachments) {
            const parsed = parseDataUrl(att.dataUrl);
            if (parsed) {
              hasAttachments = true;
              parts.push({
                inlineData: {
                  mimeType: parsed.mimeType,
                  data: parsed.data,
                },
              });
            }
          }
        }

        const rawText = (m.content ?? '').trim();
        const fallbackPrompt =
          parts.length > 0 && !rawText
            ? 'Please inspect the attached image carefully, explain the concept or solve the problem step by step, and help me understand.'
            : rawText;

        const finalText =
          isLast && actionDirective
            ? `${fallbackPrompt}\n\n[Teacher Directive: ${actionDirective}]`
            : fallbackPrompt;

        if (finalText) {
          parts.push({ text: finalText });
        }

        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts,
        };
      });

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();
      res.write(': stream-open\n\n');

      const timeoutMs =
        responseSpeed === 'deep'
          ? 16000
          : hasAttachments
          ? 14000
          : 8500;

      const stream = await runWithModelFallback(
        (model, thinkingLevel) =>
          ai.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction,
              thinkingConfig: { thinkingLevel },
            },
          }),
        { preferDeep: responseSpeed === 'deep', timeoutMs }
      );

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      const formatted = formatApiError(err);
      if (!res.headersSent) {
        res.status(formatted.status).json({ error: formatted.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: formatted.message })}\n\n`);
        res.end();
      }
    }
  });

  // Speech-to-Text Audio Transcription
  app.post('/api/tutor/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType = 'audio/webm' } = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };

      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json({ error: 'Recorded audio data is required for transcription.' });
        return;
      }

      const normalizedMime = (mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';
      const audioPart = {
        inlineData: {
          mimeType: normalizedMime,
          data: audioBase64,
        },
      };

      const attempts: Array<{
        label: string;
        run: () => Promise<Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>>;
      }> = [
        {
          label: `${TRANSCRIBE_MODEL}:v1beta`,
          run: () =>
            createAiClient('v1beta').models.generateContent({
              model: TRANSCRIBE_MODEL,
              contents: { parts: [audioPart, { text: 'Transcribe this audio.' }] },
            }),
        },
        {
          label: `${PRIMARY_MODEL}:default`,
          run: () =>
            createAiClient().models.generateContent({
              model: PRIMARY_MODEL,
              contents: [{ role: 'user', parts: [audioPart, { text: 'Transcribe the spoken words in this audio into plain text. Return only the spoken words.' }] }],
              config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            }),
        },
        {
          label: `${FAST_FALLBACK_MODEL}:default`,
          run: () =>
            createAiClient().models.generateContent({
              model: FAST_FALLBACK_MODEL,
              contents: [{ role: 'user', parts: [audioPart, { text: 'Transcribe the spoken words in this audio into plain text. Return only the spoken words.' }] }],
              config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              },
            }),
        },
      ];

      let transcribedText = '';
      let lastErr: unknown = null;

      for (const attempt of attempts) {
        try {
          const resp = await withTimeout(attempt.run(), 15000, attempt.label);
          const candidateText =
            resp.text ??
            resp.candidates?.[0]?.content?.parts
              ?.map((p) => p.text ?? '')
              .join(' ') ??
            '';
          transcribedText = candidateText.trim();
          if (transcribedText) {
            lastErr = null;
            break;
          }
          console.warn(`[BRUCE AI] Empty transcript from ${attempt.label}`);
        } catch (attemptErr) {
          lastErr = attemptErr;
          const msg = extractCleanErrorMessage(attemptErr);
          console.warn(`[BRUCE AI] Transcribe ${attempt.label} failed:`, msg);
          if (
            msg.includes('API_KEY_INVALID') ||
            msg.includes('PERMISSION_DENIED') ||
            msg.includes('not configured')
          ) {
            throw attemptErr;
          }
        }
      }

      if (!transcribedText && lastErr) {
        throw lastErr;
      }

      res.json({
        text: transcribedText,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Text-to-Speech Voice Teacher Reply (Returns complete WAV audio)
  app.post('/api/tutor/speak', async (req, res) => {
    try {
      const { text, voiceName = 'Kore' } = req.body as {
        text?: string;
        voiceName?: string;
      };

      const spokenText = prepareTextForSpeech(text ?? '', 1800);
      if (!spokenText) {
        res.status(400).json({ error: 'Text content is required to generate voice audio.' });
        return;
      }

      const extractAudioPart = (resp: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>) => {
        const parts = resp.candidates?.[0]?.content?.parts ?? [];
        for (const p of parts) {
          if (p.inlineData?.data) {
            return {
              data: p.inlineData.data,
              mimeType: p.inlineData.mimeType || 'audio/wav',
            };
          }
        }
        return null;
      };

      let audioPart: { data: string; mimeType: string } | null = null;
      let lastErr: unknown = null;

      const attempts: Array<() => Promise<Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>>> = [
        () =>
          createAiClient('v1alpha').models.generateContent({
            model: TTS_MODEL,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: spokenText,
                    speechMetadata: {
                      style: 'Warm, clear, patient academic personal teacher',
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
                },
              },
            },
          }),
        () =>
          createAiClient('v1beta').models.generateContent({
            model: TTS_MODEL,
            contents: [{ role: 'user', parts: [{ text: spokenText }] }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
                },
              },
            },
          }),
        () =>
          createAiClient('v1beta').models.generateContent({
            model: TTS_MODEL,
            contents: spokenText,
            config: {
              responseModalities: ['AUDIO'],
            },
          }),
      ];

      for (const runAttempt of attempts) {
        try {
          const resp = await withTimeout(runAttempt(), 20000, TTS_MODEL);
          audioPart = extractAudioPart(resp);
          if (audioPart) break;
        } catch (attemptErr) {
          lastErr = attemptErr;
          const msg = extractCleanErrorMessage(attemptErr);
          if (!msg.includes('Unknown name') && !msg.includes('Invalid JSON payload')) {
            throw attemptErr;
          }
        }
      }

      if (!audioPart) {
        if (lastErr) throw lastErr;
        res.status(502).json({ error: 'Voice synthesis did not return audio data.' });
        return;
      }

      res.json({
        audioBase64: audioPart.data,
        mimeType: audioPart.mimeType,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Structured Mathematics Solver (supports text + uploaded problem photo)
  app.post('/api/tutor/math-solve', async (req, res) => {
    try {
      const {
        problemStatement = '',
        imageDataUrl,
        subfield = 'Calculus',
        levelId = 'high_school',
      } = req.body as {
        problemStatement?: string;
        imageDataUrl?: string;
        subfield?: string;
        levelId?: EducationalLevelId;
      };

      const parsedImage = imageDataUrl ? parseDataUrl(imageDataUrl) : null;
      const trimmedProblem = problemStatement.trim();

      if (!trimmedProblem && !parsedImage) {
        res.status(400).json({ error: 'Please enter a mathematics problem or attach a photo of one.' });
        return;
      }

      const ai = createAiClient();
      const level = getLevelById(levelId);

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (parsedImage) {
        parts.push({
          inlineData: {
            mimeType: parsedImage.mimeType,
            data: parsedImage.data,
          },
        });
      }
      parts.push({
        text: trimmedProblem
          ? `Subfield: ${subfield}\nLearner Level: ${level.label}\nProblem: ${trimmedProblem}`
          : `Subfield: ${subfield}\nLearner Level: ${level.label}\nPlease read the mathematics problem from the attached image and solve it completely step by step.`,
      });

      const response = await runWithModelFallback(
        (model, thinkingLevel) =>
          ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts }],
            config: {
              systemInstruction: buildMasterSystemInstruction({
                levelId,
                disciplineId: 'mathematics',
                stageId: 'demonstrate',
                teachingMode: 'direct',
              }),
              thinkingConfig: { thinkingLevel },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  given: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  toCalculate: { type: Type.STRING },
                  conceptSummary: { type: Type.STRING },
                  steps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepNumber: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        mathExpression: { type: Type.STRING },
                      },
                      required: ['stepNumber', 'title', 'explanation', 'mathExpression'],
                    },
                  },
                  finalAnswer: { type: Type.STRING },
                  verificationCheck: { type: Type.STRING },
                  practiceQuestion: {
                    type: Type.OBJECT,
                    properties: {
                      prompt: { type: Type.STRING },
                      hint: { type: Type.STRING },
                      expectedConcept: { type: Type.STRING },
                    },
                    required: ['prompt', 'hint', 'expectedConcept'],
                  },
                },
                required: [
                  'given',
                  'toCalculate',
                  'conceptSummary',
                  'steps',
                  'finalAnswer',
                  'verificationCheck',
                  'practiceQuestion',
                ],
              },
            },
          }),
        { preferDeep: false, timeoutMs: 12000 }
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        id: `math-${Date.now()}`,
        subfield,
        problemStatement: trimmedProblem || parsed.toCalculate || 'Problem from uploaded image',
        ...parsed,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Constructive Practice Evaluation
  app.post('/api/tutor/evaluate', async (req, res) => {
    try {
      const {
        questionPrompt,
        expectedConcept,
        learnerAnswer,
        levelId = 'high_school',
        disciplineId = 'mathematics',
      } = req.body as {
        questionPrompt: string;
        expectedConcept?: string;
        learnerAnswer: string;
        levelId?: EducationalLevelId;
        disciplineId?: DisciplineId;
      };

      if (!learnerAnswer || !learnerAnswer.trim()) {
        res.status(400).json({ error: 'Please write your answer or reasoning attempt first.' });
        return;
      }

      const ai = createAiClient();
      const level = getLevelById(levelId);
      const discipline = getDisciplineById(disciplineId);

      const response = await runWithModelFallback(
        (model, thinkingLevel) =>
          ai.models.generateContent({
            model,
            contents: `Level: ${level.label}\nDiscipline: ${discipline.label}\nQuestion: ${questionPrompt}\nReference Concept: ${expectedConcept ?? 'Evaluate mathematical/academic correctness'}\nLearner's Attempt: ${learnerAnswer.trim()}`,
            config: {
              systemInstruction:
                'You are BRUCENSENGIYUMVA AI evaluating a learner attempt. Never humiliate or discourage. Celebrate valid reasoning, pinpoint any subtle mistake gently, explain using an alternative angle if needed, and assign an accurate score 0-100.',
              thinkingConfig: { thinkingLevel },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isCorrect: { type: Type.BOOLEAN },
                  scorePercent: { type: Type.INTEGER },
                  feedback: { type: Type.STRING },
                  misconceptionCheck: { type: Type.STRING },
                  nextStepRecommendation: { type: Type.STRING },
                  recommendedStage: { type: Type.STRING },
                },
                required: [
                  'isCorrect',
                  'scorePercent',
                  'feedback',
                  'misconceptionCheck',
                  'nextStepRecommendation',
                  'recommendedStage',
                ],
              },
            },
          }),
        { preferDeep: false, timeoutMs: 10000 }
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Intelligent Academic Research Engine with Google Search Grounding
  app.post('/api/research/search', async (req, res) => {
    try {
      const {
        query,
        depth = 'overview',
        levelId = 'university',
        disciplineId = 'humanities',
      } = req.body as {
        query: string;
        depth?: 'overview' | 'deep';
        levelId?: EducationalLevelId;
        disciplineId?: DisciplineId;
      };

      if (!query || !query.trim()) {
        res.status(400).json({ error: 'Please enter an academic research question or topic.' });
        return;
      }

      const ai = createAiClient();
      const level = getLevelById(levelId);
      const discipline = getDisciplineById(disciplineId);

      const response = await runWithModelFallback(
        (model, thinkingLevel) =>
          ai.models.generateContent({
            model,
            contents: `Research Query: ${query.trim()}
Target Academic Level: ${level.label}
Primary Discipline Context: ${discipline.label}
Requested Depth: ${depth === 'deep' ? 'Deep Academic Synthesis with methodology, key evidence, and open debates' : 'Clear Academic Overview with foundational concepts and verified facts'}

Provide a well-structured Markdown research brief with:
1. Executive Summary
2. Key Concepts & Evidence
3. Practical or Real-World Implications
4. Three Follow-up Inquiry Questions (under a "## Follow-up Inquiry Questions" heading as a numbered list).`,
            config: {
              systemInstruction:
                'You are the BRUCENSENGIYUMVA AI Research Engine (developed by BRUCE DIGITAL 360). Synthesize accurate, source-grounded academic knowledge clearly without fabrication.',
              tools: [{ googleSearch: {} }],
              thinkingConfig: { thinkingLevel },
            },
          }),
        { preferDeep: depth === 'deep', timeoutMs: 14000 }
      );

      const rawText = response.text ?? '';
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const seenUris = new Set<string>();
      const citations: Array<{ title: string; uri: string }> = [];

      for (const chunk of chunks) {
        const web = (chunk as { web?: { uri?: string; title?: string } }).web;
        if (web?.uri && !seenUris.has(web.uri)) {
          seenUris.add(web.uri);
          citations.push({
            title: web.title || web.uri,
            uri: web.uri,
          });
        }
      }

      res.json({
        id: `research-${Date.now()}`,
        query: query.trim(),
        depth,
        summaryMarkdown: rawText,
        citations,
        followUpQuestions: [],
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BRUCENSENGIYUMVA AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BRUCENSENGIYUMVA AI server:', err);
  process.exit(1);
});
