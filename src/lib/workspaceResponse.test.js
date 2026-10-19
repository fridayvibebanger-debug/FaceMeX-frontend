import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractYouTubeUrlFromText,
  extractYouTubeVideoId,
  isYouTubeSummaryRequest,
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
