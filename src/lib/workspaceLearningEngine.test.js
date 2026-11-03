import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildLearningInstruction,
  createLearningContext,
  createLearningClarification,
  createDeterministicCalculusAnswer,
  createHydrogenWaterReactionDiagram,
  createNewtonSecondLawDiagram,
  createQuadraticStationaryPointDiagram,
  detectSubjectAndTopic,
  selectLearningVisual,
  validateLearningResponse,
} from './workspaceLearningEngine.js';
import { parseWorkspaceVisualization } from './workspaceResponse.js';

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
    ['Languages', 'Explain verb conjugation in a foreign language.'],
    ['Languages', 'Translate this sentence and explain the grammar.'],
    ['Technology', 'Explain a technological system.'],
    ['Technology', 'How does a design and technology process work?'],
    ['Health Sciences', 'Explain human anatomy and physiology.'],
    ['Health Sciences', 'How does the circulatory system work in health sciences?'],
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

test('derives a Newton second-law force visual only from explicit, unit-bearing values', () => {
  const question = 'A 1,200 kg car accelerates at 4 m/s². Calculate the force.';
  assert.deepEqual(createNewtonSecondLawDiagram(question), {
    mass: 1200,
    acceleration: 4,
    force: 4800,
    direction: 'right',
    directionSpecified: false,
  });
  assert.equal(createLearningContext(question).visual, 'force-diagram');
  assert.equal(createNewtonSecondLawDiagram('A 1,200 kg car accelerates. Calculate the force.'), null);
  assert.equal(createNewtonSecondLawDiagram('A car accelerates at 4 m/s². Calculate the force.'), null);
  assert.deepEqual(
    (({ direction, directionSpecified }) => ({ direction, directionSpecified }))(
      createNewtonSecondLawDiagram('The 1,200 kg car accelerates at 4 m/s² to the left. Find the force.'),
    ),
    { direction: 'left', directionSpecified: true },
  );
});

test('selects a balanced water-formation visual only for a matching chemistry question', () => {
  const prompt = 'Show how hydrogen and oxygen form water and balance the equation.';
  assert.equal(createHydrogenWaterReactionDiagram(prompt), true);
  assert.equal(createLearningContext(prompt).subject, 'Chemistry');
  assert.equal(createHydrogenWaterReactionDiagram('Explain how water evaporates.'), false);
});

test('requests validated interactive balancing cards for chemical-equation questions', () => {
  const profile = createLearningContext('Balance Fe + O2 -> Fe2O3.');
  const instruction = buildLearningInstruction(profile);
  assert.equal(profile.subject, 'Chemistry');
  assert.match(instruction, /equation-balance/);
  assert.match(instruction, /smallest whole-number balanced coefficients/);
});

test('derives and renders the stationary point of an isotropic quadratic surface', () => {
  const prompt = 'Find and classify the stationary points of f(x) = x² + y² - 4x - 6y.';
  assert.deepEqual(createQuadraticStationaryPointDiagram(prompt), {
    kind: 'diagram',
    diagramType: 'contour',
    title: 'Quadratic function contour',
    xLabel: 'x',
    yLabel: 'y',
    centerX: 2,
    centerY: 3,
    stationaryValue: -13,
    curvature: 1,
    radii: [1, 2, 3],
  });
  assert.equal(createLearningContext(prompt).visual, 'contour');
  assert.equal(
    createQuadraticStationaryPointDiagram('Find the stationary point of f(x,y) = x² + 2y² - 4x - 6y.'),
    null,
  );
});

test('chooses appropriate visual approaches without requesting unsupported stock visuals', () => {
  assert.equal(selectLearningVisual(createLearningContext('Explain mitosis.'), 'Explain mitosis.'), 'diagram');
  assert.equal(selectLearningVisual(createLearningContext('Make a timeline of apartheid.'), 'Make a timeline of apartheid.'), 'timeline');
  assert.equal(selectLearningVisual(createLearningContext('Show me a rainfall map.'), 'Show me a rainfall map.'), 'map');
  assert.equal(selectLearningVisual(createLearningContext('Explain this topic.'), 'Explain this topic.'), 'none');
});

test('selects subject-appropriate renderable visuals for the requested cross-subject examples', () => {
  const examples = [
    ['Biology', 'Explain the human circulatory system using a labelled diagram.', 'diagram'],
    ['Physics', 'A 1,200 kg car accelerates at 4 m/s². Calculate the force.', 'force-diagram'],
    ['Chemistry', 'Show how hydrogen and oxygen form water using a molecular model.', 'diagram'],
    ['Geography', 'Explain drought in Limpopo using a climate graph.', 'graph'],
    ['History', 'Create a timeline of important Industrial Revolution events.', 'timeline'],
    ['Accounting', 'Prepare an income statement from the supplied financial figures.', 'table'],
    ['Economics', 'Explain supply and demand using an accurately labelled graph.', 'graph'],
    ['Computer Science', 'Explain how an API request travels between frontend, backend and database.', 'code-diagram'],
    ['Agricultural Sciences', 'Explain the stages of maize growth using a lifecycle diagram.', 'diagram'],
    ['Engineering', 'Explain how a solar photovoltaic system converts sunlight into electricity.', 'diagram'],
  ];

  for (const [subject, prompt, visual] of examples) {
    const profile = createLearningContext(prompt);
    assert.equal(profile.subject, subject, prompt);
    assert.equal(profile.visual, visual, prompt);
  }
});

test('builds adaptive instructions and asks for evidence-grounded visuals', () => {
  const profile = createLearningContext('I am confused. Explain a university economics supply and demand graph.');
  const instruction = buildLearningInstruction(profile);
  assert.match(instruction, /Economics/);
  assert.match(instruction, /university/);
  assert.match(instruction, /smaller steps/);
  assert.match(instruction, /reliable source/);
  assert.match(instruction, /do not invent facts or data/i);
  assert.match(instruction, /Never require a grade, level, or previous attempt/i);
  assert.match(instruction, /Make the explanation specific to the subject and question/i);
  assert.match(instruction, /never expose bare JSON/i);
  assert.match(instruction, /Test your understanding/);
  assert.match(instruction, /2–3 short multiple-choice questions/);
  assert.match(instruction, /multi-line/);
  assert.match(instruction, /Never emit \[\[VISUAL_REFERENCE\]\]/);
});

test('clarifies missing derivative inputs and solves the requested cubic and quadratic regressions exactly', () => {
  assert.equal(
    createLearningClarification('Find the derivative of.'),
    'Which function would you like to differentiate? For example, f(x) = x³.',
  );
  assert.equal(createLearningClarification('Find the derivative of f(x) = x³.'), null);
  assert.equal(createLearningClarification('What does a derivative represent?'), null);
  assert.equal(createDeterministicCalculusAnswer('Find the derivative of x^4.'), null);
  const conciseDerivative = createDeterministicCalculusAnswer('Find the derivative of x³.');
  assert.match(conciseDerivative, /Final answer/);
  assert.doesNotMatch(conciseDerivative, /```chart/);

  const derivative = createDeterministicCalculusAnswer(
    'Find the derivative of f(x) = x³. Explain every step and show a simple graph.',
  );
  assert.match(derivative, /Power Rule/);
  assert.match(derivative, /f'\(x\) = 3x\^\{3-1\}/);
  assert.match(derivative, /f'\(x\) = 3x\^2/);
  assert.match(derivative, /at x = 1 the slope is 3/i);
  const chartSource = derivative.match(/```chart\n([\s\S]*?)\n```/)?.[1];
  assert.ok(chartSource);
  const chart = parseWorkspaceVisualization('chart', chartSource);
  assert.equal(chart.chartType, 'multi-line');
  assert.equal(chart.series[0].label, 'f(x) = x³');
  assert.equal(chart.series[1].label, 'f′(x) = 3x²');
  assert.equal(chart.series[0].data.length, 33);
  assert.deepEqual(chart.series[0].data[16], { x: 0, y: 0 });
  assert.deepEqual(chart.series[1].data[16], { x: 0, y: 0 });
  assert.deepEqual(chart.series[0].data[24], { x: 1, y: 1 });
  assert.deepEqual(chart.series[1].data[24], { x: 1, y: 3 });
  assert.equal(validateLearningResponse(derivative).valid, true);

  const stationary = createDeterministicCalculusAnswer(
    'Find the stationary points of f(x) = x² - 4x + 3.',
  );
  assert.match(stationary, /f'\(x\) = 2x - 4/);
  assert.match(stationary, /f''\(x\) = 2/);
  assert.match(stationary, /minimum stationary point is \$\$\(2, -1\)\$\$/);
  assert.equal(createDeterministicCalculusAnswer('Find stationary points of f(x) = x^2 +.'), null);
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
  assert.equal(validateLearningResponse(
    'Demand falls as price rises.\n\n```chart\n{"type":"multi-line","title":"Illustrative supply and demand","xLabel":"Quantity","yLabel":"Price","illustrative":true,"series":[{"label":"Demand","data":[{"x":0,"y":10},{"x":5,"y":5}]},{"label":"Supply","data":[{"x":0,"y":0},{"x":5,"y":5}]}]}\n```',
  ).valid, true);

  const equationBalance = validateLearningResponse(
    'Iron reacts with oxygen to form iron oxide.\n\n```equation-balance\n{"reactants":[{"formula":"Fe","coefficient":4},{"formula":"O2","coefficient":3}],"products":[{"formula":"Fe2O3","coefficient":2}],"explanation":"Balance iron first, then oxygen."}\n```',
  );
  assert.equal(equationBalance.valid, true);
  assert.match(equationBalance.answer, /```equation-balance/);
  assert.deepEqual(validateLearningResponse(
    'Equation.\n\n```equation-balance\n{"reactants":[{"formula":"H2","coefficient":1}],"products":[{"formula":"H2O","coefficient":1}],"explanation":"Invalid."}\n```',
  ).issues, ['invalid-equation-balance']);
});
