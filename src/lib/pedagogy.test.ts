import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADAPTIVE_STAGES,
  EDUCATIONAL_LEVELS,
  MATH_SUBFIELDS,
  SEED_MATH_SOLUTION,
  buildMasterSystemInstruction,
  calculateMasterySummary,
  computeNextAdaptiveStage,
  createInitialSession,
  formatNotebookMarkdown,
  parseDataUrl,
  prepareTextForSpeech,
} from './pedagogy';

test('adaptive stage transitions advance sequentially and handle evaluation outcomes', () => {
  assert.equal(computeNextAdaptiveStage('assess', 'advance'), 'introduce');
  assert.equal(computeNextAdaptiveStage('demonstrate', 'advance'), 'practice');
  assert.equal(computeNextAdaptiveStage('master', 'advance'), 'master');

  assert.equal(computeNextAdaptiveStage('teach', 'practice'), 'practice');
  assert.equal(computeNextAdaptiveStage('evaluate', 'explain_differently'), 'improve');

  assert.equal(computeNextAdaptiveStage('practice', 'evaluated', 90), 'master');
  assert.equal(computeNextAdaptiveStage('practice', 'evaluated', 72), 'evaluate');
  assert.equal(computeNextAdaptiveStage('practice', 'evaluated', 40), 'improve');
});

test('educational levels and math subfields cover complete curriculum specification', () => {
  assert.equal(EDUCATIONAL_LEVELS.length, 8);
  assert.equal(ADAPTIVE_STAGES.length, 8);
  assert.equal(MATH_SUBFIELDS.length, 16);
  assert.ok(SEED_MATH_SOLUTION.given.length >= 2);
  assert.ok(SEED_MATH_SOLUTION.toCalculate.length > 10);
});

test('master system instruction adapts to educational level, stage, and mathematics protocol', () => {
  const mathPrompt = buildMasterSystemInstruction({
    levelId: 'university',
    disciplineId: 'mathematics',
    stageId: 'demonstrate',
    teachingMode: 'socratic',
  });
  assert.match(mathPrompt, /BRUCENSENGIYUMVA AI/);
  assert.match(mathPrompt, /BRUCE DIGITAL 360/);
  assert.match(mathPrompt, /University Undergraduate/);
  assert.match(mathPrompt, /DEMONSTRATE/);
  assert.match(mathPrompt, /Given Information/);
  assert.match(mathPrompt, /What Needs to Be Calculated/);

  const bioPrompt = buildMasterSystemInstruction({
    levelId: 'primary',
    disciplineId: 'biology',
    stageId: 'introduce',
    teachingMode: 'direct',
  });
  assert.match(bioPrompt, /Primary School/);
  assert.doesNotMatch(bioPrompt, /MATHEMATICS PROTOCOL/);
});

test('mastery summary and notebook markdown export compute deterministic results', () => {
  const session = createInitialSession('high_school', 'mathematics');
  session.stageId = 'practice';
  session.messages = [
    { id: '1', role: 'user', content: 'Explain derivatives', timestamp: '2026-11-18T00:00:00Z' },
    { id: '2', role: 'assistant', content: 'Let us inspect slope...', timestamp: '2026-11-18T00:00:01Z' },
  ];

  const summary = calculateMasterySummary(
    [session],
    [
      {
        id: 'note-1',
        title: 'Product Rule',
        category: 'math',
        disciplineId: 'mathematics',
        levelId: 'high_school',
        contentMarkdown: 'Derivative of $uv$ is $u\'v + uv\'$.',
        createdAt: '2026-11-18T00:00:00Z',
      },
    ],
    {
      completedPracticeCount: 2,
      scoreHistory: [80, 100],
      masteredTopics: ['Calculus'],
    }
  );

  assert.equal(summary.totalSessions, 1);
  assert.equal(summary.totalTurns, 1);
  assert.equal(summary.savedNotesCount, 1);
  assert.equal(summary.averagePracticeScore, 90);
  assert.ok(summary.masteryIndex > 0 && summary.masteryIndex <= 100);

  const md = formatNotebookMarkdown([
    {
      id: 'note-1',
      title: 'Product Rule',
      category: 'math',
      disciplineId: 'mathematics',
      levelId: 'high_school',
      contentMarkdown: 'Derivative check',
      createdAt: '2026-11-18T00:00:00Z',
    },
  ]);
  assert.match(md, /BRUCENSENGIYUMVA AI — Study Notebook/);
  assert.match(md, /## Product Rule/);
});

test('parseDataUrl and prepareTextForSpeech normalize media payloads and spoken prose', () => {
  const parsed = parseDataUrl('data:image/jpeg;base64,ABC123==');
  assert.deepEqual(parsed, { mimeType: 'image/jpeg', data: 'ABC123==' });
  assert.equal(parseDataUrl('not-a-data-url'), null);

  const spoken = prepareTextForSpeech('### Answer\nThe **result** is $\\frac{3}{4}$ and `x = 1`.');
  assert.equal(spoken, 'Answer The result is 3 over 4 and x = 1.');
});
