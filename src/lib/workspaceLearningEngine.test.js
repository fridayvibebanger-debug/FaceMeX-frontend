import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildLearningInstruction,
  createLearningContext,
  detectSubjectAndTopic,
  selectLearningVisual,
  validateLearningResponse,
} from './workspaceLearningEngine.js';

test('detects subjects and topics from two representative questions per subject', () => {
  const examples = [
    ['Mathematics', 'Solve this quadratic equation: x^2 - 5x + 6 = 0'],
    ['Mathematics', 'How do I add 3/4 and 2/5?'],
    ['Biology', 'Explain mitosis in a plant cell.'],
    ['Biology', 'How does photosynthesis work?'],
    ['Life Sciences', 'What are the stages of mitosis in Life Sciences?'],
    ['Life Sciences', 'Explain DNA inheritance for my Life Sciences class.'],
    ['Physics', 'Calculate acceleration using Newton’s second law.'],
    ['Physics', 'Explain voltage and current in a circuit.'],
    ['Chemistry', 'Balance this chemical equation: H2 + O2 -> H2O.'],
    ['Chemistry', 'How does the pH scale describe acids and bases?'],
    ['Geography', 'Explain rainfall patterns in a climate graph.'],
    ['Geography', 'How do I read a map scale and contour lines?'],
    ['Natural Sciences', 'Explain the water cycle for Natural Sciences.'],
    ['Natural Sciences', 'What is the difference between solids and liquids in Natural Sciences?'],
    ['History', 'Explain the causes and effects of apartheid in South Africa.'],
    ['History', 'Help me make a timeline of the French Revolution.'],
    ['Accounting', 'Calculate the accounting equation for these assets and liabilities.'],
    ['Accounting', 'How do I prepare an income statement from a trial balance?'],
    ['Economics', 'Explain how supply and demand affect equilibrium price.'],
    ['Economics', 'What causes inflation and how is it measured?'],
    ['Business Studies', 'Explain the marketing mix for Business Studies.'],
    ['Business Studies', 'What should go into a business plan for a small shop?'],
    ['Computer Science', 'Explain a sorting algorithm with an example.'],
    ['Computer Science', 'How does recursion work in a computer program?'],
    ['Information Technology', 'Explain how a computer network sends data.'],
    ['Information Technology', 'What is the purpose of a database in IT?'],
    ['Engineering', 'How do engineers calculate stress in a beam?'],
    ['Engineering', 'Explain the design constraints of an engineering system.'],
    ['Agricultural Sciences', 'How does soil pH affect crop growth?'],
    ['Agricultural Sciences', 'Explain irrigation methods in Agricultural Sciences.'],
    ['Environmental Studies', 'Explain climate change and its environmental effects.'],
    ['Environmental Studies', 'How does pollution affect an ecosystem?'],
    ['Statistics', 'How do I calculate standard deviation for this data?'],
    ['Statistics', 'Explain probability and sample size in statistics.'],
    ['English and Literature', 'Analyze the theme and characters in this novel.'],
    ['English and Literature', 'How do I identify a metaphor in a poem?'],
  ];

  for (const [subject, question] of examples) {
    assert.equal(detectSubjectAndTopic(question).subject, subject, question);
    assert.ok(detectSubjectAndTopic(question).topic.length > 0, question);
  }
});

test('detects level, calculation, struggle and attached-image context', () => {
  assert.deepEqual(
    (({ level, struggling, questionType, hasImage }) => ({ level, struggling, questionType, hasImage }))(
      createLearningContext('I am stuck. Calculate this university-level physics problem.', { hasImage: true }),
    ),
    { level: 'university', struggling: true, questionType: 'calculation', hasImage: true },
  );
  assert.equal(createLearningContext('Explain quadratic equations for grade 10.').level, 'intermediate');
  assert.equal(createLearningContext('Can you compare mitosis and meiosis?').questionType, 'comparison');
});

test('prefers the current question over unrelated earlier conversation topics', () => {
  assert.equal(
    detectSubjectAndTopic('What is mitosis?', 'I am studying accounting and the accounting equation.').subject,
    'Biology',
  );
  assert.deepEqual(
    (({ subject, topic }) => ({ subject, topic }))(
      detectSubjectAndTopic('Why does equilibrium change?', 'Explain supply and demand in Economics.'),
    ),
    { subject: 'Economics', topic: 'Supply and demand' },
  );
});

test('chooses appropriate visual approaches without requesting unsupported stock visuals', () => {
  assert.equal(selectLearningVisual(createLearningContext('Explain mitosis.'), 'Explain mitosis.'), 'diagram');
  assert.equal(selectLearningVisual(createLearningContext('Make a timeline of apartheid.'), 'Make a timeline of apartheid.'), 'timeline');
  assert.equal(selectLearningVisual(createLearningContext('Show me a rainfall map.'), 'Show me a rainfall map.'), 'map');
  assert.equal(selectLearningVisual(createLearningContext('Explain this topic.'), 'Explain this topic.'), 'none');
});

test('builds adaptive instructions and asks for evidence-grounded visuals', () => {
  const profile = createLearningContext('I am confused. Explain a university economics supply and demand graph.');
  const instruction = buildLearningInstruction(profile);
  assert.match(instruction, /Economics/);
  assert.match(instruction, /university/);
  assert.match(instruction, /smaller steps/);
  assert.match(instruction, /reliable source/);
  assert.match(instruction, /do not invent facts or data/i);
});

test('validates structured visuals and practice while preserving the textual answer', () => {
  const valid = validateLearningResponse(
    'Use these steps.\n\n```chart\n{"type":"line","title":"Observed values","xLabel":"Time","yLabel":"Value","data":[{"label":"A","value":2}]}\n```\n\n```practice\n{"question":"Try this","solution":"Check your work"}\n```',
  );
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.issues, []);

  const fallback = validateLearningResponse(
    'The explanation is still useful.\n\n```chart\n{"type":"pie","title":"Unsupported","xLabel":"x","yLabel":"y","data":[]}\n```',
  );
  assert.equal(fallback.valid, true);
  assert.match(fallback.answer, /The explanation is still useful/);
  assert.deepEqual(fallback.issues, ['invalid-chart']);

  assert.equal(validateLearningResponse('').valid, false);
  assert.equal(validateLearningResponse('```diagram\n{}\n```').valid, false);
});
