import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyDocumentEditIntent,
  normalizeDocumentDesign,
  parseDocumentAIResponse,
} from './documentAiPolicy.js';

test('classifies whole-document enhancement across document types', () => {
  for (const request of [
    'Improve this CV',
    'Make my report professional',
    'Redesign the proposal',
    'Make this meeting notes document more modern',
    'Make my portfolio investor-ready',
  ]) {
    assert.equal(classifyDocumentEditIntent(request), 'full', request);
  }
});

test('keeps focused content requests from triggering a redesign', () => {
  for (const request of [
    'Fix my professional summary',
    'Correct grammar in this report',
    'Change the title',
    'Keep the design but improve the wording',
  ]) {
    assert.equal(classifyDocumentEditIntent(request), 'targeted', request);
  }
});

test('parses clarifications and full-document responses without inventing defaults', () => {
  assert.deepEqual(
    parseDocumentAIResponse('```json\n{"clarification":"Which role are you targeting?"}\n```'),
    { type: 'clarification', message: 'Which role are you targeting?' },
  );
  assert.deepEqual(
    parseDocumentAIResponse('{"wholeDocument":true,"replacementBody":"# Report","design":{"template":"classic"}}'),
    { type: 'whole', body: '# Report', explanation: '', design: { template: 'classic' } },
  );
  assert.equal(parseDocumentAIResponse('not JSON'), null);
});

test('accepts only supported document presentation settings', () => {
  assert.deepEqual(
    normalizeDocumentDesign({
      template: 'executive',
      font: 'serif',
      alignment: 'left',
      orientation: 'landscape',
      pageMargin: 'wide',
      externalCss: 'url',
    }),
    { template: 'executive', font: 'serif', alignment: 'left', orientation: 'landscape', pageMargin: 'wide' },
  );
});
