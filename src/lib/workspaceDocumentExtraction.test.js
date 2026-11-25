import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import {
  extractWorkspaceDocumentText,
  MAX_WORKSPACE_DOCUMENT_TEXT_LENGTH,
} from './workspaceDocumentExtraction.js';

function createFile(name, content) {
  return {
    name,
    text: async () => content,
    arrayBuffer: async () => content,
  };
}

async function createZipFile(name, files) {
  const archive = new JSZip();
  Object.entries(files).forEach(([path, content]) => archive.file(path, content));
  const content = await archive.generateAsync({ type: 'nodebuffer' });
  return { name, arrayBuffer: async () => content };
}

test('extracts text files and marks content that exceeds the analysis limit', async () => {
  const result = await extractWorkspaceDocumentText(
    createFile('notes.txt', 'A'.repeat(MAX_WORKSPACE_DOCUMENT_TEXT_LENGTH + 20)),
  );

  assert.ok(result.startsWith('A'.repeat(MAX_WORKSPACE_DOCUMENT_TEXT_LENGTH)));
  assert.match(result, /\[Document text truncated for analysis\.\]$/);
});

test('extracts paragraphs from DOCX XML and decodes entities', async () => {
  const file = await createZipFile('notes.docx', {
    'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>Plan &amp; practice</w:t></w:r></w:p><w:p><w:r><w:t>Next step</w:t></w:r></w:p></w:body></w:document>',
  });

  assert.equal(await extractWorkspaceDocumentText(file), 'Plan & practice\nNext step');
});

test('extracts shared-string and inline values from XLSX worksheets', async () => {
  const file = await createZipFile('plan.xlsx', {
    'xl/sharedStrings.xml': '<sst><si><t>Revenue</t></si><si><t>R1,000</t></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row><c r="A2" t="inlineStr"><is><t>Target</t></is></c><c r="B2"><v>1500</v></c></row></sheetData></worksheet>',
  });

  assert.equal(
    await extractWorkspaceDocumentText(file),
    'Sheet 1\nA1: Revenue | B1: R1,000\nA2: Target | B2: 1500',
  );
});

test('explains why legacy Word documents cannot be analyzed', async () => {
  await assert.rejects(
    extractWorkspaceDocumentText(createFile('legacy.doc', 'binary')),
    /Save the document as \.docx or PDF/,
  );
});
