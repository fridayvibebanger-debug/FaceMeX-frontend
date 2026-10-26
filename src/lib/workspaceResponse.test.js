import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractYouTubeUrlFromText,
  extractYouTubeVideoId,
  createWorkspaceMediaPlan,
  isYouTubeSummaryRequest,
  normalizeWorkspaceResponse,
  parseWorkspaceFollowUp,
  parseWorkspaceVisualization,
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

test('preserves plain-text response fallbacks when structured data is unavailable', () => {
  assert.equal(normalizeWorkspaceResponse('Plain answer'), 'Plain answer');
  assert.equal(normalizeWorkspaceResponse({ sections: [] }, 'Fallback answer'), 'Fallback answer');
  assert.equal(normalizeWorkspaceResponse({
    sections: [{ title: 'Explanation', text: 'Solar panels convert sunlight to electricity.' }],
  }), '### Explanation\n\nSolar panels convert sunlight to electricity.');
});

test('plans relevant images and video lessons for every response intent', () => {
  const foodPlan = createWorkspaceMediaPlan('How do I make crispy fried chicken with rice?');
  assert.equal(foodPlan.category, 'food');
  assert.equal(foodPlan.showImages, true);
  assert.equal(foodPlan.showVideos, true);
  assert.match(foodPlan.imageQuery, /crispy fried chicken with rice/);

  const codePlan = createWorkspaceMediaPlan('Fix this React component: const App = () => <main />;');
  assert.equal(codePlan.category, 'programming-software');
  assert.equal(codePlan.showImages, true);
  assert.equal(codePlan.showVideos, true);
  assert.match(codePlan.imageQuery, /React component/);
  assert.match(codePlan.videoQuery, /React component/);

  const logoPlan = createWorkspaceMediaPlan('Show me visual inspiration for a modern delivery company logo.');
  assert.equal(logoPlan.showImages, true);
  assert.equal(logoPlan.showVideos, true);

  const factPlan = createWorkspaceMediaPlan('What is the capital of South Africa?');
  assert.equal(factPlan.showImages, true);
  assert.equal(factPlan.showVideos, true);
  assert.match(factPlan.imageQuery, /capital of South Africa/);

  const examplePlan = createWorkspaceMediaPlan('What is compound interest? Show me an example.');
  assert.equal(examplePlan.showImages, true);
  assert.equal(examplePlan.showVideos, true);

  const greetingPlan = createWorkspaceMediaPlan('Hi');
  assert.equal(greetingPlan.showImages, true);
  assert.equal(greetingPlan.showVideos, true);
  assert.match(greetingPlan.imageQuery, /Hi/);

  const requestedVideosPlan = createWorkspaceMediaPlan('Find me two videos about compound interest.');
  assert.equal(requestedVideosPlan.showVideos, true);

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
  assert.equal(startupPlan.showImages, true);
  assert.equal(startupPlan.showVideos, true);

  const websitePlan = createWorkspaceMediaPlan('Give me a tutorial on how to build a website.');
  assert.equal(websitePlan.showImages, true);
  assert.equal(websitePlan.showVideos, true);

  const cvPlan = createWorkspaceMediaPlan('Write a professional CV for an entry-level applicant.');
  assert.equal(cvPlan.showImages, true);
  assert.equal(cvPlan.showVideos, true);

  const contextPlan = createWorkspaceMediaPlan('Wings', 'user: How do I make crispy fried chicken?\nassistant: Which cut do you have?');
  assert.match(contextPlan.imageQuery, /crispy fried chicken/);

  const sectionPlan = createWorkspaceMediaPlan(
    'Explain solar energy.',
    '',
    'Solar panels convert sunlight into electricity through photovoltaic cells.\n[[VISUAL_REFERENCE]]',
  );
  assert.match(sectionPlan.imageQuery, /solar energy/i);
  assert.match(sectionPlan.imageQuery, /photovoltaic cells/i);
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
