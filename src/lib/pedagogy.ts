export type EducationalLevelId =
  | 'primary'
  | 'secondary'
  | 'high_school'
  | 'college_tech'
  | 'university'
  | 'postgraduate'
  | 'professional'
  | 'lifelong';

export type AdaptiveStageId =
  | 'assess'
  | 'introduce'
  | 'teach'
  | 'demonstrate'
  | 'practice'
  | 'evaluate'
  | 'improve'
  | 'master';

export type DisciplineId =
  | 'mathematics'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'computer_science'
  | 'engineering'
  | 'economics'
  | 'humanities';

export type TeachingMode = 'socratic' | 'direct';

export type WorkspaceTab = 'tutor' | 'math_lab' | 'research' | 'notebook';

export interface EducationalLevel {
  id: EducationalLevelId;
  label: string;
  shortLabel: string;
  audienceDescription: string;
  pedagogicalGuidance: string;
}

export interface AdaptiveStage {
  id: AdaptiveStageId;
  step: number;
  label: string;
  summary: string;
  promptDirective: string;
}

export interface Discipline {
  id: DisciplineId;
  label: string;
  focusAreas: string[];
  starterPrompt: string;
}

export interface MathSubfield {
  id: string;
  label: string;
  sampleProblem: string;
}

export interface ImageAttachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: ImageAttachment[];
  voiceReply?: boolean;
  timestamp: string;
  stageAtReply?: AdaptiveStageId;
  modeUsed?: TeachingMode;
}

export interface StudySession {
  id: string;
  title: string;
  levelId: EducationalLevelId;
  disciplineId: DisciplineId;
  stageId: AdaptiveStageId;
  teachingMode: TeachingMode;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface MathSolutionStep {
  stepNumber: number;
  title: string;
  explanation: string;
  mathExpression: string;
}

export interface MathSolution {
  id: string;
  subfield: string;
  problemStatement: string;
  given: string[];
  toCalculate: string;
  conceptSummary: string;
  steps: MathSolutionStep[];
  finalAnswer: string;
  verificationCheck: string;
  practiceQuestion: {
    prompt: string;
    hint: string;
    expectedConcept: string;
  };
}

export interface PracticeEvaluation {
  isCorrect: boolean;
  scorePercent: number;
  feedback: string;
  misconceptionCheck: string;
  nextStepRecommendation: string;
  recommendedStage: AdaptiveStageId;
}

export interface ResearchCitation {
  title: string;
  uri: string;
}

export interface ResearchBrief {
  id: string;
  query: string;
  depth: 'overview' | 'deep';
  summaryMarkdown: string;
  citations: ResearchCitation[];
  followUpQuestions: string[];
  createdAt: string;
}

export interface NotebookEntry {
  id: string;
  title: string;
  category: 'lesson' | 'math' | 'research';
  disciplineId: DisciplineId;
  levelId: EducationalLevelId;
  contentMarkdown: string;
  createdAt: string;
}

export interface LearnerStats {
  completedPracticeCount: number;
  scoreHistory: number[];
  masteredTopics: string[];
}

export const EDUCATIONAL_LEVELS: EducationalLevel[] = [
  {
    id: 'primary',
    label: 'Primary School',
    shortLabel: 'Primary',
    audienceDescription: 'Foundational literacy, arithmetic, and curiosity-driven discovery.',
    pedagogicalGuidance:
      'Use warm, simple, concrete everyday language, relatable physical analogies, and short encouraging steps without intimidating jargon.',
  },
  {
    id: 'secondary',
    label: 'Secondary School',
    shortLabel: 'Secondary',
    audienceDescription: 'Core algebra, introductory sciences, structured reasoning, and study habits.',
    pedagogicalGuidance:
      'Use clear step-by-step scaffolding, visual analogies, worked examples, and gentle comprehension checks.',
  },
  {
    id: 'high_school',
    label: 'High School',
    shortLabel: 'High School',
    audienceDescription: 'Pre-calculus, calculus, laboratory sciences, programming, and exam readiness.',
    pedagogicalGuidance:
      'Connect intuitive concepts to formal notation, equations, and structured problem-solving strategies.',
  },
  {
    id: 'college_tech',
    label: 'Colleges & Technical',
    shortLabel: 'Technical',
    audienceDescription: 'Applied mathematics, engineering trades, software systems, and practical mastery.',
    pedagogicalGuidance:
      'Emphasize real-world engineering applications, units, diagnostics, and hands-on computational execution.',
  },
  {
    id: 'university',
    label: 'University Undergraduate',
    shortLabel: 'University',
    audienceDescription: 'Rigorous theory, proofs, differential equations, research methods, and algorithms.',
    pedagogicalGuidance:
      'Provide formal mathematical rigor, explicit theorems, edge cases, and structured analytical synthesis.',
  },
  {
    id: 'postgraduate',
    label: 'Postgraduate Research',
    shortLabel: 'Postgraduate',
    audienceDescription: 'Advanced research design, graduate-level proofs, synthesis, and critical inquiry.',
    pedagogicalGuidance:
      'Engage at peer-scholarly depth, probing assumptions, methodology trade-offs, and primary-literature rigor.',
  },
  {
    id: 'professional',
    label: 'Professional Education',
    shortLabel: 'Professional',
    audienceDescription: 'Applied quantitative finance, systems architecture, data science, and upskilling.',
    pedagogicalGuidance:
      'Focus on decision-ready precision, industry best practices, efficiency, and verifiable workflows.',
  },
  {
    id: 'lifelong',
    label: 'Independent & Lifelong',
    shortLabel: 'Lifelong',
    audienceDescription: 'Self-paced interdisciplinary exploration and practical capability building.',
    pedagogicalGuidance:
      'Balance clarity with intellectual depth, connecting ideas across disciplines and encouraging curiosity.',
  },
];

export const ADAPTIVE_STAGES: AdaptiveStage[] = [
  {
    id: 'assess',
    step: 1,
    label: 'Assess',
    summary: 'Identify existing knowledge, level, and exact learning goal.',
    promptDirective:
      'Start by clarifying what the learner already knows and pinpointing the core question before diving deep.',
  },
  {
    id: 'introduce',
    step: 2,
    label: 'Introduce',
    summary: 'Frame the topic, intuition, and real-world significance.',
    promptDirective:
      'Introduce why this concept matters and establish a clear mental model before introducing heavy notation.',
  },
  {
    id: 'teach',
    step: 3,
    label: 'Teach',
    summary: 'Present principles progressively in digestible steps.',
    promptDirective:
      'Break the topic into clear, progressive lessons adapted to the learner level, using analogies and concrete examples.',
  },
  {
    id: 'demonstrate',
    step: 4,
    label: 'Demonstrate',
    summary: 'Work through examples, formulas, and practical applications.',
    promptDirective:
      'Walk through a complete worked demonstration showing every transformation and explaining why each step holds.',
  },
  {
    id: 'practice',
    step: 5,
    label: 'Practice',
    summary: 'Provide targeted exercises for active independent solving.',
    promptDirective:
      'Offer a focused practice exercise matched to the learner level and invite the learner to attempt it first.',
  },
  {
    id: 'evaluate',
    step: 6,
    label: 'Evaluate',
    summary: 'Check reasoning, accuracy, and conceptual grasp.',
    promptDirective:
      'Evaluate the learner response constructively, highlighting what worked well and checking reasoning.',
  },
  {
    id: 'improve',
    step: 7,
    label: 'Improve',
    summary: 'Address misconceptions using an alternative teaching method.',
    promptDirective:
      'If a misunderstanding appears, switch teaching approach (analogy, diagram, or simpler counter-example) instead of repeating the same words.',
  },
  {
    id: 'master',
    step: 8,
    label: 'Master',
    summary: 'Confirm durable capability with synthesis and next horizons.',
    promptDirective:
      'Confirm mastery with a synthesis check or extension challenge that transfers the knowledge to a new context.',
  },
];

export const ACADEMIC_DISCIPLINES: Discipline[] = [
  {
    id: 'mathematics',
    label: 'Mathematics',
    focusAreas: ['Calculus', 'Linear Algebra', 'Differential Equations', 'Probability & Logic'],
    starterPrompt:
      'Teach me the intuition and step-by-step rule behind the derivative of f(x) = x^3 * sin(x), then give me a short check problem.',
  },
  {
    id: 'physics',
    label: 'Physics & Astronomy',
    focusAreas: ['Mechanics', 'Electromagnetism', 'Thermodynamics', 'Quantum Foundations'],
    starterPrompt:
      'Why does conservation of angular momentum explain why an ice skater spins faster when pulling their arms inward?',
  },
  {
    id: 'chemistry',
    label: 'Chemistry',
    focusAreas: ['Stoichiometry', 'Equilibrium', 'Thermochemistry', 'Organic Mechanisms'],
    starterPrompt:
      'Explain Le Chatelier’s Principle using a real industrial reaction like the Haber process, and walk through shifting equilibrium.',
  },
  {
    id: 'biology',
    label: 'Biology & Medicine',
    focusAreas: ['Cellular Respiration', 'Genetics', 'Physiology', 'Ecology'],
    starterPrompt:
      'Break down how the Bohr effect shifts hemoglobin oxygen affinity during intense exercise.',
  },
  {
    id: 'computer_science',
    label: 'Computer Science',
    focusAreas: ['Algorithms', 'Data Structures', 'TypeScript & Python', 'Systems Design'],
    starterPrompt:
      'Teach me how Dijkstra’s shortest-path algorithm works step by step with a small 4-node graph example.',
  },
  {
    id: 'engineering',
    label: 'Engineering & Modelling',
    focusAreas: ['Control Systems', 'Signals', 'Statics & Dynamics', 'Mathematical Modelling'],
    starterPrompt:
      'How do we model a damped harmonic oscillator with a second-order differential equation?',
  },
  {
    id: 'economics',
    label: 'Economics & Finance',
    focusAreas: ['Microeconomics', 'Macroeconomics', 'Compound Interest', 'Risk Modelling'],
    starterPrompt:
      'Compare discrete compounding vs continuous compounding mathematically and show when each matters in finance.',
  },
  {
    id: 'humanities',
    label: 'Research & Humanities',
    focusAreas: ['Critical Reasoning', 'Academic Writing', 'Historiography', 'Methodology'],
    starterPrompt:
      'How do I structure a rigorous thesis statement and literature synthesis for a university research paper?',
  },
];

export const MATH_SUBFIELDS: MathSubfield[] = [
  {
    id: 'Arithmetic',
    label: 'Arithmetic',
    sampleProblem:
      'A school library budgets $480 for textbooks. If each mathematics book costs $24 and each science workbook costs $16, and the librarian buys 12 mathematics books, how many science workbooks can be purchased with the remaining budget?',
  },
  {
    id: 'Algebra',
    label: 'Algebra',
    sampleProblem: 'Solve the quadratic equation 2x^2 - 7x + 3 = 0 and verify both roots by substitution.',
  },
  {
    id: 'Geometry',
    label: 'Geometry',
    sampleProblem:
      'A right circular cylinder has radius r = 5 cm and total surface area 150*pi cm^2. Find its height h and volume V.',
  },
  {
    id: 'Trigonometry',
    label: 'Trigonometry',
    sampleProblem:
      'Prove the identity (1 - cos(2*theta)) / sin(2*theta) = tan(theta) and solve for theta in [0, pi) when tan(theta) = sqrt(3).',
  },
  {
    id: 'Calculus',
    label: 'Calculus',
    sampleProblem:
      'Find the critical points and classify the local extrema of f(x) = x^3 - 6x^2 + 9x + 2 using the first and second derivative tests.',
  },
  {
    id: 'Differential Equations',
    label: 'Differential Equations',
    sampleProblem: 'Solve the initial value problem dy/dx + 2y = 6e^x with y(0) = 3.',
  },
  {
    id: 'Integral Calculus',
    label: 'Integral Calculus',
    sampleProblem: 'Evaluate the definite integral of x * e^(2x) from x = 0 to x = 1 using integration by parts.',
  },
  {
    id: 'Linear Algebra',
    label: 'Linear Algebra',
    sampleProblem: 'Find the eigenvalues and eigenvectors of the 2x2 matrix A = [[4, 1], [2, 3]].',
  },
  {
    id: 'Statistics',
    label: 'Statistics',
    sampleProblem:
      'For the sample measurements [12, 15, 18, 20, 25], compute the sample mean, sample variance, and sample standard deviation.',
  },
  {
    id: 'Probability',
    label: 'Probability',
    sampleProblem:
      'A diagnostic test has 95% sensitivity and 90% specificity for a condition affecting 2% of a population. Compute P(Condition | Positive Test) using Bayes’ theorem.',
  },
  {
    id: 'Discrete Mathematics',
    label: 'Discrete Mathematics',
    sampleProblem:
      'Prove by mathematical induction that for every integer n >= 1, the sum 1 + 2 + ... + n equals n(n + 1)/2.',
  },
  {
    id: 'Mathematical Logic',
    label: 'Mathematical Logic',
    sampleProblem:
      'Construct a truth table and prove the logical equivalence between P -> Q and its contrapositive ~Q -> ~P.',
  },
  {
    id: 'Number Theory',
    label: 'Number Theory',
    sampleProblem: 'Use the Euclidean algorithm to compute gcd(252, 105) and express it as a linear combination of 252 and 105.',
  },
  {
    id: 'Financial Mathematics',
    label: 'Financial Mathematics',
    sampleProblem:
      'An investment of $5,000 earns 6% annual interest compounded monthly. How much is it worth after 8 years?',
  },
  {
    id: 'Mathematical Modelling',
    label: 'Mathematical Modelling',
    sampleProblem:
      'A bacterial culture grows logistically with carrying capacity K = 10,000, initial population P(0) = 500, and growth rate r = 0.4/hr. Find P(t) at t = 5 hours.',
  },
  {
    id: 'Complex Problem Solving',
    label: 'Complex Problem Solving',
    sampleProblem:
      'A rectangular garden is bordered on one side by a stone wall and enclosed on the remaining three sides by 120 meters of fencing. What dimensions maximize the enclosed area?',
  },
];

export const SEED_MATH_SOLUTION: MathSolution = {
  id: 'seed-calculus-extrema',
  subfield: 'Calculus',
  problemStatement:
    'Find the critical points and classify the local extrema of f(x) = x^3 - 6x^2 + 9x + 2 using the first and second derivative tests.',
  given: [
    'Polynomial function: $f(x) = x^3 - 6x^2 + 9x + 2$',
    'Domain: All real numbers $x \\in \\mathbb{R}$ (smooth and twice differentiable everywhere)',
  ],
  toCalculate:
    'All critical points $x_c$ where $f\'(x_c) = 0$, their corresponding function values $f(x_c)$, and whether each is a local maximum, local minimum, or saddle point.',
  conceptSummary:
    'Critical points occur where the tangent slope vanishes ($f\'(x) = 0$). The sign of the second derivative $f\'\'(x_c)$ determines local concavity: concave down ($f\'\' < 0$) indicates a local maximum, while concave up ($f\'\' > 0$) indicates a local minimum.',
  steps: [
    {
      stepNumber: 1,
      title: 'Compute the first derivative',
      explanation: 'Apply the power rule term-by-term to obtain the rate-of-change function.',
      mathExpression: "$$f'(x) = 3x^2 - 12x + 9$$",
    },
    {
      stepNumber: 2,
      title: 'Solve f\'(x) = 0 for critical points',
      explanation: 'Factor out the common coefficient 3, then factor the quadratic expression.',
      mathExpression: "$$3(x^2 - 4x + 3) = 3(x - 1)(x - 3) = 0 \\implies x = 1 \\text{ or } x = 3$$",
    },
    {
      stepNumber: 3,
      title: 'Evaluate concavity with the second derivative',
      explanation: 'Differentiate $f\'(x)$ to obtain $f\'\'(x)$ and test both critical points.',
      mathExpression: "$$f''(x) = 6x - 12 \\quad\\Rightarrow\\quad f''(1) = -6 < 0,\\; f''(3) = +6 > 0$$",
    },
    {
      stepNumber: 4,
      title: 'Calculate output coordinates',
      explanation: 'Substitute $x = 1$ and $x = 3$ back into the original function $f(x)$.',
      mathExpression: "$$f(1) = 1 - 6 + 9 + 2 = 6,\\quad f(3) = 27 - 54 + 27 + 2 = 2$$",
    },
  ],
  finalAnswer: 'Local maximum at $(1, 6)$ and local minimum at $(3, 2)$.',
  verificationCheck:
    'Check slope sign across intervals: for $x = 0$, $f\'(0) = 9 > 0$ (increasing); for $x = 2$, $f\'(2) = -3 < 0$ (decreasing); for $x = 4$, $f\'(4) = 9 > 0$ (increasing). Sign transitions confirm $(1, 6)$ is a peak and $(3, 2)$ is a valley.',
  practiceQuestion: {
    prompt:
      'Apply the same procedure to $g(x) = x^3 - 3x + 4$. What are the coordinates of the local minimum?',
    hint: 'Find $g\'(x) = 3x^2 - 3 = 0$, then check the sign of $g\'\'(x) = 6x$ at each root.',
    expectedConcept: 'At x = 1, g\'\'(1) = 6 > 0 so (1, 2) is a local minimum.',
  },
};

export function getLevelById(levelId: EducationalLevelId): EducationalLevel {
  return EDUCATIONAL_LEVELS.find((l) => l.id === levelId) ?? EDUCATIONAL_LEVELS[2];
}

export function getStageById(stageId: AdaptiveStageId): AdaptiveStage {
  return ADAPTIVE_STAGES.find((s) => s.id === stageId) ?? ADAPTIVE_STAGES[0];
}

export function getDisciplineById(disciplineId: DisciplineId): Discipline {
  return ACADEMIC_DISCIPLINES.find((d) => d.id === disciplineId) ?? ACADEMIC_DISCIPLINES[0];
}

export function computeNextAdaptiveStage(
  currentStage: AdaptiveStageId,
  action: 'advance' | 'practice' | 'explain_differently' | 'evaluated',
  scorePercent?: number
): AdaptiveStageId {
  if (action === 'practice') {
    return 'practice';
  }
  if (action === 'explain_differently') {
    return 'improve';
  }
  if (action === 'evaluated') {
    if (typeof scorePercent === 'number') {
      if (scorePercent >= 85) return 'master';
      if (scorePercent >= 65) return 'evaluate';
      return 'improve';
    }
    return 'evaluate';
  }

  const idx = ADAPTIVE_STAGES.findIndex((s) => s.id === currentStage);
  if (idx === -1 || idx >= ADAPTIVE_STAGES.length - 1) {
    return 'master';
  }
  return ADAPTIVE_STAGES[idx + 1].id;
}

export function calculateMasterySummary(
  sessions: StudySession[],
  notebookEntries: NotebookEntry[],
  stats: LearnerStats
): {
  totalSessions: number;
  totalTurns: number;
  savedNotesCount: number;
  averagePracticeScore: number;
  masteryIndex: number;
} {
  const totalSessions = sessions.length;
  const totalTurns = sessions.reduce(
    (sum, s) => sum + s.messages.filter((m) => m.role === 'assistant').length,
    0
  );
  const savedNotesCount = notebookEntries.length;
  const averagePracticeScore =
    stats.scoreHistory.length > 0
      ? Math.round(stats.scoreHistory.reduce((a, b) => a + b, 0) / stats.scoreHistory.length)
      : 0;

  const stageProgressScore =
    sessions.length > 0
      ? Math.round(
          (sessions.reduce((acc, s) => acc + getStageById(s.stageId).step, 0) /
            (sessions.length * ADAPTIVE_STAGES.length)) *
            50
        )
      : 0;

  const practiceContribution = Math.round(averagePracticeScore * 0.5);
  const masteryIndex = Math.min(100, stageProgressScore + practiceContribution);

  return {
    totalSessions,
    totalTurns,
    savedNotesCount,
    averagePracticeScore,
    masteryIndex,
  };
}

export function buildMasterSystemInstruction(params: {
  levelId: EducationalLevelId;
  disciplineId: DisciplineId;
  stageId: AdaptiveStageId;
  teachingMode: TeachingMode;
}): string {
  const level = getLevelById(params.levelId);
  const discipline = getDisciplineById(params.disciplineId);
  const stage = getStageById(params.stageId);

  const modeInstruction =
    params.teachingMode === 'socratic'
      ? 'Socratic Guided Mode: Do not simply hand over final answers immediately when the learner is working through a problem. Guide them through intuition, ask 1 focused diagnostic or next-step question when helpful, and build independent reasoning.'
      : 'Direct Structured Lesson Mode: Deliver a crystal-clear, comprehensive structured lesson with worked examples, formulas, and a brief closing check question to verify understanding.';

  const mathProtocol =
    params.disciplineId === 'mathematics'
      ? `
MATHEMATICS PROTOCOL:
For mathematical questions, explicitly structure your explanation:
1. **Given Information**: List all given quantities, equations, and constraints.
2. **What Needs to Be Calculated**: State clearly what is being solved or proved.
3. **Step-by-Step Solution**: Show clear logical transformations using LaTeX ($...$ inline, $$...$$ block).
4. **Verification & Insight**: Verify the result by substitution, units, or boundary check, and highlight the core principle.`
      : '';

  return `You are BRUCENSENGIYUMVA AI, an advanced educational artificial intelligence system developed by BRUCE DIGITAL 360.

IDENTITY & PURPOSE:
You function as an intelligent personal teacher, academic researcher, educational assistant, mathematics expert, scientific tutor, programming assistant, problem solver, research engine, and lifelong learning companion. Your ultimate responsibility is to transform information into understanding, understanding into knowledge, and knowledge into practical capability.

FIVE CORE EDUCATIONAL PRINCIPLES:
1. Understanding first: Help learners understand how and why answers are obtained rather than merely giving bare answers.
2. Accuracy and reliability: Prioritize correct information, verified calculations, logical reasoning, and trustworthy academic concepts.
3. Independent thinking: Develop critical analysis, investigation, and self-reliance.
4. Academic excellence: Support high-quality, rigorous work.
5. Efficiency: Respect the learner's time without sacrificing understanding or accuracy.

TEACHER BEHAVIOR:
- Behave like an experienced, patient, intelligent, supportive human teacher. Never humiliate or discourage a learner.
- Explain complicated concepts in clear language, break difficult subjects into smaller lessons, use practical examples and analogies, and offer exercises or feedback.
- If a learner struggles, change teaching method (analogy, concrete numerical example, or alternative perspective) rather than repeating the same explanation.

CURRENT LEARNER CONTEXT:
- Educational Level: ${level.label} — ${level.pedagogicalGuidance}
- Subject Discipline: ${discipline.label} (${discipline.focusAreas.join(', ')})
- Current Adaptive Learning Stage: Stage ${stage.step} of 8 (${stage.label.toUpperCase()}) — ${stage.promptDirective}
- Teaching Mode: ${modeInstruction}
${mathProtocol}

FORMATTING:
Use clean Markdown headings, bullet lists where helpful, syntax-tagged code blocks for programming, and LaTeX ($...$ or $$...$$) for mathematical notation.`;
}

export function formatNotebookMarkdown(entries: NotebookEntry[]): string {
  if (entries.length === 0) {
    return '# BRUCENSENGIYUMVA AI — Study Notebook\n\nNo saved notes yet.\n';
  }

  const header = [
    '# BRUCENSENGIYUMVA AI — Study Notebook',
    'Developed by BRUCE DIGITAL 360',
    `Exported: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '---',
    '',
  ].join('\n');

  const body = entries
    .map((entry) => {
      const level = getLevelById(entry.levelId).label;
      const discipline = getDisciplineById(entry.disciplineId).label;
      return [
        `## ${entry.title}`,
        `Category: ${entry.category} | Discipline: ${discipline} | Level: ${level} | Saved: ${entry.createdAt.slice(0, 10)}`,
        '',
        entry.contentMarkdown.trim(),
        '',
        '---',
        '',
      ].join('\n');
    })
    .join('\n');

  return header + body;
}

export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

export function prepareTextForSpeech(markdown: string, maxChars = 1800): string {
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, ' Code example omitted. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\\times/g, ' times ')
    .replace(/\\cdot/g, ' times ')
    .replace(/\\implies/g, ' implies ')
    .replace(/\\approx/g, ' approximately ')
    .replace(/\\neq/g, ' not equal to ')
    .replace(/\\leq/g, ' less than or equal to ')
    .replace(/\\geq/g, ' greater than or equal to ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= maxChars) {
    return cleaned;
  }
  const sliced = cleaned.slice(0, maxChars);
  const lastPeriod = sliced.lastIndexOf('.');
  return lastPeriod > maxChars * 0.5 ? sliced.slice(0, lastPeriod + 1) : `${sliced}...`;
}

export function createInitialSession(
  levelId: EducationalLevelId = 'high_school',
  disciplineId: DisciplineId = 'mathematics'
): StudySession {
  const discipline = getDisciplineById(disciplineId);
  return {
    id: `session-${Date.now()}`,
    title: `${discipline.label} Chat`,
    levelId,
    disciplineId,
    stageId: 'teach',
    teachingMode: 'direct',
    messages: [],
    updatedAt: new Date().toISOString(),
  };
}
