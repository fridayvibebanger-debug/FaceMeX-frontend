import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatWorkspaceMath,
  parseWorkspaceMarkdown,
  tokenizeWorkspaceInline,
} from './workspaceMarkdown.js';

const photosynthesisAnswer = `# Photosynthesis — in a nutshell

Photosynthesis is the process plants use to convert **light energy** into chemical energy.

## The overall equation

6 CO₂ + 6 H₂O + light energy → C₆H₁₂O₆ + 6 O₂

## Two stages

1. **Light-dependent reactions:** Chlorophyll absorbs light energy. Water molecules are split, releasing oxygen and producing energy-carrying molecules.
2. **Calvin cycle:** Carbon dioxide is used to build sugars, using energy from the first stage.

## Career pathways

| Pathway | What you study | Example role |
| --- | --- | --- |
| Botany | Plant biology and growth | Botanist |
| Agriculture | Crops and food systems | Agronomist |

## Practical next steps

- Observe a plant in sunlight.
- Compare it with a plant kept in shade.

## Resources

Read the [plant biology guide](https://example.org/plants) for more detail.

The equation summarizes the inputs and outputs; the explanation above describes the two stages.`;

test('groups wrapped Markdown text, headings, lists, tables, and code without dropping response content', () => {
  const blocks = parseWorkspaceMarkdown(photosynthesisAnswer);
  assert.equal(blocks[0].type, 'heading');
  assert.deepEqual(blocks[0], { type: 'heading', level: 1, text: 'Photosynthesis — in a nutshell' });
  assert.equal(blocks.find((block) => block.type === 'paragraph')?.text,
    'Photosynthesis is the process plants use to convert **light energy** into chemical energy.');
  assert.deepEqual(blocks.find((block) => block.type === 'list'), {
    type: 'list',
    ordered: true,
    start: 1,
    items: [
      '**Light-dependent reactions:** Chlorophyll absorbs light energy. Water molecules are split, releasing oxygen and producing energy-carrying molecules.',
      '**Calvin cycle:** Carbon dioxide is used to build sugars, using energy from the first stage.',
    ],
  });
  const table = blocks.find((block) => block.type === 'table');
  assert.deepEqual(table.headers, ['Pathway', 'What you study', 'Example role']);
  assert.equal(table.rows.length, 2);
  assert.equal(blocks.filter((block) => block.type === 'heading').length, 6);
  assert.match(blocks.at(-1).text, /explanation above describes the two stages/);

  const variedMarkdown = parseWorkspaceMarkdown([
    'This paragraph continues',
    'on its next source line.',
    '',
    '> A grouped',
    '> quotation.',
    '',
    '[[VISUAL_REFERENCE]]',
    '',
    '1. First',
    '2. Second',
    '',
    '```ts',
    'const answer = 42;',
    '```',
  ].join('\n'));
  assert.equal(variedMarkdown[0].text, 'This paragraph continues on its next source line.');
  assert.deepEqual(variedMarkdown[1], { type: 'quote', text: 'A grouped quotation.' });
  assert.deepEqual(variedMarkdown[2], { type: 'visual-reference' });
  assert.deepEqual(variedMarkdown[3], { type: 'list', ordered: true, start: 1, items: ['First', 'Second'] });
  assert.deepEqual(variedMarkdown[4], { type: 'code', language: 'ts', text: 'const answer = 42;' });
});

test('renders inline emphasis, code, links, images, and mathematical notation as typed tokens', () => {
  assert.deepEqual(
    tokenizeWorkspaceInline('**bold**, *italic*, `code`, [source](https://example.org/a), https://example.org, ![leaf](https://example.org/leaf.png)'),
    [
      { type: 'strong', text: 'bold' },
      { type: 'text', text: ', ' },
      { type: 'emphasis', text: 'italic' },
      { type: 'text', text: ', ' },
      { type: 'code', text: 'code' },
      { type: 'text', text: ', ' },
      { type: 'link', text: 'source', href: 'https://example.org/a' },
      { type: 'text', text: ', ' },
      { type: 'link', text: 'https://example.org', href: 'https://example.org' },
      { type: 'text', text: ', ' },
      { type: 'image', text: 'leaf', href: 'https://example.org/leaf.png' },
    ],
  );
  assert.deepEqual(tokenizeWorkspaceInline('$C_{6}H_{12}O_{6} \\rightarrow O_{2}$'), [
    { type: 'math', text: 'C₆H₁₂O₆ → O₂' },
  ]);
  assert.equal(formatWorkspaceMath('\\(6 CO_{2} + 6 H_{2}O \\rightarrow C_{6}H_{12}O_{6} + 6 O_{2}\\)'),
    '6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂');
});

test('preserves unsupported LaTeX as readable plain text rather than delimiters', () => {
  assert.equal(formatWorkspaceMath('$\\frac{a}{b} \\approx \\sqrt{x}$'), '(a)/(b) ≈ √(x)');
});

test('preserves escaped table pipes and escaped inline math delimiters', () => {
  const [table] = parseWorkspaceMarkdown([
    '| Item | Note |',
    '| --- | --- |',
    '| A | value\\|extra |',
  ].join('\n'));
  assert.deepEqual(table, {
    type: 'table',
    headers: ['Item', 'Note'],
    rows: [['A', 'value|extra']],
  });

  const escapedMath = tokenizeWorkspaceInline(String.raw`escaped \$not math$`);
  assert.ok(escapedMath.every((token) => token.type === 'text'));
  assert.equal(escapedMath.map((token) => token.text).join(''), String.raw`escaped \$not math$`);
});

test('normalizes raw HTML break tags without changing fenced code', () => {
  const blocks = parseWorkspaceMarkdown([
    'First line<br>second line',
    '',
    '| Item | Details |',
    '| --- | --- |',
    '| One | first<br />second |',
    '',
    '```html',
    '<br>',
    '```',
  ].join('\n'));

  assert.equal(blocks[0].text, 'First line second line');
  assert.deepEqual(blocks[1].rows, [['One', 'first second']]);
  assert.equal(blocks[2].text, '<br>');
});

test('formats inline math and keeps unsafe link schemes as ordinary text', () => {
  assert.deepEqual(tokenizeWorkspaceInline('Use \\(x^2 + y^2 = z^2\\), then read example.org/guide.'), [
    { type: 'text', text: 'Use ' },
    { type: 'math', text: 'x² + y² = z²' },
    { type: 'text', text: ', then read ' },
    { type: 'link', text: 'example.org/guide', href: 'https://example.org/guide' },
    { type: 'text', text: '.' },
  ]);
  assert.deepEqual(tokenizeWorkspaceInline('[unsafe](javascript:alert(1))'), [
    { type: 'text', text: '[unsafe](javascript:alert(1))' },
  ]);
});
