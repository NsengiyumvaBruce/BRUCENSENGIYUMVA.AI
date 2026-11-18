import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  ChevronDown,
  Copy,
  FileText,
  ImagePlus,
  Lightbulb,
  Loader2,
  Mic,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import {
  ACADEMIC_DISCIPLINES,
  ADAPTIVE_STAGES,
  EDUCATIONAL_LEVELS,
  computeNextAdaptiveStage,
  getDisciplineById,
  getLevelById,
  getStageById,
} from '../lib/pedagogy';
import type {
  AdaptiveStageId,
  ChatMessage,
  DisciplineId,
  EducationalLevelId,
  ImageAttachment,
  StudySession,
  TeachingMode,
} from '../lib/pedagogy';
import { blobToBase64, compressImageFile } from '../utils/media';
import { MarkdownRenderer } from './MarkdownRenderer';

interface TutorWorkspaceProps {
  session: StudySession;
  onUpdateSession: (updater: (prev: StudySession) => StudySession) => void;
  onSelectLevel: (levelId: EducationalLevelId) => void;
  onSelectDiscipline: (disciplineId: DisciplineId) => void;
  onSaveToNotebook: (params: {
    title: string;
    category: 'lesson' | 'math' | 'research';
    contentMarkdown: string;
  }) => void;
  onOpenMathLab: () => void;
}

const MAX_IMAGES_PER_MESSAGE = 4;

const QUICK_STARTERS: Array<{
  title: string;
  prompt: string;
  disciplineId: DisciplineId;
}> = [
  {
    title: 'Solve a math problem step by step',
    prompt: 'Solve 2x^2 - 7x + 3 = 0 step by step and show how to verify both roots.',
    disciplineId: 'mathematics',
  },
  {
    title: 'Explain a science concept simply',
    prompt: 'Explain how photosynthesis works in simple terms, then give a real-world example.',
    disciplineId: 'biology',
  },
  {
    title: 'Learn & trace programming logic',
    prompt: 'Write binary search in Python and trace how it finds 23 in [4, 9, 15, 23, 42].',
    disciplineId: 'computer_science',
  },
  {
    title: 'Explore physics intuition',
    prompt: 'Why does an ice skater spin faster when pulling their arms inward?',
    disciplineId: 'physics',
  },
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const TutorWorkspace: React.FC<TutorWorkspaceProps> = ({
  session,
  onUpdateSession,
  onSelectLevel,
  onSelectDiscipline,
  onSaveToNotebook,
  onOpenMathLab,
}) => {
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);
  const [responseSpeed, setResponseSpeed] = useState<'fast' | 'deep'>('fast');
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedRequest, setLastFailedRequest] = useState<{
    prompt: string;
    attachments?: ImageAttachment[];
    voiceReply?: boolean;
  } | null>(null);

  const [savedMessageIds, setSavedMessageIds] = useState<Record<string, boolean>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showStagesPanel, setShowStagesPanel] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Voice playback / TTS state
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});
  const [synthesizingMsgId, setSynthesizingMsgId] = useState<string | null>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [revealedTextIds, setRevealedTextIds] = useState<Record<string, boolean>>({});

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const cancelRecordingFlagRef = useRef(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const activeLevel = getLevelById(session.levelId);
  const activeDiscipline = getDisciplineById(session.disciplineId);
  const activeStage = getStageById(session.stageId);

  // Auto-scroll smoothly as messages stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session.messages.length, session.messages[session.messages.length - 1]?.content]);

  // Auto-resize textarea height cleanly like ChatGPT/Claude
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Cleanup audio player and mic resources on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const stopCurrentAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    setPlayingMsgId(null);
  };

  const playAudioDataUrl = async (msgId: string, dataUrl: string) => {
    stopCurrentAudio();
    const audio = new Audio(dataUrl);
    audioPlayerRef.current = audio;
    audio.onended = () => {
      setPlayingMsgId((prev) => (prev === msgId ? null : prev));
    };
    audio.onerror = () => {
      setPlayingMsgId((prev) => (prev === msgId ? null : prev));
    };
    setPlayingMsgId(msgId);
    try {
      await audio.play();
    } catch {
      // Browser autoplay restriction — user can tap Play button directly on the Voice Card
      setPlayingMsgId(null);
    }
  };

  const synthesizeAndPlay = async (msgId: string, textContent: string, fromStart = true) => {
    if (!textContent.trim()) return;

    if (playingMsgId === msgId && !fromStart && audioPlayerRef.current) {
      stopCurrentAudio();
      return;
    }

    const cached = audioCache[msgId];
    if (cached) {
      await playAudioDataUrl(msgId, cached);
      return;
    }

    setSynthesizingMsgId(msgId);
    try {
      const response = await fetch('/api/tutor/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textContent }),
      });
      const data = (await response.json()) as {
        audioBase64?: string;
        mimeType?: string;
        error?: string;
      };
      if (!response.ok || !data.audioBase64) {
        throw new Error(data.error || 'Unable to generate voice audio.');
      }
      const audioDataUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      setAudioCache((prev) => ({ ...prev, [msgId]: audioDataUrl }));
      await playAudioDataUrl(msgId, audioDataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate voice reply.');
      setRevealedTextIds((prev) => ({ ...prev, [msgId]: true }));
    } finally {
      setSynthesizingMsgId((prev) => (prev === msgId ? null : prev));
    }
  };

  const addImageFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setErrorMsg('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const slotsRemaining = MAX_IMAGES_PER_MESSAGE - pendingImages.length;
    if (slotsRemaining <= 0) {
      setErrorMsg(`You can attach up to ${MAX_IMAGES_PER_MESSAGE} images per message.`);
      return;
    }

    setErrorMsg(null);
    try {
      const toProcess = fileArray.slice(0, slotsRemaining);
      const processed = await Promise.all(toProcess.map((file) => compressImageFile(file)));
      setPendingImages((prev) => [...prev, ...processed]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to process selected image.');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedImages: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) pastedImages.push(file);
      }
    }
    if (pastedImages.length > 0) {
      e.preventDefault();
      void addImageFiles(pastedImages);
    }
  };

  const sendPrompt = async (
    promptText: string,
    options?: {
      attachments?: ImageAttachment[];
      nextStage?: AdaptiveStageId;
      actionDirective?: string;
      disciplineOverride?: DisciplineId;
      skipUserEcho?: boolean;
      forceVoiceReply?: boolean;
    }
  ) => {
    const trimmed = promptText.trim();
    const attachmentsToSend = options?.attachments ?? pendingImages;
    if ((!trimmed && attachmentsToSend.length === 0) || isStreaming) return;

    stopCurrentAudio();
    setErrorMsg(null);
    setLastFailedRequest(null);

    const useVoiceReply = options?.forceVoiceReply ?? voiceReplyEnabled;
    const targetStage = options?.nextStage ?? session.stageId;
    const effectiveDiscipline = options?.disciplineOverride ?? session.disciplineId;

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      timestamp: new Date().toISOString(),
    };
    const assistantMessageId = `msg-ai-${Date.now() + 1}`;
    const placeholderAssistant: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      voiceReply: useVoiceReply,
      timestamp: new Date().toISOString(),
      stageAtReply: targetStage,
      modeUsed: session.teachingMode,
    };

    const nextMessages = options?.skipUserEcho
      ? [...session.messages]
      : [...session.messages, userMessage];

    const fallbackTitle = trimmed
      ? trimmed.length > 42
        ? `${trimmed.slice(0, 42)}...`
        : trimmed
      : 'Image Question';

    const derivedTitle = session.messages.length === 0 ? fallbackTitle : session.title;

    onUpdateSession((prev) => ({
      ...prev,
      title: derivedTitle,
      disciplineId: effectiveDiscipline,
      stageId: targetStage,
      messages: options?.skipUserEcho
        ? [...prev.messages, placeholderAssistant]
        : [...prev.messages, userMessage, placeholderAssistant],
      updatedAt: new Date().toISOString(),
    }));

    if (!options?.skipUserEcho) {
      setInput('');
      setPendingImages([]);
    }
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments?.map((a) => ({
              mimeType: a.mimeType,
              dataUrl: a.dataUrl,
            })),
          })),
          levelId: session.levelId,
          disciplineId: effectiveDiscipline,
          stageId: targetStage,
          teachingMode: session.teachingMode,
          responseSpeed,
          voiceMode: useVoiceReply,
          actionDirective: options?.actionDirective,
        }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({ error: 'Failed to reach tutor.' }));
        throw new Error(errPayload.error || `Server error (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response body unavailable.');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          for (const rawLine of event.split('\n')) {
            const line = rawLine.trim();
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;
            const payload = JSON.parse(jsonStr) as { text?: string; error?: string; done?: boolean };

            if (payload.error) {
              throw new Error(payload.error);
            }
            if (payload.text) {
              accumulatedText += payload.text;
              onUpdateSession((prev) => ({
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: accumulatedText } : m
                ),
                updatedAt: new Date().toISOString(),
              }));
            }
          }
        }
      }

      if (!accumulatedText.trim()) {
        throw new Error('No response was received. Please tap Retry.');
      }

      if (useVoiceReply) {
        void synthesizeAndPlay(assistantMessageId, accumulatedText, true);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Unable to generate response.';
      setErrorMsg(message);
      setLastFailedRequest({
        prompt: trimmed,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
        voiceReply: useVoiceReply,
      });
      onUpdateSession((prev) => ({
        ...prev,
        messages: prev.messages.filter(
          (m) => !(m.id === assistantMessageId && m.content.trim() === '')
        ),
      }));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStartVoiceRecording = async () => {
    if (isStreaming || isRecording || isTranscribing) return;
    setErrorMsg(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setErrorMsg('Microphone recording is not supported in this browser.');
      return;
    }

    try {
      stopCurrentAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      cancelRecordingFlagRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        setIsRecording(false);
        setRecordingSeconds(0);

        if (cancelRecordingFlagRef.current) {
          audioChunksRef.current = [];
          return;
        }

        const recordedType = recorder.mimeType || preferredType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedType });
        audioChunksRef.current = [];

        if (audioBlob.size < 256) {
          setErrorMsg('No audio detected. Hold or speak clearly into your microphone.');
          return;
        }

        setIsTranscribing(true);
        try {
          const base64 = await blobToBase64(audioBlob);
          const resp = await fetch('/api/tutor/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64,
              mimeType: recordedType,
            }),
          });
          const data = (await resp.json()) as { text?: string; error?: string };
          if (!resp.ok) {
            throw new Error(data.error || 'Unable to transcribe your voice recording.');
          }
          const spokenPrompt = (data.text ?? '').trim();
          if (!spokenPrompt) {
            setErrorMsg('No clear speech detected. Please try speaking again.');
            return;
          }
          await sendPrompt(spokenPrompt);
        } catch (err) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Unable to transcribe recorded voice.'
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMsg('Microphone permission was denied. Please allow microphone access to use voice.');
    }
  };

  const handleFinishVoiceRecording = () => {
    cancelRecordingFlagRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelVoiceRecording = () => {
    cancelRecordingFlagRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const handleSetStage = (stageId: AdaptiveStageId) => {
    onUpdateSession((prev) => ({
      ...prev,
      stageId,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSetMode = (teachingMode: TeachingMode) => {
    onUpdateSession((prev) => ({
      ...prev,
      teachingMode,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 1600);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleSaveAssistantMessage = (msg: ChatMessage) => {
    onSaveToNotebook({
      title: `${activeDiscipline.label}: ${session.title}`,
      category: session.disciplineId === 'mathematics' ? 'math' : 'lesson',
      contentMarkdown: msg.content,
    });
    setSavedMessageIds((prev) => ({ ...prev, [msg.id]: true }));
  };

  const hasSendableInput = Boolean(input.trim() || pendingImages.length > 0);

  const imagePreviewStrip = pendingImages.length > 0 && (
    <div className="flex flex-wrap items-center gap-2 pb-2">
      {pendingImages.map((img) => (
        <div
          key={img.id}
          className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
        >
          <img
            src={img.dataUrl}
            alt={img.name}
            className="w-16 h-16 object-cover block"
          />
          <button
            type="button"
            onClick={() =>
              setPendingImages((prev) => prev.filter((item) => item.id !== img.id))
            }
            aria-label={`Remove ${img.name}`}
            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 cursor-pointer"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );

  const voiceRecordingBanner = (isRecording || isTranscribing) && (
    <div className="mb-2 px-3 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/40 flex items-center justify-between gap-2">
      {isTranscribing ? (
        <div className="flex items-center gap-2 text-xs font-medium text-sky-900 dark:text-sky-100">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-700 dark:text-sky-400" aria-hidden="true" />
          <span>Transcribing your voice question...</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs font-medium text-sky-900 dark:text-sky-100">
            <Mic className="w-3.5 h-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span>Listening</span>
            <span className="font-mono tabular-nums text-sky-700 dark:text-sky-300">
              {formatDuration(recordingSeconds)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCancelVoiceRecording}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFinishVoiceRecording}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-sky-700 text-white hover:bg-sky-800 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Send Voice</span>
            </button>
          </div>
        </>
      )}
    </div>
  );

  const composerControlsBar = (
    <div className="flex items-end justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming || isRecording || pendingImages.length >= MAX_IMAGES_PER_MESSAGE}
          aria-label="Attach image"
          title="Insert picture or take photo"
          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap cursor-pointer"
        >
          <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Photo</span>
        </button>

        <button
          type="button"
          onClick={() => setVoiceReplyEnabled((prev) => !prev)}
          aria-pressed={voiceReplyEnabled}
          title="When on, AI replies with spoken voice instead of written text"
          className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
            voiceReplyEnabled
              ? 'border-sky-700 bg-sky-700 text-white dark:border-sky-500 dark:bg-sky-600'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Voice Reply</span>
        </button>

        <label htmlFor="inline-level-select" className="sr-only">
          Educational level
        </label>
        <select
          id="inline-level-select"
          value={session.levelId}
          onChange={(e) => onSelectLevel(e.target.value as EducationalLevelId)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-700 cursor-pointer"
        >
          {EDUCATIONAL_LEVELS.map((lvl) => (
            <option key={lvl.id} value={lvl.id}>
              {lvl.shortLabel}
            </option>
          ))}
        </select>

        <label htmlFor="inline-discipline-select" className="sr-only">
          Subject
        </label>
        <select
          id="inline-discipline-select"
          value={session.disciplineId}
          onChange={(e) => onSelectDiscipline(e.target.value as DisciplineId)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-700 cursor-pointer max-w-[115px] sm:max-w-[140px]"
        >
          {ACADEMIC_DISCIPLINES.map((disc) => (
            <option key={disc.id} value={disc.id}>
              {disc.label}
            </option>
          ))}
        </select>

        <div
          className="hidden sm:inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          role="group"
          aria-label="Response speed"
        >
          <button
            type="button"
            onClick={() => setResponseSpeed('fast')}
            className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
              responseSpeed === 'fast'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Fast
          </button>
          <button
            type="button"
            onClick={() => setResponseSpeed('deep')}
            className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
              responseSpeed === 'deep'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Deep
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleSetMode(session.teachingMode === 'direct' ? 'socratic' : 'direct')}
          className="hidden md:inline-flex px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          title="Switch between Direct Answer and Socratic Coaching"
        >
          {session.teachingMode === 'direct' ? 'Direct' : 'Socratic'}
        </button>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isStreaming && (
          <button
            type="button"
            onClick={isRecording ? handleFinishVoiceRecording : handleStartVoiceRecording}
            disabled={isTranscribing}
            aria-label={isRecording ? 'Stop and send voice recording' : 'Record voice question'}
            title={isRecording ? 'Send voice message' : 'Speak your question'}
            className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isRecording
                ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            } disabled:opacity-40`}
          >
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : isRecording ? (
              <Square className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Mic className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        )}

        {isStreaming ? (
          <button
            type="button"
            onClick={handleStopStreaming}
            aria-label="Stop generating response"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer shrink-0"
          >
            <Square className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!hasSendableInput || isRecording || isTranscribing}
            aria-label="Send question"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sky-700 text-white hover:bg-sky-800 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors cursor-pointer shrink-0"
          >
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(e) => {
        if (e.target.files && e.target.files.length > 0) {
          void addImageFiles(e.target.files);
        }
        e.target.value = '';
      }}
    />
  );

  // Centered ChatGPT / Claude Welcome View when conversation is empty
  if (session.messages.length === 0) {
    return (
      <div className="flex flex-col min-h-[calc(100dvh-6.2rem)] md:min-h-[calc(100dvh-3.5rem)] max-w-3xl mx-auto w-full px-4 py-6 sm:py-10 justify-center">
        {hiddenFileInput}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              BRUCENSENGIYUMVA AI · {activeLevel.label} · {activeDiscipline.label}
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
              What would you like to learn today?
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Type a question, insert a picture, or speak with your voice. Toggle Voice Reply anytime to hear spoken explanations.
            </p>
          </div>

          {/* Centered Prominent Composer Card */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendPrompt(input);
            }}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-xs focus-within:ring-2 focus-within:ring-sky-700"
          >
            {voiceRecordingBanner}
            {imagePreviewStrip}
            <label htmlFor="tutor-composer" className="sr-only">
              Ask a question, paste an image, or submit your reasoning
            </label>
            <textarea
              ref={textareaRef}
              id="tutor-composer"
              rows={2}
              value={input}
              enterKeyHint="send"
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendPrompt(input);
                }
              }}
              placeholder="Ask anything, paste/attach a picture, or tap the mic..."
              className="w-full resize-none bg-transparent px-1 py-1 text-base sm:text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            {composerControlsBar}
          </form>

          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 text-sm text-red-800 dark:text-red-200 flex items-center justify-between gap-3"
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="px-3 py-1 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 4 One-Tap Starter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUICK_STARTERS.map((starter) => (
              <button
                key={starter.title}
                type="button"
                onClick={() => {
                  onSelectDiscipline(starter.disciplineId);
                  void sendPrompt(starter.prompt, { disciplineOverride: starter.disciplineId });
                }}
                className="text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-600 dark:hover:border-sky-500 transition-colors cursor-pointer"
              >
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {starter.title}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {starter.prompt}
                </div>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onOpenMathLab}
              className="text-xs font-medium text-sky-700 dark:text-sky-400 hover:underline underline-offset-2 cursor-pointer"
            >
              Need structured Given / To Calculate / Verification steps? Open Math Solver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active ChatGPT / Claude Conversation View
  return (
    <div className="flex flex-col h-[calc(100dvh-6.2rem)] md:h-[calc(100dvh-3.5rem)] w-full">
      {hiddenFileInput}

      {/* Subtle Adaptive Stage Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 px-4 py-2 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            <span>{activeLevel.shortLabel}</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{activeDiscipline.label}</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              Stage {activeStage.step}: {activeStage.label}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowStagesPanel((prev) => !prev)}
            aria-expanded={showStagesPanel}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <span>Stages</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showStagesPanel ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {showStagesPanel && (
          <div
            className="max-w-3xl mx-auto mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1"
            role="group"
            aria-label="Adaptive learning stages"
          >
            {ADAPTIVE_STAGES.map((stage) => {
              const isActive = stage.id === session.stageId;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => handleSetStage(stage.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    isActive
                      ? 'bg-sky-700 text-white dark:bg-sky-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {stage.step}. {stage.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-3xl mx-auto space-y-6">
          {session.messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isLastAssistant = !isUser && idx === session.messages.length - 1;
            const isSaved = Boolean(savedMessageIds[msg.id]);
            const isCopied = copiedMessageId === msg.id;
            const isPlayingThis = playingMsgId === msg.id;
            const isSynthesizingThis = synthesizingMsgId === msg.id;
            const isTextVisible = !msg.voiceReply || Boolean(revealedTextIds[msg.id]);

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-xl rounded-2xl rounded-br-sm bg-sky-700 text-white px-4 py-2.5 text-[15px] leading-relaxed space-y-2">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.attachments.map((att) => (
                          <img
                            key={att.id}
                            src={att.dataUrl}
                            alt={att.name}
                            className="max-h-52 rounded-xl object-contain bg-sky-900/40 border border-white/20"
                          />
                        ))}
                      </div>
                    )}
                    {msg.content && (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              );
            }

            const isStillPreparingVoice =
              Boolean(msg.voiceReply) &&
              ((isLastAssistant && isStreaming) || isSynthesizingThis);

            return (
              <article key={msg.id} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    BRUCENSENGIYUMVA AI
                  </span>
                </div>

                {msg.voiceReply ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          disabled={isStillPreparingVoice || !msg.content}
                          onClick={() => void synthesizeAndPlay(msg.id, msg.content, false)}
                          aria-label={isPlayingThis ? 'Pause voice reply' : 'Play voice reply'}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-sky-700 text-white hover:bg-sky-800 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors cursor-pointer shrink-0"
                        >
                          {isStillPreparingVoice ? (
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          ) : isPlayingThis ? (
                            <Pause className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {isLastAssistant && isStreaming
                              ? 'Preparing voice explanation...'
                              : isSynthesizingThis
                              ? 'Generating spoken audio...'
                              : isPlayingThis
                              ? 'Speaking answer...'
                              : 'Voice reply ready'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {isPlayingThis
                              ? 'Tap pause anytime'
                              : 'Tap play to listen or show text'}
                          </div>
                        </div>
                      </div>

                      {msg.content && !(isLastAssistant && isStreaming) && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void synthesizeAndPlay(msg.id, msg.content, true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Replay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedTextIds((prev) => ({
                                ...prev,
                                [msg.id]: !prev[msg.id],
                              }))
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{isTextVisible ? 'Hide text' : 'Show text'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isTextVisible && msg.content && <MarkdownRenderer content={msg.content} />}
                  </div>
                ) : msg.content ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <div className="py-1.5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400" aria-label="Preparing explanation">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-700 dark:text-sky-400" aria-hidden="true" />
                    <span>Thinking...</span>
                  </div>
                )}

                {msg.content && !(isLastAssistant && isStreaming) && (
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    {!msg.voiceReply && (
                      <button
                        type="button"
                        disabled={isSynthesizingThis}
                        onClick={() => void synthesizeAndPlay(msg.id, msg.content, false)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSynthesizingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-700 dark:text-sky-400" aria-hidden="true" />
                            <span>Speaking...</span>
                          </>
                        ) : isPlayingThis ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" aria-hidden="true" />
                            <span className="text-sky-700 dark:text-sky-400">Pause</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleCopyMessage(msg)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {isLastAssistant && !isStreaming && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void sendPrompt(
                              'Please explain this more simply using an everyday analogy.',
                              {
                                nextStage: computeNextAdaptiveStage(session.stageId, 'explain_differently'),
                                actionDirective:
                                  'Switch teaching method. Explain in simpler everyday terms with a clear analogy.',
                              }
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Explain Simpler</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void sendPrompt(
                              'Give me one quick practice question to check my understanding.',
                              {
                                nextStage: computeNextAdaptiveStage(session.stageId, 'practice'),
                                actionDirective:
                                  'Give one focused practice problem tailored to the learner level and invite their answer.',
                              }
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Practice Quiz</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSaveAssistantMessage(msg)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          <span className="text-emerald-700 dark:text-emerald-400">Saved</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Save Note</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          {errorMsg && (
            <div
              role="alert"
              className="p-4 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 text-sm text-red-800 dark:text-red-200 flex flex-wrap items-center justify-between gap-3"
            >
              <span>{errorMsg}</span>
              <div className="flex items-center gap-2 shrink-0">
                {lastFailedRequest && (
                  <button
                    type="button"
                    onClick={() =>
                      void sendPrompt(lastFailedRequest.prompt, {
                        attachments: lastFailedRequest.attachments,
                        forceVoiceReply: lastFailedRequest.voiceReply,
                        skipUserEcho: true,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-700 text-white hover:bg-sky-800 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Retry</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Pinned Bottom Composer (Mobile Safe Area Friendly) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendPrompt(input);
        }}
        className="px-3 sm:px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-50 dark:bg-slate-950 shrink-0"
      >
        <div className="max-w-3xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 sm:p-3 shadow-xs focus-within:ring-2 focus-within:ring-sky-700">
          {voiceRecordingBanner}
          {imagePreviewStrip}
          <label htmlFor="tutor-composer" className="sr-only">
            Ask a follow-up question or attach an image
          </label>
          <textarea
            ref={textareaRef}
            id="tutor-composer"
            rows={1}
            value={input}
            enterKeyHint="send"
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendPrompt(input);
              }
            }}
            placeholder="Ask a follow-up, attach a photo, or tap the mic..."
            className="w-full resize-none bg-transparent px-1.5 py-1 text-base sm:text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          {composerControlsBar}
        </div>
      </form>
    </div>
  );
};
