import React, { useRef, useState } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ImagePlus,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  MATH_SUBFIELDS,
  SEED_MATH_SOLUTION,
  getLevelById,
} from '../lib/pedagogy';
import type {
  EducationalLevelId,
  ImageAttachment,
  MathSolution,
  PracticeEvaluation,
} from '../lib/pedagogy';
import { compressImageFile } from '../utils/media';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MathLabViewProps {
  levelId: EducationalLevelId;
  onRecordPracticeScore: (scorePercent: number, topic: string) => void;
  onSaveToNotebook: (params: {
    title: string;
    category: 'lesson' | 'math' | 'research';
    contentMarkdown: string;
  }) => void;
}

export const MathLabView: React.FC<MathLabViewProps> = ({
  levelId,
  onRecordPracticeScore,
  onSaveToNotebook,
}) => {
  const [selectedSubfield, setSelectedSubfield] = useState<string>('Calculus');
  const [problemInput, setProblemInput] = useState<string>(SEED_MATH_SOLUTION.problemStatement);
  const [attachedImage, setAttachedImage] = useState<ImageAttachment | null>(null);
  const [solution, setSolution] = useState<MathSolution>(SEED_MATH_SOLUTION);
  const [isSolving, setIsSolving] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);

  const [showHint, setShowHint] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<PracticeEvaluation | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [savedSolutionId, setSavedSolutionId] = useState<string | null>(null);
  const [mathImgFailed, setMathImgFailed] = useState(false);

  const mathFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeLevel = getLevelById(levelId);

  const handleLoadSubfieldSample = (subfieldId: string) => {
    setSelectedSubfield(subfieldId);
    const match = MATH_SUBFIELDS.find((s) => s.id === subfieldId);
    if (match) {
      setProblemInput(match.sampleProblem);
    }
  };

  const handleAttachPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSolveError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    try {
      setSolveError(null);
      const compressed = await compressImageFile(file);
      setAttachedImage(compressed);
    } catch (err) {
      setSolveError(err instanceof Error ? err.message : 'Unable to attach photo.');
    }
  };

  const handleSolveProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!problemInput.trim() && !attachedImage) || isSolving) return;

    setIsSolving(true);
    setSolveError(null);
    setEvaluation(null);
    setPracticeAnswer('');
    setShowHint(false);

    try {
      const response = await fetch('/api/tutor/math-solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemStatement: problemInput.trim(),
          imageDataUrl: attachedImage?.dataUrl,
          subfield: selectedSubfield,
          levelId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to solve mathematics problem.');
      }
      setSolution(data as MathSolution);
    } catch (err) {
      setSolveError(err instanceof Error ? err.message : 'Unexpected error solving problem.');
    } finally {
      setIsSolving(false);
    }
  };

  const handleEvaluatePractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceAnswer.trim() || isEvaluating) return;

    setIsEvaluating(true);
    setEvalError(null);

    try {
      const response = await fetch('/api/tutor/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionPrompt: solution.practiceQuestion.prompt,
          expectedConcept: solution.practiceQuestion.expectedConcept,
          learnerAnswer: practiceAnswer.trim(),
          levelId,
          disciplineId: 'mathematics',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to evaluate attempt.');
      }
      const evalResult = data as PracticeEvaluation;
      setEvaluation(evalResult);
      onRecordPracticeScore(evalResult.scorePercent, solution.subfield);
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Unable to check reasoning.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveMathSolution = () => {
    const md = [
      `**Problem:** ${solution.problemStatement}`,
      '',
      '### 01. Given Information',
      ...solution.given.map((g) => `- ${g}`),
      '',
      '### 02. What Needs to Be Calculated',
      solution.toCalculate,
      '',
      '### 03. Step-by-Step Derivation',
      ...solution.steps.map(
        (s) =>
          `**Step ${s.stepNumber}: ${s.title}**\n\n${s.explanation}\n\n${s.mathExpression}`
      ),
      '',
      `### 04. Final Answer\n\n${solution.finalAnswer}`,
      '',
      `### 05. Verification\n\n${solution.verificationCheck}`,
    ].join('\n\n');

    onSaveToNotebook({
      title: `${solution.subfield}: ${solution.problemStatement.slice(0, 48)}`,
      category: 'math',
      contentMarkdown: md,
    });
    setSavedSolutionId(solution.id);
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6">
      {/* Header Split with Scientific Drafting Visual */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>Mathematics Expert Studio</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{activeLevel.label}</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>16 Subfields</span>
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
              Structured Mathematical Problem Solving
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Type a problem or insert a photo of a handwritten or textbook equation. Every solution is broken into Given, What Needs to Be Calculated, Step-by-Step Derivation, and Verification.
            </p>
          </div>

          <form onSubmit={handleSolveProblem} className="mt-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="math-subfield-select"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Mathematics Subfield
                </label>
                <select
                  id="math-subfield-select"
                  value={selectedSubfield}
                  onChange={(e) => handleLoadSubfieldSample(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-700"
                >
                  {MATH_SUBFIELDS.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-end gap-2">
                <input
                  ref={mathFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAttachPhoto(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => mathFileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4" aria-hidden="true" />
                  <span>Insert Photo</span>
                </button>
                <button
                  type="submit"
                  disabled={isSolving || (!problemInput.trim() && !attachedImage)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors cursor-pointer"
                >
                  {isSolving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Deriving Solution...</span>
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" aria-hidden="true" />
                      <span>Solve Step-by-Step</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {attachedImage && (
              <div className="inline-flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
                <img
                  src={attachedImage.dataUrl}
                  alt={attachedImage.name}
                  className="w-14 h-14 rounded-md object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="min-w-0 pr-1">
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                    {attachedImage.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ready to analyze
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  aria-label="Remove attached math image"
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            <div>
              <label
                htmlFor="math-problem-textarea"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Problem Statement (or paste an image)
              </label>
              <textarea
                id="math-problem-textarea"
                rows={3}
                value={problemInput}
                onChange={(e) => setProblemInput(e.target.value)}
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  for (const item of Array.from(items)) {
                    if (item.type.startsWith('image/')) {
                      const file = item.getAsFile();
                      if (file) {
                        e.preventDefault();
                        void handleAttachPhoto(file);
                        break;
                      }
                    }
                  }
                }}
                placeholder="Enter an equation, proof, word problem, or insert/paste a photo of a math problem..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-700"
              />
            </div>

            {solveError && (
              <div role="alert" className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
                {solveError}
              </div>
            )}
          </form>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 min-h-[200px]">
          {!mathImgFailed ? (
            <img
              src="/src/assets/images/math_geometry_visual_1795010520345.jpg"
              alt="Coordinate axes, tangent lines, and polyhedral geometry schematic"
              referrerPolicy="no-referrer"
              onError={() => setMathImgFailed(true)}
              className="w-full h-full lg:h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-100 dark:bg-slate-900">
              <Calculator className="w-8 h-8 text-sky-700 dark:text-sky-400 mb-2" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Mathematical Analysis
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Structured Solution Display */}
      <section aria-labelledby="worked-solution-heading" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {solution.subfield} · Worked Breakdown
            </div>
            <h2 id="worked-solution-heading" className="mt-0.5 font-display text-xl font-semibold text-slate-900 dark:text-slate-50">
              {solution.problemStatement}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleSaveMathSolution}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            {savedSolutionId === solution.id ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-700 dark:text-emerald-400">Saved to Notebook</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4" aria-hidden="true" />
                <span>Save Solution</span>
              </>
            )}
          </button>
        </div>

        {/* 01. Given Information & 02. What Needs to Be Calculated */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
            <div className="font-mono text-xs text-sky-700 dark:text-sky-400">01. Given Information</div>
            <ul className="mt-2.5 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {solution.given.map((item, i) => (
                <li key={i}>
                  <MarkdownRenderer content={item} />
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
            <div className="font-mono text-xs text-sky-700 dark:text-sky-400">02. What Needs to Be Calculated</div>
            <div className="mt-2.5 text-sm text-slate-700 dark:text-slate-300">
              <MarkdownRenderer content={solution.toCalculate} />
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Core Principle
              </div>
              <MarkdownRenderer content={solution.conceptSummary} className="text-xs text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </div>

        {/* 03. Step-by-Step Derivation */}
        <div className="space-y-3">
          <div className="font-mono text-xs text-sky-700 dark:text-sky-400">03. Step-by-Step Derivation</div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
            {solution.steps.map((step) => (
              <div key={step.stepNumber} className="p-4 sm:p-5">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-xs font-medium text-sky-700 dark:text-sky-400 tabular-nums">
                    Step {step.stepNumber}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {step.title}
                  </h3>
                </div>
                <div className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <MarkdownRenderer content={step.explanation} />
                </div>
                {step.mathExpression && (
                  <div className="mt-2">
                    <MarkdownRenderer content={step.mathExpression} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 04. Final Answer & Verification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30">
            <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>04. Final Answer</span>
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              <MarkdownRenderer content={solution.finalAnswer} />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
            <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
              05. Independent Verification
            </div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              <MarkdownRenderer content={solution.verificationCheck} />
            </div>
          </div>
        </div>

        {/* 06. Interactive Practice Check */}
        <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-700 dark:text-sky-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Practice Check — Verify Your Understanding
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowHint((prev) => !prev)}
              aria-expanded={showHint}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
              {showHint ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="text-sm text-slate-700 dark:text-slate-200">
            <MarkdownRenderer content={solution.practiceQuestion.prompt} />
          </div>

          {showHint && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
              <MarkdownRenderer content={`**Hint:** ${solution.practiceQuestion.hint}`} />
            </div>
          )}

          <form onSubmit={handleEvaluatePractice} className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="practice-attempt-input" className="sr-only">
              Enter your practice solution
            </label>
            <input
              id="practice-attempt-input"
              type="text"
              value={practiceAnswer}
              onChange={(e) => setPracticeAnswer(e.target.value)}
              placeholder="Write your answer and brief reasoning (e.g., critical point at x = 1, local min (1, 2))..."
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-700"
            />
            <button
              type="submit"
              disabled={isEvaluating || !practiceAnswer.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors cursor-pointer shrink-0"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <span>Check My Reasoning</span>
              )}
            </button>
          </form>

          {evalError && (
            <div role="alert" className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {evalError}
            </div>
          )}

          {evaluation && (
            <div
              className={`p-4 rounded-lg border space-y-2 ${
                evaluation.isCorrect
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30'
                  : 'border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {evaluation.isCorrect ? 'Mastery Confirmed' : 'Targeted Improvement Feedback'}
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  Score: {evaluation.scorePercent}% · Stage: {evaluation.recommendedStage.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {evaluation.feedback}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong>Concept Check:</strong> {evaluation.misconceptionCheck}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong>Next Step:</strong> {evaluation.nextStepRecommendation}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
