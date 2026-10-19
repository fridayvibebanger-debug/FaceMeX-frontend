import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseMarkdownTable, renderMarkdownToEditorHtml } from './documentMarkdown.js';

test('converts document markdown into editor-ready headings, lists, and emphasis', () => {
  const html = renderMarkdownToEditorHtml(
    '# Summary\n\nA **clear** summary with ==one highlight==.\n\n1. First step\n2. Second step'
  );

  assert.match(html, /<h1>Summary<\/h1>/);
  assert.match(html, /<strong>clear<\/strong>/);
  assert.match(html, /<mark[^>]*>one highlight<\/mark>/);
  assert.match(html, /<ol><li>First step<\/li><li>Second step<\/li><\/ol>/);
});

test('converts markdown comparison tables into real editor table markup', () => {
  const html = renderMarkdownToEditorHtml(
    '| Plan | Price |\n|:---|---:|\n| Basic | $0 |\n| Plus | $5 |'
  );

  assert.match(html, /<table><thead><tr>/);
  assert.match(html, /<th style="text-align: left">Plan<\/th>/);
  assert.match(html, /<th style="text-align: right">Price<\/th>/);
  assert.match(html, /<td style="text-align: right">\$5<\/td>/);
  assert.match(html, /<\/tbody><\/table>/);
});

test('parses escaped pipes and pads short rows without losing columns', () => {
  assert.deepEqual(
    parseMarkdownTable('| Name | Notes | Count |', '| --- | :---: | ---: |', ['| FaceMeX | A \\| B | 2 |', '| Plus | |']),
    {
      headers: ['Name', 'Notes', 'Count'],
      alignments: ['left', 'center', 'right'],
      rows: [['FaceMeX', 'A | B', '2'], ['Plus', '', '']],
    },
  );
});

test('escapes HTML and preserves code blocks as text', () => {
  const html = renderMarkdownToEditorHtml(
    'Use <script>alert(1)</script>.\n\n```html\n<img src=x onerror=alert(1)>\n```'
  );

  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<pre><code>&lt;img src=x onerror=alert\(1\)&gt;<\/code><\/pre>/);
});

test('keeps slide page breaks while converting markdown', () => {
  const html = renderMarkdownToEditorHtml('# SLIDE 1\n\n## SLIDE 2', true);
  assert.match(html, /<div data-page-break="true"><\/div>/);
});

test('rejects invalid markdown table separators', () => {
  assert.equal(parseMarkdownTable('| A | B |', '| -- | no |'), null);
});
