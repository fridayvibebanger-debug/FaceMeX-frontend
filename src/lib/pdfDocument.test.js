import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPDFContext, retrievePDFChunks } from './pdfDocument.js';

test('retrieves chunks that match the question and preserves page numbers', () => {
  const chunks = [
    { chunkId: 'p1-c1', pageNumber: 1, text: 'Photosynthesis converts light energy into glucose.' },
    { chunkId: 'p4-c1', pageNumber: 4, text: 'The water cycle includes evaporation and condensation.' },
  ];

  const result = retrievePDFChunks(chunks, 'What happens during photosynthesis?', 3);
  assert.equal(result[0].pageNumber, 1);
  assert.match(formatPDFContext(result), /\[Page 1\]/);
});

test('returns an empty retrieval when no chunks exist', () => {
  assert.deepEqual(retrievePDFChunks([], 'anything'), []);
});
