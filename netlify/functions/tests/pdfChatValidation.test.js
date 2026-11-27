import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_PDF_CHAT_FILE_SIZE,
  validatePDFChatPayload,
} from '../utils/pdfChatValidation.js';

function createPayload(bytes, overrides = {}) {
  return {
    feature: 'pdf_chat',
    messages: [
      { role: 'system', content: 'Answer from the PDF only.' },
      { role: 'user', content: 'Summarize this document.' },
    ],
    attachments: [{
      name: 'study.pdf',
      mimeType: 'application/pdf',
      data: Buffer.from(bytes).toString('base64'),
      ...overrides,
    }],
  };
}

test('accepts one bounded PDF attachment with a PDF signature', () => {
  assert.equal(validatePDFChatPayload(createPayload('%PDF-1.7\ncontent')), null);
});

test('rejects missing attachments, unsupported types, and forged PDF signatures', () => {
  assert.match(
    validatePDFChatPayload({
      feature: 'pdf_chat',
      messages: [{ role: 'user', content: 'Summarize this document.' }],
    }),
    /Upload one PDF/,
  );
  assert.match(
    validatePDFChatPayload(createPayload('%PDF-1.7', { mimeType: 'text/plain' })),
    /must be a PDF/,
  );
  assert.match(validatePDFChatPayload(createPayload('not a PDF')), /valid PDF signature/);
});

test('rejects oversized PDF data', () => {
  const oversized = Buffer.alloc(MAX_PDF_CHAT_FILE_SIZE + 1);
  Buffer.from('%PDF-1.7').copy(oversized);
  assert.match(validatePDFChatPayload(createPayload(oversized)), /no larger than 3 MB/);
});

test('does not alter validation for unrelated AI requests', () => {
  assert.equal(validatePDFChatPayload({ feature: 'career_guidance' }), null);
});

test('rejects invalid conversation structure, excessive messages, and document paths', () => {
  const valid = createPayload('%PDF-1.7\ncontent');
  assert.match(
    validatePDFChatPayload({ ...valid, messages: [{ role: 'user', content: '' }] }),
    /invalid message/,
  );
  assert.match(
    validatePDFChatPayload({
      ...valid,
      messages: Array.from({ length: 13 }, () => ({ role: 'user', content: 'Question' })),
    }),
    /invalid or too large/,
  );
  assert.match(
    validatePDFChatPayload({
      ...valid,
      attachments: [{ ...valid.attachments[0], path: 'private/document.pdf' }],
    }),
    /invalid document details/,
  );
  assert.match(
    validatePDFChatPayload({ ...valid, documentId: 'another-user-document' }),
    /invalid or too large/,
  );
});

test('rejects oversized or malformed message content and conversations not ending in a user question', () => {
  const valid = createPayload('%PDF-1.7\ncontent');
  assert.match(
    validatePDFChatPayload({
      ...valid,
      messages: [{ role: 'user', content: 'x'.repeat(20_001) }],
    }),
    /invalid message/,
  );
  assert.match(
    validatePDFChatPayload({
      ...valid,
      messages: [
        { role: 'assistant', content: 'Previous answer' },
        { role: 'assistant', content: 'No user question' },
      ],
    }),
    /invalid conversation/,
  );
});

test('caps the combined conversation size', () => {
  const valid = createPayload('%PDF-1.7\ncontent');
  assert.match(
    validatePDFChatPayload({
      ...valid,
      messages: [
        { role: 'assistant', content: 'a'.repeat(17_000) },
        { role: 'assistant', content: 'b'.repeat(17_000) },
        { role: 'user', content: 'c'.repeat(17_000) },
      ],
    }),
    /request is too large/,
  );
});
