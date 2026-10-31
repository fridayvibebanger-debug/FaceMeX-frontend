import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractYouTubeUrlFromText,
  extractYouTubeVideoId,
  createSolveForXGuidanceResponse,
  createWorkspaceMediaPlan,
  isExplicitTechnicalRequest,
  isMathematicsQuestion,
  isYouTubeSummaryRequest,
  normalizeWorkspaceAnswerForDisplay,
  normalizeWorkspaceImages,
  normalizeWorkspaceResponse,
  parseWorkspaceFollowUp,
  parseWorkspaceVisualization,
  selectRelevantYouTubeLessonVideos,
} from './workspaceResponse.js';

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
  assert.match(foodPlan.imageQuery, /crispy fried chicken with rice/i);
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

  const educationalVideosPlan = createWorkspaceMediaPlan('Explain photosynthesis and show me useful videos.');
  assert.equal(educationalVideosPlan.showVideos, true);
  assert.equal(educationalVideosPlan.videoQuery, 'photosynthesis');

  const diagramPlan = createWorkspaceMediaPlan('Show me a diagram of how solar panels generate electricity.');
  assert.equal(diagramPlan.showImages, true);
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
  assert.match(sectionPlan.imageQuery, /solar energy/i);
  assert.doesNotMatch(sectionPlan.imageQuery, /photovoltaic cells/i);
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
  assert.match(
    normalizeWorkspaceAnswerForDisplay('{"choices":[{"message":{"content":"internal"}}]}', cookingQuestion),
    /plain language/i,
  );
  assert.match(
    normalizeWorkspaceAnswerForDisplay('Traceback (most recent call last):\n  File \"app.py\"', cookingQuestion),
    /plain language/i,
  );
  const validChart = '```chart\n{\"type\":\"bar\",\"title\":\"Totals\",\"xLabel\":\"Month\",\"yLabel\":\"Count\",\"data\":[{\"label\":\"May\",\"value\":2}]}\n```';
  assert.equal(normalizeWorkspaceAnswerForDisplay(validChart, cookingQuestion), validChart);
  assert.equal(normalizeWorkspaceAnswerForDisplay('```chart\n{\"raw\":\"data\"}\n```', cookingQuestion), 'Sorry, I couldn’t format that answer clearly. Please ask again, and I’ll try to explain it in plain language.');
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
