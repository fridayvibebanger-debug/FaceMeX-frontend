import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildWorkspaceModeInstruction,
  extractYouTubeUrlFromText,
  extractYouTubeVideoId,
  createSolveForXGuidanceResponse,
  createWorkspaceMediaPlan,
  isWorkspaceVideoRelevantToResponse,
  isExplicitTechnicalRequest,
  isMathematicsQuestion,
  isYouTubeSummaryRequest,
  normalizeWorkspaceAnswerForDisplay,
  normalizeWorkspaceImages,
  normalizeWorkspaceResponse,
  parseWorkspaceCalculator,
  parseWorkspaceFollowUp,
  parseWorkspaceEquationBalance,
  parseWorkspacePractice,
  parseWorkspaceUnderstanding,
  parseWorkspaceInteractiveForm,
  parseWorkspaceSections,
  parseWorkspaceSteps,
  parseWorkspaceVisualization,
  selectRelevantWorkspaceImages,
  selectRelevantYouTubeLessonVideos,
} from './workspaceResponse.js';
import {
  prepareWorkspaceSpeechText,
  selectWorkspaceSpeechVoice,
} from './workspaceSpeech.js';

test('prepares readable speech without Markdown symbols or code blocks', () => {
  const spoken = prepareWorkspaceSpeechText(
    '## **Next steps**\n\n1. *Review* the plan.\n\n```javascript\nconst total = 3;\n```\n\n[Open the guide](https://example.com)',
  );
  assert.match(spoken, /Next steps/);
  assert.match(spoken, /Review the plan/);
  assert.match(spoken, /Open the guide/);
  assert.doesNotMatch(spoken, /[#*_`]|javascript|const total|https:/);
});

test('speaks common currency symbols and ISO currency codes as currency names', () => {
  const spoken = prepareWorkspaceSpeechText(
    'Budget: $25, €30, £40, R500, USD 60, CAD 70, JPY 800.',
  );
  assert.match(spoken, /\b25 dollars\b/);
  assert.match(spoken, /euros/);
  assert.match(spoken, /British pounds/);
  assert.match(spoken, /South African rand/);
  assert.match(spoken, /US dollars/);
  assert.match(spoken, /Canadian dollars/);
  assert.match(spoken, /Japanese yen/);
  assert.doesNotMatch(spoken, /\bUSD\b|\bCAD\b|\bJPY\b/);
});

test('prefers a natural English speech voice suited to the requested locale', () => {
  const voices = [
    { name: 'Default Voice', lang: 'en-US', default: true },
    { name: 'Natural South African English', lang: 'en-ZA', default: false },
    { name: 'French Voice', lang: 'fr-FR', default: false },
  ];
  assert.equal(selectWorkspaceSpeechVoice(voices, 'en-ZA'), voices[1]);
  assert.equal(selectWorkspaceSpeechVoice([], 'en-ZA'), null);
});

test('builds distinct actionable student, teacher, and career response modes', () => {
  const student = buildWorkspaceModeInstruction('student');
  const teacher = buildWorkspaceModeInstruction('teacher');
  const career = buildWorkspaceModeInstruction('career');

  assert.match(student, /ACTIVE FACEMEX RESPONSE MODE: STUDENT/);
  assert.match(student, /practice task/);
  assert.match(teacher, /ACTIVE FACEMEX RESPONSE MODE: TEACHER/);
  assert.match(teacher, /learning goal/);
  assert.match(career, /ACTIVE FACEMEX RESPONSE MODE: CAREER/);
  assert.match(career, /concrete next steps/);
  assert.match(student, /starting from zero/);
  assert.match(teacher, /observable/);
  assert.match(career, /early-career users/);
  assert.match(career, /business starters/);
  assert.match(career, /existing business owners/);
  assert.match(career, /unsure what they can do/);

  for (const instruction of [student, teacher, career]) {
    assert.match(instruction, /Do not include programming-language names, source code/);
    assert.match(instruction, /make the most useful next action clear/);
  }
  assert.equal(buildWorkspaceModeInstruction(null), '');
  assert.equal(buildWorkspaceModeInstruction('unknown'), '');
});

test('validates grounded understanding quizzes before rendering', () => {
  const quiz = {
    questions: [
      {
        question: 'How many hydrogen atoms are in H₂O?',
        choices: ['1', '2', '3'],
        correctIndex: 1,
        explanation: 'The subscript 2 means there are two hydrogen atoms.',
      },
      {
        question: 'Which change balances an equation?',
        choices: ['Change coefficients', 'Change subscripts'],
        correctIndex: 0,
        explanation: 'Coefficients change molecule counts without changing substances.',
      },
    ],
  };
  assert.deepEqual(parseWorkspaceUnderstanding(JSON.stringify(quiz)), quiz);
  assert.equal(parseWorkspaceUnderstanding('{'), null);
  assert.equal(parseWorkspaceUnderstanding(JSON.stringify({ questions: [quiz.questions[0]] })), null);
  assert.equal(parseWorkspaceUnderstanding(JSON.stringify({
    questions: quiz.questions.map((question) => ({ ...question, correctIndex: 10 })),
  })), null);
  assert.equal(parseWorkspaceUnderstanding(JSON.stringify({
    questions: quiz.questions.map((question) => ({ ...question, choices: ['same', 'same'] })),
  })), null);

  const rendered = normalizeWorkspaceAnswerForDisplay(
    `A water molecule has two hydrogen atoms.\n\n\`\`\`understanding\n${JSON.stringify(quiz)}\n\`\`\``,
    'Explain how water molecules form.',
  );
  assert.match(rendered, /```understanding/);
  assert.doesNotMatch(normalizeWorkspaceAnswerForDisplay(
    'Text.\n\n```understanding\n{"questions":[{"question":"Only one"}]}\n```',
    'Explain water.',
  ), /```understanding/);
});

test('validates interactive response forms and their supported selection types', () => {
  const form = {
    title: 'Choose your cooking details',
    questions: [
      { question: 'What kind of chicken do you have?', type: 'single', options: ['Wings', 'Drumsticks'] },
      { question: 'What will you cook it in?', type: 'single', options: ['Frying pan', 'Air fryer'] },
      { question: 'Any dietary requirements?', type: 'text' },
      { question: 'Which sides would you like?', type: 'multiple', options: ['Rice', 'Salad'] },
    ],
    submitLabel: 'Give me exact cooking times',
  };
  assert.deepEqual(parseWorkspaceInteractiveForm(JSON.stringify(form)), form);
  assert.equal(parseWorkspaceInteractiveForm('{'), null);
  assert.equal(parseWorkspaceInteractiveForm(JSON.stringify({
    ...form,
    questions: [{ question: 'Pick one', type: 'single', options: ['Only one'] }],
  })), null);
  assert.equal(parseWorkspaceInteractiveForm(JSON.stringify({
    ...form,
    questions: [{ question: 'Pick one', type: 'unknown', options: ['One', 'Two'] }],
  })), null);
  assert.equal(parseWorkspaceInteractiveForm(JSON.stringify({
    ...form,
    questions: [{ question: 'Pick one', type: 'text', options: ['unexpected'] }],
  })), null);
  const mixedResponse = normalizeWorkspaceAnswerForDisplay(
    `Here are your choices.\n\n\`\`\`interactive\n${JSON.stringify(form)}\n\`\`\`\n\nI’ll use these details for the next answer.`,
    'Help me decide what to cook.',
  );
  assert.match(mixedResponse, /Here are your choices/);
  assert.match(mixedResponse, /```interactive/);
  assert.match(mixedResponse, /I’ll use these details for the next answer/);
});

test('validates structured informational sections and instructional steps', () => {
  const sections = {
    title: 'Marketing routine',
    sections: [
      { heading: 'Daily — 20 minutes', body: 'Post a useful update.', items: ['Share a product demo.'], icon: 'calendar' },
      { heading: 'Weekly target', body: 'Track meaningful engagement.', items: ['Aim for five conversations.'], icon: 'growth' },
    ],
  };
  assert.deepEqual(parseWorkspaceSections(JSON.stringify(sections)), sections);
  assert.equal(parseWorkspaceSections(JSON.stringify({
    ...sections,
    sections: [{ heading: 'Empty', items: [] }],
  })), null);

  const steps = {
    title: 'Follow this setup',
    steps: [
      { heading: 'Today — wait for the review', body: 'Read new messages.', icon: 'mail' },
      { heading: 'Prepare evidence', body: 'Find the related record.', icon: 'document' },
    ],
  };
  assert.deepEqual(parseWorkspaceSteps(JSON.stringify(steps)), steps);
  assert.equal(parseWorkspaceSteps(JSON.stringify({ ...steps, steps: [steps.steps[0]] })), null);
});

test('validates equation-balancing data against parsed atom counts and coefficients', () => {
  const equation = {
    reactants: [
      { formula: 'Ca(OH)2', coefficient: 1 },
      { formula: 'HCl', coefficient: 2 },
    ],
    products: [
      { formula: 'CaCl2', coefficient: 1 },
      { formula: 'H2O', coefficient: 2 },
    ],
    explanation: 'Coefficients change molecule quantities; subscripts stay fixed because atoms are conserved.',
  };
  assert.deepEqual(parseWorkspaceEquationBalance(JSON.stringify(equation)), {
    reactants: [
      { formula: 'Ca(OH)2', coefficient: 1, atomCounts: { Ca: 1, O: 2, H: 2 } },
      { formula: 'HCl', coefficient: 2, atomCounts: { H: 1, Cl: 1 } },
    ],
    products: [
      { formula: 'CaCl2', coefficient: 1, atomCounts: { Ca: 1, Cl: 2 } },
      { formula: 'H2O', coefficient: 2, atomCounts: { H: 2, O: 1 } },
    ],
    explanation: equation.explanation,
  });
  assert.equal(parseWorkspaceEquationBalance(JSON.stringify({
    ...equation,
    products: equation.products.map((item) => ({ ...item, coefficient: 1 })),
  })), null);
  assert.equal(parseWorkspaceEquationBalance(JSON.stringify({
    ...equation,
    reactants: [{ formula: 'Ca(OH]', coefficient: 1 }, equation.reactants[1]],
  })), null);
  assert.equal(parseWorkspaceEquationBalance(JSON.stringify({
    ...equation,
    reactants: equation.reactants.map((item) => ({ ...item, coefficient: 2 })),
    products: equation.products.map((item) => ({ ...item, coefficient: 2 })),
  })), null);
  const formatted = normalizeWorkspaceAnswerForDisplay(
    `Balanced reaction:\n\n\`\`\`equation-balance\n${JSON.stringify(equation)}\n\`\`\``,
    'Balance the equation.',
  );
  assert.match(formatted, /```equation-balance/);
});

test('validates structured chart data without inventing values', () => {
  assert.deepEqual(
    parseWorkspaceVisualization('chart', JSON.stringify({
      type: 'bar',
      title: 'Monthly totals',
      xLabel: 'Month',
      yLabel: 'Users',
      data: [{ label: 'January', value: 12 }, { label: 'February', value: 15 }],
    })),
    {
      kind: 'chart',
      chartType: 'bar',
      title: 'Monthly totals',
      xLabel: 'Month',
      yLabel: 'Users',
      data: [{ label: 'January', value: 12 }, { label: 'February', value: 15 }],
    },
  );
});

test('validates supported business calculator inputs and preserves the written answer', () => {
  const calculator = {
    type: 'delivery-revenue',
    title: 'Delivery revenue scenario',
    currency: 'ZAR',
    assumptions: 'Example assumptions to adjust.',
    inputs: {
      drivers: 10,
      deliveriesPerDriverPerDay: 8,
      pricePerDelivery: 80,
      workingDaysPerMonth: 22,
    },
  };
  const parsed = parseWorkspaceCalculator(JSON.stringify(calculator));
  assert.equal(parsed.calculatorType, 'delivery-revenue');
  assert.equal(parsed.currency, 'ZAR');
  assert.deepEqual(parsed.inputs.map(({ key, value }) => ({ key, value })), [
    { key: 'drivers', value: 10 },
    { key: 'deliveriesPerDriverPerDay', value: 8 },
    { key: 'pricePerDelivery', value: 80 },
    { key: 'workingDaysPerMonth', value: 22 },
  ]);
  assert.equal(parseWorkspaceCalculator('{'), null);
  assert.equal(parseWorkspaceCalculator(JSON.stringify({
    type: 'toString',
    title: 'Invalid calculator',
    inputs: {},
  })), null);
  assert.equal(parseWorkspaceCalculator(JSON.stringify({
    ...calculator,
    inputs: { ...calculator.inputs, drivers: 501 },
  })), null);
  assert.equal(parseWorkspaceCalculator(JSON.stringify({
    ...calculator,
    inputs: { ...calculator.inputs, formula: 'arbitrary code' },
  })), null);
  assert.equal(parseWorkspaceCalculator(JSON.stringify({ ...calculator, currency: 'INVALID' })), null);

  const answer = normalizeWorkspaceAnswerForDisplay(
    `Revenue depends on your assumptions.\n\n\`\`\`calculator\n${JSON.stringify(calculator)}\n\`\`\``,
    'How much could my delivery business make?',
  );
  assert.match(answer, /Revenue depends on your assumptions/);
  assert.match(answer, /```calculator/);
  const invalidAnswer = normalizeWorkspaceAnswerForDisplay(
    'The estimate is only illustrative.\n\n```calculator\n{"type":"delivery-revenue","inputs":{"formula":"bad"}}\n```',
    'How much could this business make?',
  );
  assert.match(invalidAnswer, /The estimate is only illustrative/);
  assert.doesNotMatch(invalidAnswer, /```calculator|formula/);

  const rawCalculator = normalizeWorkspaceAnswerForDisplay(JSON.stringify(calculator), 'Estimate delivery revenue.');
  assert.match(rawCalculator, /^```calculator/);
});

test('validates pie chart values and identifies assumption-based data', () => {
  const pie = {
    type: 'pie',
    title: 'Monthly expense mix',
    illustrative: true,
    data: [
      { label: 'Fuel', value: 300 },
      { label: 'Wages', value: 500 },
      { label: 'Other', value: 200 },
    ],
  };
  assert.deepEqual(parseWorkspaceVisualization('chart', JSON.stringify(pie)), {
    kind: 'chart',
    chartType: 'pie',
    title: 'Monthly expense mix',
    data: pie.data,
    illustrative: true,
  });
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    ...pie,
    illustrative: undefined,
  })), null);
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    ...pie,
    data: [{ label: 'Fuel', value: -1 }, { label: 'Wages', value: 2 }],
  })), null);
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    ...pie,
    data: [{ label: 'Fuel', value: 0 }, { label: 'Wages', value: 0 }],
  })), null);
});

test('validates numeric coordinate graphs with ordered, finite points', () => {
  const graph = {
    type: 'scatter',
    title: 'Quadratic function',
    xLabel: 'x',
    yLabel: 'f(x)',
    data: [{ x: -2, y: 4 }, { x: -1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 4 }],
  };
  assert.deepEqual(parseWorkspaceVisualization('chart', JSON.stringify(graph)), {
    kind: 'chart',
    chartType: 'scatter',
    title: graph.title,
    xLabel: graph.xLabel,
    yLabel: graph.yLabel,
    data: graph.data,
  });
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    ...graph,
    data: [{ x: 1, y: 1 }, { x: 0, y: 0 }],
  })), null);
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    ...graph,
    data: [{ x: 0, y: Number.NaN }, { x: 1, y: 1 }],
  })), null);
});

test('validates multi-series numeric graphs and requires factual data to stay distinguishable', () => {
  const graph = {
    type: 'multi-line',
    title: 'Supply and demand (illustrative)',
    xLabel: 'Quantity',
    yLabel: 'Price',
    illustrative: true,
    series: [
      { label: 'Demand', data: [{ x: 0, y: 10 }, { x: 5, y: 5 }, { x: 10, y: 0 }] },
      { label: 'Supply', data: [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }] },
    ],
  };
  assert.deepEqual(parseWorkspaceVisualization('chart', JSON.stringify(graph)), {
    kind: 'chart',
    chartType: 'multi-line',
    title: graph.title,
    xLabel: graph.xLabel,
    yLabel: graph.yLabel,
    series: graph.series,
    illustrative: true,
  });
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    ...graph,
    illustrative: undefined,
  })).illustrative, false);
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    ...graph,
    series: graph.series.map((series) => ({
      ...series,
      data: [{ x: 1, y: 1 }, { x: 1, y: 2 }],
    })),
  })), null);
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    ...graph,
    series: graph.series.map((series) => ({
      ...series,
      data: Array.from({ length: 33 }, (_, index) => ({ x: index / 8, y: (index / 8) ** 2 })),
    })),
  })).series[0].data.length, 33);
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    ...graph,
    series: graph.series.map((series) => ({
      ...series,
      data: Array.from({ length: 65 }, (_, index) => ({ x: index, y: index ** 2 })),
    })),
  })), null);
});

test('rejects malformed, unsafe, and oversized visualizations', () => {
  assert.equal(parseWorkspaceVisualization('chart', '{'), null);
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    type: 'bar', title: 'Invalid', xLabel: 'x', yLabel: 'y', data: [{ label: 'bad', value: '10' }],
  })), null);
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    type: 'bar', title: 'Invalid', xLabel: 'x', yLabel: 'y',
    data: Array.from({ length: 13 }, (_, index) => ({ label: `item-${index}`, value: index })),
  })), null);
  assert.equal(parseWorkspaceVisualization('chart', JSON.stringify({
    type: 'pie', title: 'Unknown', xLabel: 'x', yLabel: 'y', data: [{ label: 'a', value: 1 }],
  })), null);
  assert.equal(parseWorkspaceVisualization('diagram', JSON.stringify({
    type: 'flow', title: 'Bad flow', steps: ['Only one'],
  })), null);
  assert.equal(parseWorkspaceVisualization('diagram', JSON.stringify({
    type: 'triangle', title: 'Bad triangle', legA: 6, legB: 8, hypotenuse: 9, unit: 'cm',
  })), null);
});

test('accepts a labelled right triangle only when its side lengths satisfy Pythagoras', () => {
  assert.deepEqual(
    parseWorkspaceVisualization('diagram', JSON.stringify({
      type: 'triangle',
      title: 'Right-angled triangle',
      legA: 6,
      legB: 8,
      hypotenuse: 10,
      unit: 'cm',
    })),
    {
      kind: 'diagram',
      diagramType: 'triangle',
      title: 'Right-angled triangle',
      legA: 6,
      legB: 8,
      hypotenuse: 10,
      unit: 'cm',
    },
  );
});

test('validates contour diagrams with ordered radii and bounded coordinates', () => {
  const contour = {
    type: 'contour',
    title: 'Quadratic function contour',
    xLabel: 'x',
    yLabel: 'y',
    centerX: 2,
    centerY: 3,
    stationaryValue: -13,
    curvature: 1,
    radii: [1, 2, 3],
  };
  assert.deepEqual(parseWorkspaceVisualization('diagram', JSON.stringify(contour)), {
    kind: 'diagram',
    diagramType: 'contour',
    title: contour.title,
    xLabel: contour.xLabel,
    yLabel: contour.yLabel,
    centerX: 2,
    centerY: 3,
    stationaryValue: -13,
    curvature: 1,
    radii: [1, 2, 3],
  });
  assert.equal(parseWorkspaceVisualization('diagram', JSON.stringify({
    ...contour,
    radii: [1, 3, 2],
  })), null);
});

test('accepts a renderable process flow with concise labeled stages', () => {
  assert.deepEqual(
    parseWorkspaceVisualization('diagram', JSON.stringify({
      type: 'flow',
      title: 'API request path',
      steps: ['Frontend sends request', 'Backend validates and processes', 'Database returns data'],
    })),
    {
      kind: 'diagram',
      diagramType: 'flow',
      title: 'API request path',
      steps: ['Frontend sends request', 'Backend validates and processes', 'Database returns data'],
    },
  );
  assert.deepEqual(
    parseWorkspaceVisualization('diagram', JSON.stringify({
      type: 'flow',
      title: 'Request path',
      steps: [
        { title: 'FaceMeX website', description: 'You send a message.' },
        { title: 'AI proxy', description: 'Routes your request.' },
      ],
    })),
    {
      kind: 'diagram',
      diagramType: 'flow',
      title: 'Request path',
      steps: [
        { title: 'FaceMeX website', description: 'You send a message.' },
        { title: 'AI proxy', description: 'Routes your request.' },
      ],
    },
  );
  assert.equal(parseWorkspaceVisualization('diagram', JSON.stringify({
    type: 'flow',
    title: 'Bad step',
    steps: [{ title: 'Website', description: 12 }, { title: 'Backend', description: 'Process it.' }],
  })), null);
});

test('validates compact timelines and rejects malformed historical event data', () => {
  const timeline = {
    type: 'timeline',
    title: 'Events in the supplied account',
    events: [
      { date: 'Date A', label: 'First event', description: 'From the question' },
      { date: 'Date B', label: 'Second event', description: 'From the question' },
    ],
  };
  assert.deepEqual(parseWorkspaceVisualization('diagram', JSON.stringify(timeline)), {
    kind: 'diagram',
    diagramType: 'timeline',
    title: timeline.title,
    events: timeline.events,
  });
  assert.equal(parseWorkspaceVisualization('diagram', JSON.stringify({
    ...timeline,
    events: [{ date: 'Date A', label: 'Only one' }],
  })), null);
});

test('recognizes all six requested math topics without changing other prompt intent', () => {
  const examples = [
    'Simplify: 3a^2 × 4a^3',
    'Solve: 3/4 + 5/6',
    'Solve: 2x^2 - 7x + 3 = 0',
    'Calculate the hypotenuse of a right-angled triangle with sides 6 cm and 8 cm',
    'Differentiate: f(x)=3x^4-5x^2+7x-9',
    'Find the stationary points and Hessian of f(x,y)=x^3+y^3-3xy+2x^2+2y^2-8x-8y',
  ];

  for (const example of examples) assert.equal(isMathematicsQuestion(example), true, example);
  assert.equal(isMathematicsQuestion('Write a friendly message to my classmate.'), false);
  assert.equal(isMathematicsQuestion('Help me solve this laptop issue.'), false);
  assert.equal(isMathematicsQuestion(null), false);
});

test('validates interactive practice blocks before rendering them', () => {
  assert.deepEqual(parseWorkspacePractice(JSON.stringify({
    question: String.raw`2x^3 \times 5x^2 = ?`,
    solution: String.raw`Multiply 2 and 5, then add exponents: \(10x^5\).`,
  })), {
    question: String.raw`2x^3 \times 5x^2 = ?`,
    solution: String.raw`Multiply 2 and 5, then add exponents: \(10x^5\).`,
  });
  assert.equal(parseWorkspacePractice('{'), null);
  assert.equal(parseWorkspacePractice(JSON.stringify({ question: 'Practice only', solution: '' })), null);
  assert.equal(parseWorkspacePractice(JSON.stringify({
    question: 'q'.repeat(501),
    solution: 'answer',
  })), null);
});

test('accepts supported YouTube URL forms and rejects unrelated or unsafe URLs', () => {
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/watch?v=abcdefghijk&t=12s'), 'abcdefghijk');
  assert.equal(extractYouTubeVideoId('https://youtu.be/abcdefghijk'), 'abcdefghijk');
  assert.equal(extractYouTubeVideoId('https://youtube.com/shorts/abcdefghijk'), 'abcdefghijk');
  assert.equal(extractYouTubeVideoId('https://youtube.com.evil.example/watch?v=abcdefghijk'), null);
  assert.equal(extractYouTubeVideoId('javascript:alert(1)'), null);
  assert.equal(extractYouTubeVideoId('https://youtube.com/watch?v=short'), null);
  assert.equal(
    extractYouTubeUrlFromText('Please summarize https://youtu.be/abcdefghijk?t=30.'),
    'https://www.youtube.com/watch?v=abcdefghijk',
  );
  assert.equal(extractYouTubeUrlFromText('not a YouTube link'), null);
});

test('recognizes YouTube summary and transcript requests', () => {
  assert.equal(isYouTubeSummaryRequest('Please summarize this video'), true);
  assert.equal(isYouTubeSummaryRequest('Can you give me a transcript?'), true);
  assert.equal(isYouTubeSummaryRequest('Find me a video about algebra'), false);
  assert.equal(isYouTubeSummaryRequest(null), false);
});

test('normalizes structured response sections, cautions, and selectable follow-ups', () => {
  const answer = normalizeWorkspaceResponse({
    answer: 'Use this approach.',
    sections: [
      { heading: 'Steps', content: ['First, check the request.', 'Then inspect the response.'] },
    ],
    warnings: ['Do not expose the API key.'],
    followUp: { question: 'Which client?', choices: ['Browser', 'Server'] },
  });
  assert.match(answer, /^Use this approach\./);
  assert.match(answer, /### Steps\n\nFirst, check the request\.\nThen inspect the response\./);
  assert.match(answer, /### Important cautions\n\n- Do not expose the API key\./);
  assert.deepEqual(parseWorkspaceFollowUp(answer).followUp, {
    question: 'Which client?',
    options: ['Browser', 'Server'],
  });
});

test('removes a repeated clarification question without discarding the useful answer', () => {
  const answer = normalizeWorkspaceResponse({
    answer: 'Both sides should be simplified first. Which equation are you solving?',
    followUp: {
      question: 'Which equation are you solving?',
      options: ['Linear', 'Quadratic'],
    },
  });
  const parsed = parseWorkspaceFollowUp(answer);

  assert.equal(parsed.content, 'Both sides should be simplified first.');
  assert.deepEqual(parsed.followUp, {
    question: 'Which equation are you solving?',
    options: ['Linear', 'Quadratic'],
  });
  assert.equal((answer.match(/\[\[FOLLOW_UP:/g) || []).length, 1);
});

test('preserves plain-text response fallbacks when structured data is unavailable', () => {
  assert.equal(normalizeWorkspaceResponse('Plain answer'), 'Plain answer');
  assert.equal(normalizeWorkspaceResponse({ sections: [] }, 'Fallback answer'), 'Fallback answer');
  assert.equal(normalizeWorkspaceResponse({
    sections: [{ title: 'Explanation', text: 'Solar panels convert sunlight to electricity.' }],
  }), '### Explanation\n\nSolar panels convert sunlight to electricity.');
});

test('normalizes direct and wrapped Unsplash image results and rejects invalid sources', () => {
  const first = {
    id: 'photo-1',
    url: 'https://images.unsplash.com/photo-1?auto=format',
    alt: 'Green plant',
    photographer: 'A. Photographer',
    attributionUrl: 'https://unsplash.com/@aphotographer',
  };
  const second = {
    id: 'photo-2',
    url: 'https://images.unsplash.com/photo-2',
    alt: 'Sunlight through leaves',
  };
  const unsafe = { url: 'https://images.unsplash.com.evil.example/photo-3' };

  assert.deepEqual(normalizeWorkspaceImages({ images: [first, unsafe, second] }), [
    {
      id: 'photo-1',
      url: first.url,
      alt: first.alt,
      attribution: first.photographer,
      attributionUrl: first.attributionUrl,
      photoUrl: '',
    },
    {
      id: 'photo-2',
      url: second.url,
      alt: second.alt,
      attribution: '',
      attributionUrl: '',
      photoUrl: '',
    },
  ]);
  assert.deepEqual(normalizeWorkspaceImages({ data: { images: [first] } }), [
    {
      id: 'photo-1',
      url: first.url,
      alt: first.alt,
      attribution: first.photographer,
      attributionUrl: first.attributionUrl,
      photoUrl: '',
    },
  ]);
  assert.deepEqual(normalizeWorkspaceImages({ images: [first, second] }, 1), [
    {
      id: 'photo-1',
      url: first.url,
      alt: first.alt,
      attribution: first.photographer,
      attributionUrl: first.attributionUrl,
      photoUrl: '',
    },
  ]);
  assert.deepEqual(normalizeWorkspaceImages({ success: true, images: [] }), []);
});

test('normalizes native Unsplash search results and wrapped result arrays', () => {
  const nativeImage = {
    id: 'photo-native',
    urls: {
      regular: 'https://images.unsplash.com/photo-native?auto=format&fit=crop&w=1200&q=80',
      small: 'https://images.unsplash.com/photo-native?auto=format&fit=crop&w=400&q=80',
    },
    alt_description: 'A labelled geometry diagram',
    user: {
      name: 'A. Photographer',
      links: { html: 'https://unsplash.com/@aphotographer' },
    },
    links: { html: 'https://unsplash.com/photos/photo-native' },
  };
  const expected = [{
    id: 'photo-native',
    url: nativeImage.urls.regular,
    smallUrl: nativeImage.urls.small,
    alt: nativeImage.alt_description,
    attribution: 'A. Photographer',
    attributionUrl: 'https://unsplash.com/@aphotographer',
    photoUrl: 'https://unsplash.com/photos/photo-native',
  }];

  assert.deepEqual(normalizeWorkspaceImages({ results: [nativeImage] }), expected);
  assert.deepEqual(normalizeWorkspaceImages({ data: { results: [nativeImage] } }), expected);
  assert.deepEqual(normalizeWorkspaceImages([nativeImage]), expected);
  assert.deepEqual(normalizeWorkspaceImages({
    results: [{ ...nativeImage, urls: { regular: 'http://images.unsplash.com/insecure' } }],
  }), []);
});

test('provides general solve-for-X guidance only when an equation is not supplied', () => {
  const guidance = createSolveForXGuidanceResponse('How to solve for X');

  assert.match(guidance, /1\. Simplify both sides/);
  assert.match(guidance, /2\. Move the terms containing X to one side/);
  assert.match(guidance, /3\. Move the constants to the other side/);
  assert.match(guidance, /4\. Divide by the coefficient of X/);
  assert.match(guidance, /5\. Check the answer by substituting it back/);
  assert.equal((guidance.match(/Send me your exact equation/g) || []).length, 1);
  assert.equal(createSolveForXGuidanceResponse('Solve 2x + 5 = 13'), '');
  assert.equal(createSolveForXGuidanceResponse('How do I build a website?'), '');
  assert.equal(createSolveForXGuidanceResponse('Hi, how are you?'), '');
});

test('plans images and videos when the request makes them relevant', () => {
  const foodPlan = createWorkspaceMediaPlan('How do I make crispy fried chicken with rice?');
  assert.equal(foodPlan.category, 'food');
  assert.equal(foodPlan.showImages, true);
  assert.equal(foodPlan.showVideos, true);
  assert.match(foodPlan.imageQuery, /crispy fried chicken rice/i);
  assert.doesNotMatch(foodPlan.imageQuery, /visual reference/i);

  const codePlan = createWorkspaceMediaPlan('Fix this React component: const App = () => <main />;');
  assert.equal(codePlan.category, 'programming-software');
  assert.equal(codePlan.showImages, false);
  assert.equal(codePlan.showVideos, false);
  assert.equal(codePlan.imageQuery, '');
  assert.equal(codePlan.videoQuery, '');

  const logoPlan = createWorkspaceMediaPlan('Show me visual inspiration for a modern delivery company logo.');
  assert.equal(logoPlan.showImages, true);
  assert.equal(logoPlan.showVideos, false);

  const factPlan = createWorkspaceMediaPlan('What is the capital of South Africa?');
  assert.equal(factPlan.showImages, false);
  assert.equal(factPlan.showVideos, false);

  const examplePlan = createWorkspaceMediaPlan('What is compound interest? Show me an example.');
  assert.equal(examplePlan.showImages, false);
  assert.equal(examplePlan.showVideos, true);

  const greetingPlan = createWorkspaceMediaPlan('Hi');
  assert.equal(greetingPlan.showImages, false);
  assert.equal(greetingPlan.showVideos, false);
  assert.equal(greetingPlan.imageQuery, '');

  const smallTalkPlan = createWorkspaceMediaPlan('How are you today?');
  assert.equal(smallTalkPlan.showVideos, false);

  const requestedVideosPlan = createWorkspaceMediaPlan('Find me two videos about compound interest.');
  assert.equal(requestedVideosPlan.showImages, false);
  assert.equal(requestedVideosPlan.showVideos, true);
  assert.equal(requestedVideosPlan.videoQuery, 'compound interest');

  const mathWithoutStockImages = createWorkspaceMediaPlan('Simplify 3a^2 × 4a^3');
  assert.equal(mathWithoutStockImages.showImages, false);
  const explicitMathImage = createWorkspaceMediaPlan('Show me an image of a fraction bar for 3/4.');
  assert.equal(explicitMathImage.showImages, false);

  const educationalVideosPlan = createWorkspaceMediaPlan('Explain photosynthesis and show me useful videos.');
  assert.equal(educationalVideosPlan.showVideos, true);
  assert.equal(educationalVideosPlan.videoQuery, 'photosynthesis');

  const diagramPlan = createWorkspaceMediaPlan('Show me a diagram of how solar panels generate electricity.');
  assert.equal(diagramPlan.showImages, false);
  assert.equal(diagramPlan.showVideos, true);

  const photosynthesisPlan = createWorkspaceMediaPlan('Explain photosynthesis to a 13-year-old.');
  assert.equal(photosynthesisPlan.category, 'education-science-technology');
  assert.equal(photosynthesisPlan.showImages, true);
  assert.equal(photosynthesisPlan.showVideos, true);

  const solarPlan = createWorkspaceMediaPlan('Explain how solar panels generate electricity.');
  assert.equal(solarPlan.showImages, true);
  assert.equal(solarPlan.showVideos, true);

  const startupPlan = createWorkspaceMediaPlan('Help me start a delivery business with no money.');
  assert.equal(startupPlan.showImages, false);
  assert.equal(startupPlan.showVideos, false);

  const websitePlan = createWorkspaceMediaPlan('Give me a tutorial on how to build a website.');
  assert.equal(websitePlan.showImages, false);
  assert.equal(websitePlan.showVideos, true);

  const cvPlan = createWorkspaceMediaPlan('Write a professional CV for an entry-level applicant.');
  assert.equal(cvPlan.showImages, false);
  assert.equal(cvPlan.showVideos, false);

  const cvExamplePlan = createWorkspaceMediaPlan('Show me examples of a strong CV template.');
  assert.equal(cvExamplePlan.showImages, true);
  assert.match(cvExamplePlan.imageQuery, /CV resume template/i);
  assert.equal(cvExamplePlan.showVideos, false);

  const contextPlan = createWorkspaceMediaPlan('Wings', 'user: How do I make crispy fried chicken?\nassistant: Which cut do you have?');
  assert.match(contextPlan.imageQuery, /crispy fried chicken/);
  assert.equal(contextPlan.showImages, true);
  assert.equal(contextPlan.showVideos, true);

  const excelPlan = createWorkspaceMediaPlan('Teach me Excel formulas.');
  assert.equal(excelPlan.showVideos, true);
  assert.match(excelPlan.videoQuery, /Excel formulas/i);

  const heartPlan = createWorkspaceMediaPlan('How does the human heart work?');
  assert.equal(heartPlan.showVideos, true);
  assert.match(heartPlan.videoQuery, /human heart/i);

  const careerPlan = createWorkspaceMediaPlan('Show me how to prepare for a job interview.');
  assert.equal(careerPlan.showVideos, true);
  assert.match(careerPlan.videoQuery, /job interview/i);

  const sectionPlan = createWorkspaceMediaPlan(
    'Explain solar energy.',
  );
  assert.match(sectionPlan.imageQuery, /solar panels sunlight photovoltaic electricity/i);
});

test('builds topic-specific educational photo queries from the requested concept', () => {
  const examples = [
    ['Explain photosynthesis.', /green plant leaves sunlight photosynthesis/i, 'Photosynthesis', 'green plant leaves'],
    ['Explain Newton’s second law.', /car acceleration demonstration driving physics motion blur/i, "Newton's second law of motion", 'car moving on a road'],
    ['Explain water pollution.', /water pollution contaminated river environmental/i, 'Water pollution', 'polluted waterway'],
    ['Explain drought in Limpopo.', /Limpopo South Africa drought dry agricultural land/i, 'Drought in Limpopo', 'dry agricultural land in Limpopo'],
    ['Explain how solar panels generate electricity.', /solar panels sunlight photovoltaic electricity generation/i, 'Solar energy', 'solar panels in sunlight'],
    ['Explain the human circulatory system.', /human heart anatomy circulatory system medical model/i, 'Human circulatory system', 'human heart or circulatory anatomy model'],
  ];

  for (const [prompt, query, topic, mainObject] of examples) {
    const plan = createWorkspaceMediaPlan(prompt);
    assert.equal(plan.showImages, true, prompt);
    assert.equal(plan.educationalPhoto, true, prompt);
    assert.equal(plan.topic, topic, prompt);
    assert.equal(plan.mainObject, mainObject, prompt);
    assert.match(plan.imageQuery, query, prompt);
  }

  const graphRequest = createWorkspaceMediaPlan('Explain drought in Limpopo using a relevant climate graph.');
  assert.equal(graphRequest.showImages, false);
  assert.equal(graphRequest.imageQuery, '');
});

test('ranks educational Unsplash images by topic metadata and rejects portraits and weak matches', () => {
  const plan = createWorkspaceMediaPlan('Explain photosynthesis.');
  const candidates = [
    { id: 'portrait', url: 'portrait', alt: 'Portrait of a woman in sunlight', tags: ['fashion'], attribution: 'Photographer', attributionUrl: 'https://unsplash.com/@photographer' },
    { id: 'plant', url: 'plant', alt: 'Green plant leaves in bright sunlight', width: 1200, height: 800, attribution: 'Photographer', photoUrl: 'https://unsplash.com/photos/plant' },
    { id: 'weak', url: 'weak', alt: 'Green trees beside a path', tags: ['park'], attribution: 'Photographer', photoUrl: 'https://unsplash.com/photos/weak' },
    { id: 'near-duplicate', url: 'near-duplicate', alt: 'Leaves of a plant in sun', width: 800, height: 800, attribution: 'Photographer', photoUrl: 'https://unsplash.com/photos/near-duplicate' },
  ];
  assert.deepEqual(
    selectRelevantWorkspaceImages(candidates, plan, 2).map((image) => image.id),
    ['plant', 'near-duplicate'],
  );
  assert.deepEqual(selectRelevantWorkspaceImages([{
    id: 'uncited',
    url: 'uncited',
    alt: 'Green plant leaves in bright sunlight',
  }], plan), []);
  assert.deepEqual(selectRelevantWorkspaceImages([{
    id: 'empty',
    url: 'empty',
    attribution: 'Photographer',
    photoUrl: 'https://unsplash.com/photos/empty',
  }], plan), []);
});

test('rejects Newton-law stock photos focused on generic scenery', () => {
  const plan = createWorkspaceMediaPlan('Explain Newton’s second law.');
  const result = selectRelevantWorkspaceImages([{
    id: 'scenery',
    url: 'https://images.unsplash.com/scenery',
    alt: 'Mountain scenery with a small car on a winding road',
    tags: ['vehicle', 'road', 'motion'],
    attribution: 'Photographer',
    photoUrl: 'https://unsplash.com/photos/scenery',
  }], plan);
  assert.deepEqual(result, []);
});

test('requires on-topic metadata for each requested educational photograph', () => {
  const examples = [
    ['Explain photosynthesis.', 'Green leaves on a plant in sunlight', ['photosynthesis', 'plant']],
    ['Explain Newton’s second law.', 'A car driving on a road', ['car', 'motion']],
    ['Explain water pollution.', 'Pollution and plastic waste in a river', ['water', 'pollution']],
    ['Explain drought in Limpopo.', 'Dry farmland during a drought in South Africa', ['agriculture', 'drought']],
    ['Explain how solar panels generate electricity.', 'Solar panels in sunlight generating clean energy', ['solar energy', 'electricity']],
    ['Explain the human circulatory system.', 'Human heart anatomy model showing blood circulation', ['anatomy', 'heart']],
  ];

  for (const [prompt, alt, tags] of examples) {
    const plan = createWorkspaceMediaPlan(prompt);
    const images = selectRelevantWorkspaceImages([{
      id: prompt,
      url: 'https://images.unsplash.com/example',
      alt,
      tags,
      attribution: 'Educational photographer',
      attributionUrl: 'https://unsplash.com/@educationalphotographer',
      photoUrl: 'https://unsplash.com/photos/example',
    }], plan);
    assert.equal(images.length, 1, prompt);
  }
});

test('keeps image and video media plans independent', () => {
  const both = createWorkspaceMediaPlan('Explain photosynthesis and show me useful videos.');
  const imagesOnly = createWorkspaceMediaPlan('Show me images of a modern delivery company logo.');
  const videosOnly = createWorkspaceMediaPlan('Find me two videos about compound interest.');
  const none = createWorkspaceMediaPlan('Hi, how are you?');

  assert.deepEqual([both.showImages, both.showVideos], [true, true]);
  assert.deepEqual([imagesOnly.showImages, imagesOnly.showVideos], [true, false]);
  assert.deepEqual([videosOnly.showImages, videosOnly.showVideos], [false, true]);
  assert.deepEqual([none.showImages, none.showVideos], [false, false]);
});

test('plans images and lessons together when both are relevant', () => {
  const both = createWorkspaceMediaPlan('Explain photosynthesis and show me relevant videos.');
  assert.equal(both.showImages, true);
  assert.equal(both.showVideos, true);
});

test('selects up to two distinct YouTube results that match the requested topic', () => {
  const videos = [
    { videoId: 'photosynth1', title: 'Photosynthesis explained for beginners' },
    { videoId: 'unrelated01', title: 'A guide to the solar system' },
    { videoId: 'photosynth1', title: 'Duplicate photosynthesis result' },
    { videoId: 'photosynth2', title: 'How plants make food: photosynthesis' },
  ];

  assert.deepEqual(
    selectRelevantYouTubeLessonVideos(videos, 'Explain photosynthesis to a student'),
    [videos[0], videos[3]],
  );
  assert.deepEqual(
    selectRelevantYouTubeLessonVideos([videos[0]], 'Explain photosynthesis'),
    [videos[0]],
  );
  assert.deepEqual(
    selectRelevantYouTubeLessonVideos([videos[1]], 'Explain photosynthesis'),
    [],
  );
  assert.deepEqual(
    selectRelevantYouTubeLessonVideos([
      { videoId: 'solarwrong1', title: 'The solar system explained' },
      { videoId: 'solarright1', title: 'How solar panels generate electricity' },
    ], 'Explain how solar panels generate electricity'),
    [{ videoId: 'solarright1', title: 'How solar panels generate electricity' }],
  );
});

test('only recommends videos when the reply itself covers their topic', () => {
  assert.equal(
    isWorkspaceVideoRelevantToResponse(
      'Explain photosynthesis to a student',
      'Photosynthesis is how green plants use light to make food.',
    ),
    true,
  );
  assert.equal(
    isWorkspaceVideoRelevantToResponse(
      'Explain solar panels generate electricity',
      'Here is how to prepare for a job interview.',
    ),
    false,
  );
  assert.equal(isWorkspaceVideoRelevantToResponse('job career plan', 'Here are some next steps.'), false);
  assert.equal(isWorkspaceVideoRelevantToResponse('compound interest', ''), false);
});

test('keeps accidental code and machine output out of everyday replies but preserves explicit technical answers', () => {
  const cookingQuestion = 'How do I make fried chicken?';
  const codeAnswer = 'Mix the flour and seasoning.\n\n```js\nconst pan = document.querySelector(\"#pan\");\n```';
  assert.equal(isExplicitTechnicalRequest(cookingQuestion), false);
  assert.doesNotMatch(normalizeWorkspaceAnswerForDisplay(codeAnswer, cookingQuestion), /```|const pan/);
  assert.equal(isExplicitTechnicalRequest('What is a function in mathematics?'), false);
  assert.equal(isExplicitTechnicalRequest('Explain what JavaScript is in simple terms.'), false);
  assert.doesNotMatch(
    normalizeWorkspaceAnswerForDisplay('const pan = document.querySelector(\"#pan\");\npan.addEventListener(\"click\", cook);', cookingQuestion),
    /const pan|addEventListener/,
  );
  assert.equal(isExplicitTechnicalRequest('Write a React component that lists jobs.'), true);
  assert.equal(isExplicitTechnicalRequest('Show me Python code that sorts a list.'), true);
  assert.equal(normalizeWorkspaceAnswerForDisplay(codeAnswer, 'Write JavaScript code for this.'), codeAnswer);
  assert.equal(
    normalizeWorkspaceAnswerForDisplay('Here is the code. [[VISUAL_REFERENCE]]', 'Write JavaScript code for this.'),
    'Here is the code.',
  );
  assert.match(
    normalizeWorkspaceAnswerForDisplay('{"choices":[{"message":{"content":"internal"}}]}', cookingQuestion),
    /plain language/i,
  );
  const mixedQuizJson = normalizeWorkspaceAnswerForDisplay(
    'Water contains hydrogen and oxygen.\n\n{"questions":[{"question":"How many hydrogen atoms?","choices":["1","2"],"correctIndex":1,"explanation":"The subscript gives the count."},{"question":"How many oxygen atoms?","choices":["1","2"],"correctIndex":0,"explanation":"There is one oxygen atom."}]}\n\nEach water molecule has two hydrogen atoms.',
    cookingQuestion,
  );
  assert.match(mixedQuizJson, /Water contains hydrogen and oxygen/);
  assert.match(mixedQuizJson, /Each water molecule has two hydrogen atoms/);
  const mixedQuizBlock = mixedQuizJson.match(/```understanding\n([\s\S]*?)\n```/)?.[1];
  assert.ok(mixedQuizBlock);
  assert.equal(parseWorkspaceUnderstanding(mixedQuizBlock).questions.length, 1);
  const rawQuizJson = normalizeWorkspaceAnswerForDisplay(
    JSON.stringify({ questions: [{ question: 'Choose two', choices: ['1', '2'], correctIndex: 1, explanation: 'Two.' }, { question: 'Choose one', choices: ['1', '2'], correctIndex: 0, explanation: 'One.' }] }),
    cookingQuestion,
  );
  assert.match(rawQuizJson, /^```understanding/);
  assert.equal(parseWorkspaceUnderstanding(rawQuizJson.match(/```understanding\n([\s\S]*?)\n```/)?.[1]).questions.length, 2);
  const malformedQuizJson = normalizeWorkspaceAnswerForDisplay(
    'The answer is explained below.\n{"questions":[{"correctIndex": 1, "choices": [',
    cookingQuestion,
  );
  assert.match(malformedQuizJson, /The answer is explained below/);
  assert.doesNotMatch(malformedQuizJson, /correctIndex|"choices"|questions/);
  const malformedChartJson = normalizeWorkspaceAnswerForDisplay(
    'A chart would help.\n{"type":"multi-line","title":"Derivative","series":[',
    cookingQuestion,
  );
  assert.match(malformedChartJson, /A chart would help/);
  assert.doesNotMatch(malformedChartJson, /multi-line|"series"/);
  assert.match(
    normalizeWorkspaceAnswerForDisplay('Traceback (most recent call last):\n  File \"app.py\"', cookingQuestion),
    /plain language/i,
  );
  const validChart = '```chart\n{\"type\":\"bar\",\"title\":\"Totals\",\"xLabel\":\"Month\",\"yLabel\":\"Count\",\"data\":[{\"label\":\"May\",\"value\":2}]}\n```';
  assert.equal(normalizeWorkspaceAnswerForDisplay(validChart, cookingQuestion), validChart);
  const rawChart = normalizeWorkspaceAnswerForDisplay(
    '{"type":"scatter","title":"A line","xLabel":"x","yLabel":"y","data":[{"x":0,"y":0},{"x":1,"y":1}]}',
    cookingQuestion,
  );
  assert.match(rawChart, /^```chart/);
  assert.equal(parseWorkspaceVisualization('chart', rawChart.match(/```chart\n([\s\S]*?)\n```/)?.[1]).chartType, 'scatter');
  const validPractice = 'Try one yourself:\n\n```practice\n{\"question\":\"2x + 3 = ?\",\"solution\":\"5\"}\n```';
  assert.equal(normalizeWorkspaceAnswerForDisplay(validPractice, cookingQuestion), validPractice);
  assert.doesNotMatch(
    normalizeWorkspaceAnswerForDisplay('```practice\n{\"question\":\"q\"}\n```', cookingQuestion),
    /```practice/,
  );
  assert.equal(normalizeWorkspaceAnswerForDisplay('```chart\n{\"raw\":\"data\"}\n```', cookingQuestion), 'Sorry, I couldn’t format that answer clearly. Please ask again, and I’ll try to explain it in plain language.');
  assert.equal(
    normalizeWorkspaceAnswerForDisplay(
      'Here is the explanation. [[VISUAL_REFERENCE]] [INSERT IMAGE] [DIAGRAM HERE]',
      'Explain photosynthesis.',
    ),
    'Here is the explanation.',
  );
});

test('validates selectable follow-ups and leaves malformed markers as safe text', () => {
  assert.deepEqual(parseWorkspaceFollowUp(
    'I can tailor this further.\n[[FOLLOW_UP: Which version? | Wings | Drumsticks]]',
  ), {
    content: 'I can tailor this further.',
    followUp: { question: 'Which version?', options: ['Wings', 'Drumsticks'] },
  });
  const malformed = '[[FOLLOW_UP: Which version? | only one]]';
  assert.deepEqual(parseWorkspaceFollowUp(malformed), { content: malformed, followUp: null });
  assert.deepEqual(parseWorkspaceFollowUp(null), { content: '', followUp: null });
});
