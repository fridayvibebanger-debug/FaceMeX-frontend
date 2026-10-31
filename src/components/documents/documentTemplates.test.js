import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClassicCvTemplateContent,
  buildDocumentTemplateContent,
  getDocumentTemplate,
  listDocumentTemplates,
} from './documentTemplates.js';
import { renderMarkdownToEditorHtml } from '../../lib/documentMarkdown.js';

test('lists templates for each supported document kind', () => {
  for (const kind of ['cv', 'cover-letter', 'business-plan', 'presentation', 'proposal', 'report', 'meeting-notes']) {
    assert.ok(listDocumentTemplates(kind).length > 0, `expected templates for ${kind}`);
  }
});

test('creative CV template personalizes supplied details without fabricating missing information', () => {
  const template = getDocumentTemplate('cv-creative-lime');
  assert.ok(template);
  const content = buildDocumentTemplateContent(template, {
    fullName: 'Avery Example',
    jobTitle: 'Product Designer',
  });
  assert.match(content, /Avery Example/);
  assert.match(content, /Product Designer/);
  assert.match(content, /\[Add your email\]/);
  assert.match(content, /\| SKILLS & EXPERTISE \| EXPERIENCE \|/);
});

test('classic CV content keeps one name in the page header and omits unavailable details', () => {
  const content = buildClassicCvTemplateContent({
    fullName: 'Avery Example',
    idNumber: 'TEST-ID-1234',
    education: 'Central High School\nMatric, 2018\n\nCommunity College\nCertificate, 2021',
    jobTitle: '',
    summary: '',
    experience: 'Retail assistant, 2020–2022',
    skills: '',
    extras: '',
  });

  assert.match(content, /^## PERSONAL INFORMATION\n\| FIELD \| : \| VALUE \|\n\| --- \| --- \| --- \|\n\| Identity number \| : \| TEST-ID-1234 \|/);
  assert.ok(content.indexOf('## EDUCATIONAL QUALIFICATIONS') > content.indexOf('## PERSONAL INFORMATION'));
  assert.ok(content.indexOf('## EXPERIENCE') > content.indexOf('## EDUCATIONAL QUALIFICATIONS'));
  assert.match(content, /\| Education \| : \| Central High School \|\n\|  \| : \| Matric, 2018 \|\n\|  \| : \| Community College \|\n\|  \| : \| Certificate, 2021 \|/);
  assert.doesNotMatch(content, /Avery Example|PROFESSIONAL TITLE|PROFESSIONAL SUMMARY|\[Add/i);
});

test('classic CV content is empty when no candidate details are available', () => {
  assert.equal(buildClassicCvTemplateContent({}), '');
});

test('classic CV content preserves multiple user-provided references', () => {
  const content = buildClassicCvTemplateContent({
    references: 'Jordan Example | Manager | Example Org | jordan@example.com\nCasey Example | Colleague | Sample Co | casey@example.com',
  });

  assert.match(content, /## REFERENCES/);
  assert.match(content, /Jordan Example \| Manager \| Example Org \| jordan@example\.com/);
  assert.match(content, /Casey Example \| Colleague \| Sample Co \| casey@example\.com/);
});

test('classic CV detail rows render as aligned three-column editor tables', () => {
  const content = buildClassicCvTemplateContent({
    idNumber: 'TEST-ID-1234',
    education: 'Central High School\nMatric, 2018',
  });
  const html = renderMarkdownToEditorHtml(content);

  assert.match(html, /<td style="text-align: left">Identity number<\/td><td style="text-align: left">:<\/td><td style="text-align: left">TEST-ID-1234<\/td>/);
  assert.match(html, /<td style="text-align: left">Education<\/td><td style="text-align: left">:<\/td><td style="text-align: left">Central High School<\/td>/);
  assert.match(html, /<td style="text-align: left"><\/td><td style="text-align: left">:<\/td><td style="text-align: left">Matric, 2018<\/td>/);
});

test('presentation and proposal templates keep editable slide and table structures', () => {
  const pitch = getDocumentTemplate('presentation-pitch');
  const proposal = getDocumentTemplate('proposal-budget');
  assert.ok(pitch);
  assert.ok(proposal);
  assert.match(pitch.content, /## SLIDE 09 — NEXT STEPS/);
  assert.match(proposal.content, /\| ITEM \| BASIS \/ NOTES \| AMOUNT \|/);
});
