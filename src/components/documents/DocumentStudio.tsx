import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlignmentType, BorderStyle, Document, HeadingLevel, PageBreak as DocxPageBreak, Packer, Paragraph, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, TextRun, WidthType } from 'docx';
import {
  Download,
  ArrowUp,
  X,
  Save,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension, Node as TiptapNode } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { getDocument, saveDocument, type PersistedDocument } from '@/lib/documents';
import { parseMarkdownTable, renderMarkdownToEditorHtml } from '@/lib/documentMarkdown';
import { useUserStore } from '@/store/userStore';
import SensitiveContentShield from '@/components/safety/SensitiveContentShield';
import EditorToolbar from './EditorToolbar';
import { APPEARANCE_CHANGE_EVENT, getAppearanceMode, type AppearanceMode } from '@/lib/appearance';
import DocumentTemplateGallery from './DocumentTemplateGallery';
import {
  buildClassicCvTemplateContent,
  buildDocumentTemplateContent,
  getDocumentTemplate,
} from './documentTemplates';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const DOCUMENT_AI_DAILY_LIMIT = 3;
const DOCUMENT_AI_USAGE_EVENT = 'facemex:document-ai-usage';
type DocumentAnalyticsAction = 'generation' | 'edit' | 'save' | 'export';
type DocumentAnalyticsOutcome = 'started' | 'succeeded' | 'failed';

function trackDocumentEvent(action: DocumentAnalyticsAction, outcome: DocumentAnalyticsOutcome) {
  void trackEvent(`document_${action}_${outcome}`, undefined, { intent: `document_${action}` });
}

function getDocumentAIUsageKey(userId: string | null | undefined, date = new Date()) {
  const day = date.toLocaleDateString('en-CA');
  return `facemex_document_ai_usage_${userId || 'signed-out'}_${day}`;
}

function readDocumentAIUsage(userId: string | null | undefined) {
  try {
    const value = Number(window.localStorage.getItem(getDocumentAIUsageKey(userId)) || 0);
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return null;
  }
}

export type DocumentKind =
  | 'cv'
  | 'cover-letter'
  | 'portfolio'
  | 'bio'
  | 'linkedin-profile'
  | 'portfolio-website'
  | 'business-plan'
  | 'presentation'
  | 'proposal'
  | 'report'
  | 'meeting-notes';
type TemplateKey = 'classic' | 'modern' | 'minimal' | 'executive';
type FontKey = 'sans' | 'serif' | 'mono';
type PageOrientation = 'portrait' | 'landscape';
type ZoomLevel = number;

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  idNumber: string;
  jobTitle: string;
  company: string;
  summary: string;
  experience: string;
  skills: string;
  education: string;
  references: string;
  extras: string;
  portfolio?: string;
  bio?: string;
  linkedinHeadline?: string;
  linkedinSummary?: string;
};

type Props = {
  kind: DocumentKind;
  documentId?: string;
  documentName?: string;
  projectId?: string | null;
  onDocumentSaved?: (document: PersistedDocument) => void;
  embeddedWorkspace?: boolean;
};

const templates: Array<{ key: TemplateKey; label: string; description: string }> = [
  { key: 'modern', label: 'Modern', description: 'Clean accent bar and clear hierarchy.' },
  { key: 'classic', label: 'Classic', description: 'Traditional formal application layout.' },
  { key: 'minimal', label: 'Minimal', description: 'Quiet, spacious and easy to scan.' },
  { key: 'executive', label: 'Executive', description: 'Bold header for senior applications.' },
];

const emptyForm: FormState = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  idNumber: '',
  jobTitle: '',
  company: '',
  summary: '',
  experience: '',
  skills: '',
  education: '',
  references: '',
  extras: '',
};

function renderDocumentInlineMarkdown(text: string) {
  const parts: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|==([^=]+)==|`([^`]+)`|\*([^*]+)\*|_([^_]+)_/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    if (match[1] && match[2]) {
      parts.push(
        <a key={`link-${key++}`} href={match[2]} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {match[1]}
        </a>
      );
    } else if (match[3]) {
      parts.push(<strong key={`bold-${key++}`} className="font-semibold">{match[3]}</strong>);
    } else if (match[4]) {
      parts.push(<strong key={`bold-${key++}`} className="font-semibold">{match[4]}</strong>);
    } else if (match[5]) {
      parts.push(<s key={`strike-${key++}`}>{match[5]}</s>);
    } else if (match[6]) {
      parts.push(<mark key={`highlight-${key++}`} className="rounded bg-amber-200/80 px-0.5 text-slate-900">{match[6]}</mark>);
    } else if (match[7]) {
      parts.push(<code key={`code-${key++}`} className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-[0.9em] lg:bg-white/10">{match[7]}</code>);
    } else if (match[8] || match[9]) {
      parts.push(<em key={`italic-${key++}`}>{match[8] || match[9]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderDocumentMarkdown(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) continue;

    if (index + 1 < lines.length) {
      const table = parseMarkdownTable(line, lines[index + 1].trim());
      if (table) {
        const rows = [...table.rows];
        index += 2;
        while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
          const parsed = parseMarkdownTable(line, lines[index + 1]?.trim() || '');
          if (!parsed) {
            rows.push(...parseMarkdownTable(line, lines[index + 1]?.trim() || '')?.rows || []);
            break;
          }
          index += 1;
        }
        blocks.push(
          <div key={`table-${index}`} className="my-3 max-w-full overflow-x-auto rounded-xl border border-current/15">
            <table className="min-w-[420px] w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  {table.headers.map((header, cellIndex) => (
                    <th key={cellIndex} scope="col" style={{ textAlign: table.alignments[cellIndex] }} className="border-b border-current/15 bg-black/[0.04] px-3 py-2 font-semibold lg:bg-white/[0.06]">
                      {renderDocumentInlineMarkdown(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-current/10 last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} style={{ textAlign: table.alignments[cellIndex] }} className="px-3 py-2 align-top">
                        {renderDocumentInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push(
        <pre key={`code-block-${index}`} className="my-3 max-w-full overflow-x-auto rounded-xl bg-black/[0.06] p-3 font-mono text-[13px] leading-6 lg:bg-white/[0.06]">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const headingClass = heading[1].length === 1
        ? 'text-xl'
        : heading[1].length === 2
          ? 'text-lg'
          : 'text-base';
      blocks.push(
        <h3 key={`heading-${index}`} className={`mt-4 ${headingClass} font-semibold tracking-tight first:mt-0`}>
          {renderDocumentInlineMarkdown(heading[2])}
        </h3>
      );
      continue;
    }

    if (/^[-*_]{3,}$/.test(line)) {
      blocks.push(<hr key={`rule-${index}`} className="my-3 border-0 border-t border-current/15" />);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      blocks.push(
        <blockquote key={`quote-${index}`} className="border-l-2 border-current/25 pl-3 text-foreground/70">
          {renderDocumentInlineMarkdown(quote[1])}
        </blockquote>
      );
      continue;
    }

    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) {
      const items = [numbered[1]];
      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim().match(/^\d+[.)]\s+(.+)$/);
        if (!next) break;
        items.push(next[1]);
        index += 1;
      }
      blocks.push(
        <ol key={`ordered-${index}`} className="my-2 list-decimal space-y-1 pl-6 marker:font-medium">
          {items.map((item, itemIndex) => <li key={itemIndex} className="pl-1">{renderDocumentInlineMarkdown(item)}</li>)}
        </ol>
      );
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      const items = [bullet[1]];
      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim().match(/^[-*•]\s+(.+)$/);
        if (!next) break;
        items.push(next[1]);
        index += 1;
      }
      blocks.push(
        <ul key={`unordered-${index}`} className="my-2 list-disc space-y-1 pl-6 marker:text-current/60">
          {items.map((item, itemIndex) => <li key={itemIndex} className="pl-1">{renderDocumentInlineMarkdown(item)}</li>)}
        </ul>
      );
      continue;
    }

    blocks.push(
      <p key={`paragraph-${index}`} className="my-2 first:mt-0 last:mb-0">
        {renderDocumentInlineMarkdown(line)}
      </p>
    );
  }

  return <div className="space-y-2 text-[15px] leading-7">{blocks}</div>;
}

function buildLocalCv(form: FormState, classic = false) {
  if (!classic) {
    return [
      form.fullName,
      form.jobTitle || 'Professional Title',
      [form.email, form.phone, form.location].filter(Boolean).join(' · ') || '[ADD YOUR CONTACT DETAILS]',
      '',
      'PROFESSIONAL SUMMARY',
      form.summary || '[ADD A PROFESSIONAL SUMMARY BASED ON YOUR REAL GOALS AND EXPERIENCE]',
      '',
      'EXPERIENCE',
      form.experience || '[ADD YOUR REAL WORK, PROJECT, VOLUNTEERING, OR PRACTICAL EXPERIENCE]',
      '',
      'SKILLS',
      form.skills || '[ADD SKILLS YOU CAN GENUINELY DEMONSTRATE]',
      '',
      'EDUCATION',
      form.education || '[ADD YOUR EDUCATION, CERTIFICATES, OR TRAINING]',
      '',
      'ADDITIONAL INFORMATION',
      form.extras || '[ADD LANGUAGES, LINKS, ACHIEVEMENTS, OR REFERENCES YOU CAN VERIFY]',
    ].join('\n');
  }

  const entries = (value: string) => value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  const entryTable = (value: string, emptyLabel: string, kind: 'education' | 'experience' | 'references') => {
    const rows = entries(value).map((entry) => {
      const columns = entry.split('|').map((column) => column.trim()).filter(Boolean);
      const splitAt = columns.length >= 3 ? 2 : 1;
      const left = columns.length > 1 ? columns.slice(0, splitAt).join(' · ') : '';
      const right = columns.length > 1 ? columns.slice(splitAt).join(' · ') : entry;
      return `<tr><td>${escapeHtml(left)}</td><td>${escapeHtml(right)}</td></tr>`;
    });
    const leftLabel = kind === 'references' ? 'Name / position' : 'Dates / institution';
    const placeholder = `<tr><td><em>[${leftLabel}]</em></td><td><em>[${escapeHtml(emptyLabel)}]</em></td></tr>`;
    return `<table><tbody>${rows.length ? rows.join('') : placeholder}</tbody></table>`;
  };
  const skills = entries(form.skills).map((skill) => `<li>${escapeHtml(skill.replace(/^[-*•]\s*/, ''))}</li>`);
  const skillSplit = Math.ceil(skills.length / 2);
  const skillColumns = [skills.slice(0, skillSplit), skills.slice(skillSplit)];
  const skillsMarkup = `<table><tbody><tr>${skillColumns
    .map((column, index) => `<td>${column.length ? `<ul>${column.join('')}</ul>` : !skills.length && index === 0 ? '<p><em>[Demonstrable skill]</em></p>' : '<p></p>'}</td>`)
    .join('')}</tr></tbody></table>`;
  const section = (heading: string, body: string) => `<h2>${heading}</h2>${body}`;

  return [
    section('PROFESSIONAL SUMMARY', `<p>${form.summary.trim() ? escapeHtml(form.summary.trim()).replace(/\r?\n/g, '<br>') : '<em>[Professional summary]</em>'}</p>`),
    section('EDUCATION', entryTable(form.education, 'Qualification and institution', 'education')),
    section('EXPERIENCE', entryTable(form.experience, 'Role and verified responsibilities', 'experience')),
    section('SKILLS', skillsMarkup),
    section('REFERENCES', entryTable(form.references, 'Organisation and contact details', 'references')),
    ...(form.extras.trim()
      ? [section('ADDITIONAL INFORMATION', `<p>${escapeHtml(form.extras.trim()).replace(/\r?\n/g, '<br>')}</p>`)]
      : []),
  ].join('');
}

function buildLocalLetter(form: FormState) {
  return [
    form.fullName || 'Your Name',
    [form.email, form.phone, form.location].filter(Boolean).join(' · ') || '[ADD YOUR CONTACT DETAILS]',
    '',
    form.company ? `Dear Hiring Manager at ${form.company},` : 'Dear Hiring Manager,',
    '',
    `I am writing to apply for the ${form.jobTitle || 'available position'} opportunity${form.company ? ` at ${form.company}` : ''}.`,
    '',
    form.summary || '[EXPLAIN YOUR RELEVANT EXPERIENCE AND WHAT YOU CAN OFFER]',
    '',
    form.extras || '[ADD WHY YOU ARE A GOOD MATCH, USING GENUINE EXAMPLES]',
    '',
    'Thank you for considering my application.',
    '',
    'Sincerely,',
    form.fullName || '[Your Name]',
  ].join('\n');
}

function buildLocalPortfolio(form: FormState) {
  return [
    'PORTFOLIO',
    form.fullName || 'Portfolio Title',
    '',
    'ABOUT',
    form.summary || '[ADD A BRIEF DESCRIPTION OF YOUR WORK AND EXPERTISE]',
    '',
    'FEATURED PROJECTS',
    form.experience || '[ADD YOUR FEATURED PROJECTS, CASE STUDIES, OR WORK SAMPLES]',
    '',
    'SKILLS & EXPERTISE',
    form.skills || '[ADD SKILLS AND EXPERTISE YOU CAN DEMONSTRATE]',
    '',
    'LINKS & CONTACT',
    form.extras || '[ADD PORTFOLIO LINKS AND CONTACT INFORMATION]',
  ].join('\n');
}

function buildLocalBio(form: FormState) {
  return [
    'PROFESSIONAL BIOGRAPHY',
    form.fullName || 'Your Name',
    form.jobTitle || 'Professional Title',
    '',
    'ABOUT',
    form.summary || '[WRITE A PROFESSIONAL BIO USING YOUR REAL EXPERTISE AND ACHIEVEMENTS]',
    '',
    'BACKGROUND',
    form.education || '[DESCRIBE YOUR EDUCATION AND PROFESSIONAL JOURNEY]',
    '',
    'EXPERTISE',
    form.skills || '[HIGHLIGHT SKILLS AND EXPERTISE YOU CAN SUPPORT WITH EXAMPLES]',
    '',
    'CONTACT',
    form.extras || '[ADD CONTACT INFORMATION AND PROFESSIONAL LINKS]',
  ].join('\n');
}

function buildLocalLinkedInProfile(form: FormState) {
  return [
    form.fullName || 'Your Name',
    form.jobTitle || 'Professional Headline',
    '',
    'ABOUT',
    form.summary || '[DESCRIBE YOUR REAL BACKGROUND, SKILLS, AND CAREER GOALS]',
    '',
    'EXPERIENCE',
    form.experience || '[ADD YOUR WORK EXPERIENCE, RESPONSIBILITIES, AND VERIFIED ACHIEVEMENTS]',
    '',
    'SKILLS',
    form.skills || '[LIST PROFESSIONAL SKILLS YOU CAN DEMONSTRATE]',
    '',
    'EDUCATION',
    form.education || '[ADD YOUR EDUCATIONAL BACKGROUND]',
  ].join('\n');
}

function buildLocalPortfolioWebsite(form: FormState) {
  return [
    'PORTFOLIO WEBSITE',
    form.fullName || 'Your Name',
    '',
    'HERO SECTION',
    form.jobTitle || 'Add your professional tagline or headline',
    '',
    'ABOUT ME',
    form.summary || '[TELL YOUR STORY USING YOUR OWN BACKGROUND AND MOTIVATIONS]',
    '',
    'SERVICES / EXPERTISE',
    form.skills || '[DESCRIBE SERVICES OR EXPERTISE YOU ACTUALLY OFFER]',
    '',
    'PORTFOLIO / WORK',
    form.experience || '[SHOWCASE YOUR WORK AND ACCURATE RESULTS]',
    '',
    'CONTACT',
    form.extras || 'Add contact information and call-to-action.',
  ].join('\n');
}

function buildLocalBusinessPlan(form: FormState) {
  return [
    form.company || form.fullName || 'Business Plan',
    form.jobTitle || 'Business plan',
    '',
    'EXECUTIVE SUMMARY',
    form.summary || '[Explain the business, customer, value proposition, and goals.]',
    '',
    'PROBLEM & OPPORTUNITY',
    form.experience || '[Describe the customer problem and evidence of demand.]',
    '',
    'PRODUCTS & SERVICES',
    form.skills || '[Describe the product or service and how it creates value.]',
    '',
    'TARGET MARKET & COMPETITION',
    '[Define target customers, market size assumptions, alternatives, and differentiation.]',
    '',
    'BUSINESS MODEL & PRICING',
    '[Explain revenue streams, pricing, and unit economics.]',
    '',
    'MARKETING & SALES',
    '[Describe positioning, channels, customer acquisition, and retention.]',
    '',
    'OPERATIONS & TEAM',
    form.education || '[Describe key operations, capabilities, roles, and partners.]',
    '',
    'FINANCIAL PLAN',
    form.extras || '[Add verified startup costs, assumptions, forecasts, and funding needs.]',
    '',
    'MILESTONES, RISKS & NEXT STEPS',
    '[List measurable milestones, key risks, mitigations, and immediate actions.]',
  ].join('\n');
}

function buildLocalPresentation(form: FormState) {
  return [
    form.fullName || 'Presentation title',
    form.jobTitle || '[Audience or subtitle]',
    '',
    'SLIDE 01 — TITLE',
    form.summary || '[State the core idea in one sentence.]',
    '',
    'SLIDE 02 — THE OPPORTUNITY',
    form.experience || '[Describe the need, audience, or challenge.]',
    '',
    'SLIDE 03 — THE SOLUTION',
    form.skills || '[Explain your solution and why it works.]',
    '',
    'SLIDE 04 — EVIDENCE & IMPACT',
    '[Add verified data, examples, customer insight, or proof points.]',
    '',
    'SLIDE 05 — PLAN & TIMELINE',
    form.education || '[Show the key phases, owners, and milestones.]',
    '',
    'SLIDE 06 — RESOURCES & ASK',
    form.extras || '[State the budget, support, or decision you need.]',
    '',
    'SLIDE 07 — NEXT STEPS',
    '[Close with actions, owner, and timing.]',
  ].join('\n');
}

function buildLocalProposal(form: FormState) {
  return [
    form.company || form.fullName || 'Project Proposal',
    form.jobTitle || 'Proposal',
    '',
    'EXECUTIVE SUMMARY',
    form.summary || '[Summarize the need, proposed solution, and expected value.]',
    '',
    'BACKGROUND & NEED',
    form.experience || '[Describe the current situation and why action is needed.]',
    '',
    'OBJECTIVES & SUCCESS MEASURES',
    form.skills || '[List measurable outcomes and how success will be evaluated.]',
    '',
    'PROPOSED APPROACH & SCOPE',
    '[Describe the work included, exclusions, assumptions, and methodology.]',
    '',
    'DELIVERABLES & TIMELINE',
    form.education || '[List deliverables, phases, dates, and responsibilities.]',
    '',
    'BUDGET & RESOURCES',
    form.extras || '[Add cost assumptions, required resources, and payment terms.]',
    '',
    'RISKS & MITIGATIONS',
    '[Identify material risks and practical mitigations.]',
    '',
    'NEXT STEPS',
    '[Specify the decision needed, owner, and target date.]',
  ].join('\n');
}

function buildLocalReport(form: FormState) {
  return [
    form.fullName || 'Report title',
    form.jobTitle || 'Prepared for [audience]',
    '',
    'EXECUTIVE SUMMARY',
    form.summary || '[Summarize the purpose, key findings, and recommended action.]',
    '',
    'BACKGROUND & OBJECTIVES',
    form.experience || '[Describe context, scope, and the questions this report addresses.]',
    '',
    'METHOD & SOURCES',
    form.education || '[Record the method, dates, data, and sources used.]',
    '',
    'FINDINGS',
    form.skills || '[Present evidence-based findings. Cite sources where available.]',
    '',
    'ANALYSIS',
    '[Explain implications, limitations, and alternative interpretations.]',
    '',
    'RECOMMENDATIONS',
    form.extras || '[List practical recommendations with owners and priorities.]',
    '',
    'APPENDIX & REFERENCES',
    '[Add supporting tables, definitions, and source references.]',
  ].join('\n');
}

function buildLocalMeetingNotes(form: FormState) {
  return [
    form.fullName || 'Meeting notes',
    form.jobTitle || '[Meeting name]',
    '',
    'MEETING DETAILS',
    form.company || '[Date, time, location, facilitator]',
    '',
    'ATTENDEES',
    form.extras || '[List attendees and their roles.]',
    '',
    'OBJECTIVE & AGENDA',
    form.summary || '[State the meeting objective and agenda.]',
    '',
    'DISCUSSION NOTES',
    form.experience || '[Capture key discussion points and context.]',
    '',
    'DECISIONS',
    form.skills || '[Record decisions and any rationale.]',
    '',
    'ACTION ITEMS',
    form.education || '[Action — owner — due date — status]',
    '',
    'NEXT MEETING',
    '[Add proposed date and preparation needed.]',
  ].join('\n');
}

class InvalidDocumentContentError extends Error {}

function looksLikeHtml(value: string) {
  return /<(?:!doctype|html|head|body|style|script|iframe|object|embed|p|div|h[1-6]|ul|ol|li|table|section|article|pre|blockquote)\b/i.test(value);
}

function isNotFoundHtmlPage(value: string) {
  if (!looksLikeHtml(value)) return false;
  const parsed = new DOMParser().parseFromString(value, 'text/html');
  const bodyText = parsed.body.textContent || '';
  return /page\s+not\s+found/i.test(parsed.title) ||
    (/page\s+not\s+found/i.test(bodyText) && /<!doctype|<html\b|<head\b|<style\b/i.test(value));
}

function getSafeDocumentErrorMessage(error: unknown) {
  if (error instanceof InvalidDocumentContentError) return error.message;
  const message = error instanceof Error ? error.message : '';
  if (looksLikeHtml(message) || /page\s+not\s+found/i.test(message)) {
    return 'The document service returned an error page instead of document content. Your current document was kept unchanged.';
  }
  return message || 'Please check your connection and try again.';
}

function createEditorHtml(text: string, slides = false, parseMarkdown = false) {
  const source = text.trim();
  if (parseMarkdown) return renderMarkdownToEditorHtml(source, slides);
  const decodedSource = (() => {
    const decoder = document.createElement('textarea');
    decoder.innerHTML = source;
    return decoder.value.trim();
  })();

  if (!looksLikeHtml(source) && looksLikeHtml(decodedSource)) {
    return createEditorHtml(decodedSource, slides);
  }

  if (looksLikeHtml(source)) {
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    const bodyText = parsed.body.textContent || '';
    if (isNotFoundHtmlPage(source)) {
      throw new InvalidDocumentContentError('The document service returned a “Page not found” page instead of document content.');
    }

    const decodedBodyText = bodyText.trim();
    if (
      decodedBodyText !== source &&
      looksLikeHtml(decodedBodyText) &&
      parsed.body.children.length === 1
    ) {
      return createEditorHtml(decodedBodyText, slides);
    }

    parsed.querySelectorAll('script, style, iframe, object, embed, link, meta, base').forEach((element) => element.remove());
    const bodyHtml = parsed.body.innerHTML.trim();
    if (bodyHtml) return bodyHtml;
    if (bodyText.trim()) return createEditorHtml(bodyText, slides);
    throw new InvalidDocumentContentError('The saved document does not contain readable document content.');
  }

  let slideStarted = false;
  const lines = source.split(/\r?\n/);
  const html = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<p></p>';
      if (slides && /^SLIDE\s+\d+/i.test(trimmed)) {
        const pageBreak = slideStarted ? '<div data-page-break="true"></div>' : '';
        slideStarted = true;
        return `${pageBreak}<h1>${escapeHtml(trimmed)}</h1>`;
      }
      if (/^[A-Z][A-Z0-9 &:/–—-]{3,}$/.test(trimmed)) return `<h2>${escapeHtml(trimmed)}</h2>`;
      if (/^[-*]\s+/.test(trimmed)) return `<ul><li>${escapeHtml(trimmed.replace(/^[-*]\s+/, ''))}</li></ul>`;
      return `<p>${escapeHtml(trimmed)}</p>`;
    })
    .join('');

  return html || '<p></p>';
}

function getDraftKey(kind: DocumentKind, documentId: string | undefined, userId: string) {
  const key = documentId || kind;
  return `facemex_document_draft_${userId || 'signed-out'}_${key}`;
}

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

const ParagraphLayout = Extension.create({
  name: 'paragraphLayout',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
            renderHTML: (attributes: { lineHeight?: string | null }) => attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {},
          },
          spaceBefore: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginTop || null,
            renderHTML: (attributes: { spaceBefore?: string | null }) => attributes.spaceBefore ? { style: `margin-top: ${attributes.spaceBefore}` } : {},
          },
          spaceAfter: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginBottom || null,
            renderHTML: (attributes: { spaceAfter?: string | null }) => attributes.spaceAfter ? { style: `margin-bottom: ${attributes.spaceAfter}` } : {},
          },
        },
      },
    ];
  },
});

const PageBreak = TiptapNode.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },
  renderHTML() {
    return ['div', { 'data-page-break': 'true', class: 'document-page-break', contenteditable: 'false' }];
  },
});

function fontFamily(font: FontKey) {
  return font === 'serif'
    ? 'Georgia, "Times New Roman", serif'
    : font === 'mono'
      ? '"SFMono-Regular", Consolas, monospace'
      : 'Arial, Helvetica, sans-serif';
}

function getClassicCvHeaderNodeCount(content: string, form: FormState) {
  const parsed = new DOMParser().parseFromString(content, 'text/html');
  const elements = Array.from(parsed.body.children);
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  const candidateNames = [form.fullName, 'Your Name'].filter(Boolean).map(normalize);
  const contactValues = [form.email, form.phone, form.location]
    .filter(Boolean)
    .map(normalize);
  const sectionHeadings = /^(personal information|educational qualifications|education(?: & qualifications)?|professional title|professional summary|experience|work experience|skills|additional information|references|projects(?: & achievements)?)$/;
  const headerValues = (element: Element, index: number) => {
    const text = normalize(element.textContent || '');
    return candidateNames.includes(text) ||
      (Boolean(form.fullName) && text.startsWith(normalize(form.fullName))) ||
      text === 'curriculum vitae' ||
      text.startsWith('curriculum vitae of') ||
      text === 'of' ||
      (Boolean(form.jobTitle) && text === normalize(form.jobTitle)) ||
      text === 'professional title' ||
      text === '[add your professional title]' ||
      text.includes('add your role or purpose') ||
      text.includes('@') ||
      contactValues.some((value) => text.includes(value)) ||
      text.includes('add your contact details') ||
      text.includes('add your email') ||
      text.includes('add your phone') ||
      text.includes('add your location') ||
      (index === 0 && element.tagName === 'H1');
  };
  let count = 0;
  while (count < elements.length) {
    const element = elements[count];
    const text = normalize(element.textContent || '');
    if (!text || sectionHeadings.test(text) && !headerValues(element, count)) break;
    if (!headerValues(element, count)) break;
    count += 1;
  }
  return count;
}

function stripCvNamePlaceholder(content: string) {
  const parsed = new DOMParser().parseFromString(content, 'text/html');
  const firstContent = Array.from(parsed.body.children).find((element) => element.textContent?.trim());
  if (firstContent?.textContent?.replace(/\s+/g, ' ').trim().toLocaleLowerCase() === 'your name') {
    firstContent.remove();
  }
  return parsed.body.innerHTML;
}

function ClassicCvHeader({ form }: { form: FormState }) {
  const contactDetails = [
    form.phone ? <div key="phone"><span aria-hidden="true">☎</span> {form.phone}</div> : null,
    form.location ? <div key="location"><span aria-hidden="true">⌖</span> {form.location}</div> : null,
    form.email ? <div key="email"><span aria-hidden="true">✉</span> {form.email}</div> : null,
  ].filter(Boolean);

  return (
    <header className="fm-classic-cv-header">
      <div className="fm-classic-cv-title">
        <div>{form.fullName || '[Full name]'}</div>
        <p>{form.jobTitle || '[Professional title]'}</p>
      </div>
      <div className="fm-classic-cv-divider" />
      {contactDetails.length > 0 && <div className="fm-classic-cv-contact-grid">{contactDetails}</div>}
    </header>
  );
}

function stripClassicCvHeader(content: string, form: FormState) {
  const parsed = new DOMParser().parseFromString(content, 'text/html');
  const count = getClassicCvHeaderNodeCount(content, form);
  Array.from(parsed.body.children).slice(0, count).forEach((element) => element.remove());

  parsed.body.querySelectorAll('p, li').forEach((element) => {
    const text = element.textContent?.trim() || '';
    if (!text || /^\[(?:add|enter|list|describe|explain|state|capture|record|include|replace)\b/i.test(text)) {
      element.remove();
    }
  });

  Array.from(parsed.body.querySelectorAll('h2')).forEach((heading) => {
    let sibling = heading.nextElementSibling;
    let hasSectionContent = false;
    while (sibling && !/^H[1-3]$/.test(sibling.tagName)) {
      if (sibling.textContent?.trim()) {
        hasSectionContent = true;
        break;
      }
      sibling = sibling.nextElementSibling;
    }
    if (!hasSectionContent) heading.remove();
  });

  return { html: parsed.body.innerHTML, count };
}

function ensureClassicCvPersonalInfo(content: string, form: FormState) {
  const identityNumber = form.idNumber.trim();
  if (!identityNumber) return content;

  const parsed = new DOMParser().parseFromString(content, 'text/html');
  if ((parsed.body.textContent || '').includes(identityNumber)) return content;

  const headings = Array.from(parsed.body.querySelectorAll('h1, h2, h3'));
  const personalHeading = headings.find((heading) =>
    heading.textContent?.trim().toLocaleLowerCase() === 'personal information'
  );
  const details = parsed.createElement('table');
  const row = parsed.createElement('tr');
  for (const value of ['Identity number', ':', identityNumber]) {
    const cell = parsed.createElement('td');
    cell.textContent = value;
    row.append(cell);
  }
  const body = parsed.createElement('tbody');
  body.append(row);
  details.append(body);

  if (personalHeading) {
    const nextHeading = headings.find((heading) => heading.compareDocumentPosition(personalHeading) & Node.DOCUMENT_POSITION_PRECEDING);
    if (nextHeading) {
      nextHeading.before(details);
    } else {
      personalHeading.after(details);
    }
    return parsed.body.innerHTML;
  }

  const sectionHeading = parsed.createElement('h2');
  sectionHeading.textContent = 'PERSONAL INFORMATION';
  const educationHeading = headings.find((heading) =>
    /educational qualifications|education/i.test(heading.textContent || '')
  );
  if (educationHeading) {
    educationHeading.before(sectionHeading, details);
  } else {
    parsed.body.prepend(sectionHeading, details);
  }
  return parsed.body.innerHTML;
}

function classicCvHeaderMarkup(form: FormState) {
  const contactDetails = [
    form.phone ? `<div>☎ ${escapeHtml(form.phone)}</div>` : '',
    form.location ? `<div>⌖ ${escapeHtml(form.location)}</div>` : '',
    form.email ? `<div>✉ ${escapeHtml(form.email)}</div>` : '',
  ].filter(Boolean);

  return `<header class="classic-cv-header"><div class="classic-cv-title"><div>${escapeHtml(form.fullName || '[Full name]')}</div><p>${escapeHtml(form.jobTitle || '[Professional title]')}</p></div><div class="classic-cv-divider"></div>${contactDetails.length ? `<div class="classic-cv-contact-grid">${contactDetails.join('')}</div>` : ''}</header>`;
}

function prepareClassicCvContent(content: string, form: FormState) {
  const stripped = stripClassicCvHeader(content, form);
  return {
    ...stripped,
    html: ensureClassicCvPersonalInfo(stripped.html, form),
  };
}

function documentHtml(
  kind: DocumentKind,
  form: FormState,
  content: string,
  template: TemplateKey,
  font: FontKey,
  alignment: 'left' | 'center' | 'right' | 'justify',
  highlightColor: string,
  orientation: PageOrientation,
  variant = 'default',
) {
  const isClassicCv = kind === 'cv' && template === 'classic';
  const accent = template === 'minimal'
    ? '#172033'
    : template === 'executive'
      ? '#0f766e'
      : template === 'classic'
        ? '#475569'
        : '#2563eb';

  const preparedCvContent = kind === 'cv' ? stripCvNamePlaceholder(content) : content;
  const classicContent = isClassicCv ? prepareClassicCvContent(preparedCvContent, form) : { html: preparedCvContent, count: 0 };
  const header = isClassicCv
    ? ''
    : kind === 'cv'
      ? `${form.fullName ? `<div class="name">${escapeHtml(form.fullName)}</div>` : ''}<div class="meta">${[form.email, form.phone, form.location, form.idNumber].filter(Boolean).map(escapeHtml).join('  |  ')}</div>`
      : `${form.fullName ? `<div class="name">${escapeHtml(form.fullName)}</div>` : ''}<div class="meta">${[form.email, form.phone, form.location].filter(Boolean).map(escapeHtml).join('  |  ')}</div><div class="date">${new Date().toLocaleDateString('en-ZA')}</div>`;
  const headerMarkup = isClassicCv
    ? classicCvHeaderMarkup(form)
    : variant === 'default' && (header.trim() || kind !== 'cv')
      ? `<header class="header">${header}</header>`
      : '';
  const documentContent = isClassicCv ? classicContent.html : preparedCvContent;

  const pageWidth = orientation === 'portrait' ? '210mm' : '297mm';
  const pageHeight = orientation === 'portrait' ? '297mm' : '210mm';
  const variantStyles = variant === 'creative'
    ? '.page section h1:first-child{border-bottom:7px solid #a3d900;padding-bottom:8px;text-transform:uppercase}.page h2{color:#537000}'
    : variant === 'sidebar'
      ? '.page table{table-layout:fixed}.page td:first-child,.page th:first-child{width:32%;background:#eaf0fb}.page th{color:#25416f}'
      : variant === 'clinical'
        ? '.page h2{background:#eaf3fb;color:#14558f;padding:5px}'
        : variant === 'technology'
          ? '.page h2{border-left:3px solid #1769c2;padding-left:8px;color:#174c7e}'
          : ['proposal', 'startup', 'pitch'].includes(variant)
            ? '.page section>h1:first-child{border-bottom:4px solid #2477d2;padding-bottom:8px;color:#173c70}'
            : '';
  const pageStyles = isClassicCv
    ? `@page{size:A4 portrait;margin:8mm}.page{width:auto;min-height:281mm;margin:0;padding:8mm;border:1px solid #cbd5e1;box-decoration-break:clone;-webkit-box-decoration-break:clone;overflow-wrap:anywhere;text-align:left;color:#172033;font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.4;print-color-adjust:exact;-webkit-print-color-adjust:exact}.classic-cv-title{text-align:center;font-size:23pt;line-height:1.25;font-weight:700;text-transform:uppercase;overflow-wrap:anywhere;color:#172033}.classic-cv-title p{margin:3pt 0 0;font-size:11pt;font-weight:400;text-transform:none;color:#475569}.classic-cv-header{margin-bottom:12pt}.classic-cv-divider{border-top:1px solid #94a3b8;margin:8pt 0}.classic-cv-contact-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:4pt 16pt;font-size:9.5pt;color:#475569}.classic-cv-contact-grid>div{overflow-wrap:anywhere}.page section h2{color:#172033;text-align:left;text-decoration:none;letter-spacing:.04em;font-size:11pt;margin:12pt 0 5pt;border-bottom:1px solid #cbd5e1;padding:0 0 3pt;break-after:avoid-page;page-break-after:avoid}.page section p{margin:0 0 5pt;white-space:pre-wrap}.page section li{break-inside:avoid;page-break-inside:avoid}.page section table{width:100%;margin:0 0 5pt;border:0;border-collapse:collapse;table-layout:fixed;font-size:10pt}.page section table thead{display:none}.page section th,.page section td{border:0;background:transparent;padding:2pt 4pt;vertical-align:top}.page section td:first-child{width:32%;color:#475569}.page section table:has(td>ul) td{width:50%}.page section table:has(tr>td:nth-child(3)) td:nth-child(2){width:1.5rem;text-align:center}.page section h2+ p{margin-top:0}.page section>h2,.page section>h2+*{break-inside:avoid-page;page-break-inside:avoid}`
    : '';
  const pageMargin = isClassicCv ? '8mm' : '0';
  return `<!doctype html><html><head><meta charset="utf-8"><title>FaceMeX ${kind.replace(/-/g, ' ')}</title><style>@page{size:${isClassicCv ? 'A4 portrait' : `A4 ${orientation}`};margin:${pageMargin}}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;font-family:${fontFamily(font)};color:#172033}.page{width:${pageWidth};min-height:${pageHeight};margin:16px auto;padding:20mm;background:#fff;box-shadow:0 16px 45px rgba(15,23,42,.14);font-size:11pt;line-height:1.45;text-align:${alignment}}.header{border-top:5px solid ${accent};padding:13px 0 12px;border-bottom:1px solid #dbe2ea;margin-bottom:22px}.name{font-size:25px;font-weight:800;letter-spacing:.02em;color:#101827}.meta,.date{margin-top:6px;font-size:9.5pt;color:#526174}.date{margin-top:16px}h2{font-size:11pt;letter-spacing:.12em;color:${accent};margin:18px 0 7px;border-bottom:1px solid #dbe2ea;padding-bottom:4px}p{margin:0 0 7px;white-space:pre-wrap}ul,ol{padding-left:20px;margin:0 0 10px}li{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:9.5pt}th,td{border:1px solid #dbe2ea;padding:7px;vertical-align:top}th{background:#f1f5f9;text-align:left}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}h1,h2,h3{break-after:avoid-page;page-break-after:avoid}mark{background:${highlightColor};padding:0 .12em}.document-page-break{break-before:page;page-break-before:always;height:0;border:0}${variantStyles}${pageStyles}@media screen and (max-width:600px){body{background:#f8fafc}.page{width:100%;min-height:100vh;margin:0;padding:24px 20px;box-shadow:none;font-size:10pt}.name{font-size:22px}.header{margin-bottom:16px}}@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:${isClassicCv ? 'auto' : pageWidth};min-height:${isClassicCv ? '281mm' : pageHeight};padding:${isClassicCv ? '8mm' : '20mm'};break-after:auto}.classic-cv-title{page-break-after:avoid;break-after:avoid-page}.classic-cv-header,.page section>h2{break-inside:avoid-page;page-break-inside:avoid}}</style></head><body><main class="page" data-variant="${variant}"${isClassicCv ? ' data-template="classic"' : ''}>${headerMarkup}<section>${documentContent}</section></main></body></html>`;
}

function makeDocxRuns(node: Node, marks: Record<string, any> = {}): TextRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    return text ? [new TextRun({ text, ...marks })] : [];
  }
  if (!(node instanceof HTMLElement)) return [];
  if (node.tagName === 'BR') return [new TextRun({ text: '', break: 1, ...marks })];

  const nextMarks = { ...marks };
  if (node.tagName === 'STRONG' || node.tagName === 'B') nextMarks.bold = true;
  if (node.tagName === 'EM' || node.tagName === 'I') nextMarks.italics = true;
  if (node.tagName === 'U') nextMarks.underline = {};
  if (node.tagName === 'S' || node.tagName === 'DEL') nextMarks.strike = true;
  if (node.tagName === 'A') nextMarks.underline = {};
  const color = node.style.color.match(/#[0-9a-f]{6}/i)?.[0];
  if (color) nextMarks.color = color.slice(1);
  const fontSize = node.style.fontSize.match(/[0-9.]+/)?.[0];
  if (fontSize) nextMarks.size = Math.round(Number(fontSize) * (node.style.fontSize.endsWith('px') ? 1.5 : 2));
  const font = node.style.fontFamily.split(',')[0]?.replace(/["']/g, '').trim();
  if (font) nextMarks.font = font;
  return Array.from(node.childNodes).flatMap((child) => makeDocxRuns(child, nextMarks));
}

function makeDocxParagraph(element: HTMLElement, options: Record<string, any> = {}) {
  const alignment = element.style.textAlign === 'center'
    ? AlignmentType.CENTER
    : element.style.textAlign === 'right'
      ? AlignmentType.RIGHT
      : element.style.textAlign === 'justify'
        ? AlignmentType.JUSTIFIED
        : AlignmentType.LEFT;
  const children = Array.from(element.childNodes).flatMap((child) => makeDocxRuns(child));
  return new Paragraph({
    alignment,
    spacing: { after: 100 },
    children: children.length ? children : [new TextRun({ text: '' })],
    ...options,
  });
}

function makeDocxBlocks(content: string): Array<Paragraph | DocxTable> {
  const parsed = new DOMParser().parseFromString(content, 'text/html');
  const blocks: Array<Paragraph | DocxTable> = [];
  const appendNodes = (nodes: NodeListOf<ChildNode>) => {
    let orderedIndex = 0;
    for (const node of Array.from(nodes)) {
      if (!(node instanceof HTMLElement)) continue;
      const tag = node.tagName;
      if (tag === 'DIV' && node.hasAttribute('data-page-break')) {
        blocks.push(new Paragraph({ children: [new DocxPageBreak()] }));
      } else if (/^H[1-4]$/.test(tag)) {
        const level = Number(tag.slice(1));
        const heading = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][level - 1];
        blocks.push(makeDocxParagraph(node, { heading }));
      } else if (tag === 'P' || tag === 'DIV') {
        blocks.push(makeDocxParagraph(node));
      } else if (tag === 'UL' || tag === 'OL') {
        orderedIndex = 0;
        for (const item of Array.from(node.children)) {
          if (item.tagName !== 'LI') continue;
          orderedIndex += 1;
          const children = Array.from(item.childNodes).flatMap((child) => makeDocxRuns(child));
          const prefix = tag === 'OL' ? `${orderedIndex}. ` : '• ';
          blocks.push(new Paragraph({
            indent: { left: 420, hanging: 240 },
            spacing: { after: 80 },
            children: [new TextRun({ text: prefix }), ...children],
          }));
        }
      } else if (tag === 'TABLE') {
        const htmlTable = node as HTMLTableElement;
        const rows = Array.from(htmlTable.rows).map((row) => new DocxTableRow({
          children: Array.from(row.cells).map((cell) => new DocxTableCell({
            children: [makeDocxParagraph(cell as HTMLElement)],
            width: { size: 100 / Math.max(row.cells.length, 1), type: WidthType.PERCENTAGE },
          })),
        }));
        if (rows.length) blocks.push(new DocxTable({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          },
        }));
      } else if (tag === 'HR') {
        blocks.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '9CA3AF' } }, children: [new TextRun({ text: '' })] }));
      } else if (node.childNodes.length) {
        appendNodes(node.childNodes);
      }
    }
  };
  appendNodes(parsed.body.childNodes);
  return blocks.length ? blocks : [new Paragraph({ children: [new TextRun({ text: '' })] })];
}

export default function DocumentStudio({
  kind,
  documentId,
  documentName,
  projectId = null,
  onDocumentSaved,
  embeddedWorkspace = false,
}: Props) {
  const { id: userId, hasTier } = useUserStore();
  const isPlus = hasTier('plus');
  const isPro = hasTier('pro');
  const currentUsageKey = getDocumentAIUsageKey(userId);
  const [dailyAiUsage, setDailyAiUsage] = useState(() => readDocumentAIUsage(userId));
  const [loadedUsageKey, setLoadedUsageKey] = useState(currentUsageKey);
  const [usageDay, setUsageDay] = useState(() => new Date().toLocaleDateString('en-CA'));
  const today = new Date().toLocaleDateString('en-CA');
  const currentDailyAiUsage = usageDay === today ? dailyAiUsage : 0;
  const freeAiLimitReached = !isPlus && (
    loadedUsageKey !== currentUsageKey ||
    dailyAiUsage === null ||
    currentDailyAiUsage >= DOCUMENT_AI_DAILY_LIMIT
  );
  const recordDocumentAIUsage = () => {
    if (isPlus) return;
    const key = getDocumentAIUsageKey(userId);
    try {
      const current = readDocumentAIUsage(userId);
      if (current === null) throw new Error('Browser storage is unavailable.');
      const next = Math.min(current + 1, DOCUMENT_AI_DAILY_LIMIT);
      window.localStorage.setItem(key, String(next));
      setUsageDay(new Date().toLocaleDateString('en-CA'));
      setDailyAiUsage(next);
      setLoadedUsageKey(key);
      window.dispatchEvent(new CustomEvent(DOCUMENT_AI_USAGE_EVENT, { detail: { key, usage: next } }));
    } catch {
      setDailyAiUsage(null);
      toast({
        title: 'Could not save today’s AI usage',
        description: 'AI requests are paused because this browser could not save the daily usage limit. Check your browser storage settings and reload.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const refreshUsage = () => {
      setLoadedUsageKey(getDocumentAIUsageKey(userId));
      setUsageDay(new Date().toLocaleDateString('en-CA'));
      setDailyAiUsage(readDocumentAIUsage(userId));
    };
    refreshUsage();
    const interval = window.setInterval(refreshUsage, 60_000);
    const onStorage = (event: StorageEvent) => {
      if (event.key === getDocumentAIUsageKey(userId)) refreshUsage();
    };
    const onUsage = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; usage: number }>).detail;
      if (detail?.key === getDocumentAIUsageKey(userId)) setDailyAiUsage(detail.usage);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(DOCUMENT_AI_USAGE_EVENT, onUsage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(DOCUMENT_AI_USAGE_EVENT, onUsage);
    };
  }, [userId]);

  const [appearance, setAppearance] = useState<AppearanceMode>(() => getAppearanceMode());

  useEffect(() => {
    const handleAppearanceChange = (event: Event) => {
      const nextMode = (event as CustomEvent<AppearanceMode>).detail;
      if (nextMode === 'light' || nextMode === 'dark') setAppearance(nextMode);
    };
    window.addEventListener(APPEARANCE_CHANGE_EVENT, handleAppearanceChange);
    return () => window.removeEventListener(APPEARANCE_CHANGE_EVENT, handleAppearanceChange);
  }, []);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [template, setTemplate] = useState<TemplateKey>(kind === 'cv' ? 'classic' : 'modern');
  const [templateId, setTemplateId] = useState('');
  const [font, setFont] = useState<FontKey>('sans');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [orientation, setOrientation] = useState<PageOrientation>(kind === 'presentation' ? 'landscape' : 'portrait');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [zoom, setZoom] = useState<ZoomLevel>(100);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [coachPrompt, setCoachPrompt] = useState('');
  const [coachMode, setCoachMode] = useState<'draft' | 'ask' | 'review' | 'edit'>('draft');
  const [coachResponse, setCoachResponse] = useState('');
  const [coachSuggestion, setCoachSuggestion] = useState<{ original: string; suggested: string; explanation: string; from: number; to: number } | null>(null);
  const [hasCoachSelection, setHasCoachSelection] = useState(false);
  const [coachBusy, setCoachBusy] = useState(false);
  const [advancedFormattingOpen, setAdvancedFormattingOpen] = useState(false);
  const [documentLoadWarning, setDocumentLoadWarning] = useState('');
  const documentSaveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const coachTextareaRef = useRef<HTMLTextAreaElement>(null);
  const documentUploadRef = useRef<HTMLInputElement>(null);
  const coachSelectionRef = useRef<{ from: number; to: number; original: string } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const documentTitles: Record<DocumentKind, string> = {
    cv: 'AI CV Studio',
    'cover-letter': 'AI Cover Letter Studio',
    portfolio: 'Portfolio Builder',
    bio: 'Bio Builder',
    'linkedin-profile': 'LinkedIn Profile',
    'portfolio-website': 'Portfolio Website',
    'business-plan': 'Business Plan',
    presentation: 'Presentation Deck',
    proposal: 'Project Proposal',
    report: 'Report',
    'meeting-notes': 'Meeting Notes',
  };

  const title = documentName || documentTitles[kind];

  const buildLocalContent = (docKind: DocumentKind, docForm: FormState, docTemplate: TemplateKey): string => {
    switch (docKind) {
      case 'cv':
        return buildLocalCv(docForm, docTemplate === 'classic');
      case 'cover-letter':
        return buildLocalLetter(docForm);
      case 'portfolio':
        return buildLocalPortfolio(docForm);
      case 'bio':
        return buildLocalBio(docForm);
      case 'linkedin-profile':
        return buildLocalLinkedInProfile(docForm);
      case 'portfolio-website':
        return buildLocalPortfolioWebsite(docForm);
      case 'business-plan':
        return buildLocalBusinessPlan(docForm);
      case 'presentation':
        return buildLocalPresentation(docForm);
      case 'proposal':
        return buildLocalProposal(docForm);
      case 'report':
        return buildLocalReport(docForm);
      case 'meeting-notes':
        return buildLocalMeetingNotes(docForm);
      default:
        return buildLocalCv(docForm, docTemplate === 'classic');
    }
  };

  const localContent = useMemo(() => buildLocalContent(kind, form, template), [form, kind, template]);

  const saveDocumentWithRetry = async (key: string, draft: Parameters<typeof saveDocument>[1]): Promise<PersistedDocument> => {
    const save: Promise<PersistedDocument> = documentSaveQueue.current.catch(() => undefined).then(async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          return await saveDocument(key, draft);
        } catch (error) {
          lastError = error;
          if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 900));
        }
      }
      throw lastError;
    });
    documentSaveQueue.current = save;
    return save;
  };

  const [content, setContent] = useState(() => createEditorHtml(localContent, kind === 'presentation'));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: false,
        underline: false,
        horizontalRule: false,
      }),
      Underline,
      TextStyle,
      FontFamily.configure({ types: ['textStyle'] }),
      FontSize,
      ParagraphLayout,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      HorizontalRule,
      PageBreak,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[420px] text-[16px] leading-7 text-slate-900',
      },
      handleDOMEvents: {
        blur: (view) => {
          const { from, to } = view.state.selection;
          const hasSelection = from !== to;
          coachSelectionRef.current = hasSelection
            ? { from, to, original: view.state.doc.textBetween(from, to, '\n') }
            : null;
          setHasCoachSelection(hasSelection);
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      coachSelectionRef.current = hasSelection
        ? { from, to, original: editor.state.doc.textBetween(from, to, '\n') }
        : null;
      setHasCoachSelection(hasSelection);
    },
  });

  useEffect(() => {
    if (!editor) {
      console.warn('TipTap editor failed to initialize');
    }
  }, [editor]);

  useEffect(() => {
    let cancelled = false;
    setDraftHydrated(false);
    setSyncStatus('loading');

    const loadDraft = async () => {
      let localDraft: any = null;
      let invalidDocumentContent = false;
      const applyLocalDraft = () => {
        if (localDraft.form) setForm({ ...emptyForm, ...localDraft.form });
        if (typeof localDraft.content === 'string' && localDraft.content.trim()) {
          setContent(createEditorHtml(localDraft.content, kind === 'presentation'));
        }
        if (localDraft.template) setTemplate(localDraft.template);
        if (localDraft.templateId) setTemplateId(localDraft.templateId);
        if (localDraft.font) setFont(localDraft.font);
        if (localDraft.alignment) setAlignment(localDraft.alignment);
        if (localDraft.orientation) setOrientation(localDraft.orientation);
        if (localDraft.highlightColor) setHighlightColor(localDraft.highlightColor);
        setDraftSaved(true);
      };
      try {
        localDraft = JSON.parse(localStorage.getItem(getDraftKey(kind, documentId, userId)) || 'null');
      } catch {
        localDraft = null;
      }

      try {
        const saved = await getDocument(documentId || kind);
        if (cancelled) return;
        if (saved) {
          const metadata = saved.metadata || {};
          const localSavedAt = Date.parse(localDraft?.savedAt || '');
          const remoteSavedAt = Date.parse(saved.updatedAt || '');
          if (localDraft && Number.isFinite(localSavedAt) && localSavedAt > remoteSavedAt) {
            applyLocalDraft();
            setSyncStatus('saving');
          } else {
            if (metadata.form) setForm({ ...emptyForm, ...(metadata.form as Partial<FormState>) });
            setContent(createEditorHtml(saved.content || '<p></p>', kind === 'presentation'));
            if (metadata.template) setTemplate(metadata.template as TemplateKey);
            if (metadata.templateId) setTemplateId(String(metadata.templateId));
            if (metadata.font) setFont(metadata.font as FontKey);
            if (metadata.alignment) setAlignment(metadata.alignment as 'left' | 'center' | 'right' | 'justify');
            if (metadata.orientation) setOrientation(metadata.orientation as PageOrientation);
            if (metadata.highlightColor) setHighlightColor(String(metadata.highlightColor));
            setDraftSaved(true);
            setSyncStatus('saved');
          }
        } else if (localDraft) {
          applyLocalDraft();
          setSyncStatus('saving');
        } else {
          setSyncStatus('saved');
        }
      } catch (error) {
        console.error('FaceMeX document load failed', error);
        if (cancelled) return;
        if (error instanceof InvalidDocumentContentError) {
          invalidDocumentContent = true;
          try {
            if (!localDraft?.content) throw error;
            applyLocalDraft();
            setDocumentLoadWarning('The saved cloud copy contains an invalid page response. A local recovery copy is shown; it has not been synchronized. Save only after reviewing the document.');
          } catch {
            setDocumentLoadWarning('The saved document contains an invalid page response, so it was not loaded or changed. The original cloud copy has been left untouched.');
          }
          setSyncStatus('error');
        } else if (localDraft) {
          try {
            applyLocalDraft();
            setSyncStatus('saving');
          } catch (draftError) {
            console.error('FaceMeX local document recovery failed', draftError);
            invalidDocumentContent = draftError instanceof InvalidDocumentContentError;
            setDocumentLoadWarning('The saved document could not be rendered. The original cloud copy has been left untouched.');
            setSyncStatus('error');
          }
        } else {
          setSyncStatus('error');
        }
      } finally {
        if (!cancelled) setDraftHydrated(!invalidDocumentContent);
      }
    };

    void loadDraft();
    return () => { cancelled = true; };
  }, [kind, documentId, userId]);

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!draftHydrated || !editor || kind !== 'cv') return;
    const placeholderCleaned = stripCvNamePlaceholder(content);
    const sanitized = template === 'classic'
      ? prepareClassicCvContent(placeholderCleaned, form).html
      : placeholderCleaned;
    if (sanitized === content) return;
    editor.commands.setContent(sanitized, { emitUpdate: false });
    setContent(sanitized);
  }, [content, draftHydrated, editor, form, kind, template]);

  useEffect(() => {
    if (!draftHydrated) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(getDraftKey(kind, documentId, userId), JSON.stringify({ form, content, template, templateId, font, alignment, highlightColor, orientation, savedAt: new Date().toISOString() }));
      } catch {
        setDraftSaved(false);
      }

      setSyncStatus('saving');
      const draft = {
        title,
        documentType: kind,
        content,
        metadata: { form, template, templateId, font, alignment, highlightColor, orientation },
        projectId,
      };
      trackDocumentEvent('save', 'started');
      void saveDocumentWithRetry(documentId || kind, draft)
        .then((saved) => {
          setDraftSaved(true);
          setSyncStatus('saved');
          onDocumentSaved?.(saved);
          trackDocumentEvent('save', 'succeeded');
        })
        .catch((error) => {
          trackDocumentEvent('save', 'failed');
          console.error('FaceMeX document autosave failed', error);
          setDraftSaved(false);
          setSyncStatus('error');
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [alignment, content, font, form, kind, template, templateId, documentId, highlightColor, title, userId, draftHydrated, projectId, orientation, onDocumentSaved]);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const getFields = (docKind: DocumentKind): Array<[string, string]> => {
    switch (docKind) {
      case 'cv':
        return [
          ['fullName', 'Full name'],
          ['email', 'Email'],
          ['phone', 'Phone'],
          ['location', 'Location'],
          ['idNumber', 'ID / Profile ID'],
          ['summary', 'Professional summary'],
          ['experience', 'Experience / projects'],
          ['skills', 'Skills'],
          ['education', 'Education'],
          ['references', 'References'],
          ['extras', 'Additional information'],
        ];
      case 'cover-letter':
        return [
          ['fullName', 'Your name'],
          ['email', 'Email'],
          ['phone', 'Phone'],
          ['location', 'Location'],
          ['jobTitle', 'Job title'],
          ['company', 'Company'],
          ['summary', 'Your experience / summary'],
          ['extras', 'Why this role and other details'],
        ];
      case 'portfolio':
        return [
          ['fullName', 'Portfolio title'],
          ['email', 'Email'],
          ['phone', 'Phone'],
          ['summary', 'About your work'],
          ['experience', 'Featured projects'],
          ['skills', 'Skills & expertise'],
          ['extras', 'Links & contact'],
        ];
      case 'bio':
        return [
          ['fullName', 'Your name'],
          ['jobTitle', 'Professional title'],
          ['email', 'Email'],
          ['phone', 'Phone'],
          ['summary', 'About you'],
          ['education', 'Background'],
          ['skills', 'Expertise'],
          ['extras', 'Contact information'],
        ];
      case 'linkedin-profile':
        return [
          ['fullName', 'Full name'],
          ['jobTitle', 'Professional headline'],
          ['email', 'Email'],
          ['location', 'Location'],
          ['summary', 'About'],
          ['experience', 'Experience'],
          ['skills', 'Skills'],
          ['education', 'Education'],
        ];
      case 'portfolio-website':
        return [
          ['fullName', 'Your name'],
          ['jobTitle', 'Tagline'],
          ['email', 'Email'],
          ['phone', 'Phone'],
          ['summary', 'About me'],
          ['skills', 'Services / Expertise'],
          ['experience', 'Portfolio / Work'],
          ['extras', 'Contact & CTA'],
        ];
      case 'business-plan':
        return [
          ['company', 'Business name'],
          ['jobTitle', 'Plan period / industry'],
          ['summary', 'Executive summary'],
          ['experience', 'Problem & market opportunity'],
          ['skills', 'Products & business model'],
          ['education', 'Operations & team'],
          ['extras', 'Financial assumptions & funding needs'],
        ];
      case 'presentation':
        return [
          ['fullName', 'Presentation title'],
          ['jobTitle', 'Audience / subtitle'],
          ['summary', 'Core message'],
          ['experience', 'Opportunity / challenge'],
          ['skills', 'Solution / key points'],
          ['education', 'Plan / timeline'],
          ['extras', 'Evidence, resources & call to action'],
        ];
      case 'proposal':
        return [
          ['company', 'Client / project name'],
          ['jobTitle', 'Proposal title'],
          ['summary', 'Executive summary'],
          ['experience', 'Background & need'],
          ['skills', 'Objectives & success measures'],
          ['education', 'Deliverables & timeline'],
          ['extras', 'Budget, risks & next steps'],
        ];
      case 'report':
        return [
          ['fullName', 'Report title'],
          ['jobTitle', 'Prepared for / reporting period'],
          ['summary', 'Executive summary'],
          ['experience', 'Background & objectives'],
          ['education', 'Method & sources'],
          ['skills', 'Key findings'],
          ['extras', 'Recommendations & references'],
        ];
      case 'meeting-notes':
        return [
          ['fullName', 'Meeting notes title'],
          ['jobTitle', 'Meeting name'],
          ['company', 'Date / facilitator'],
          ['summary', 'Objective & agenda'],
          ['experience', 'Discussion notes'],
          ['skills', 'Decisions'],
          ['education', 'Action items & owners'],
          ['extras', 'Attendees / next meeting'],
        ];
      default:
        return [];
    }
  };

  const fields = getFields(kind);
  const selectedTemplate = getDocumentTemplate(templateId);
  const isClassicCv = kind === 'cv' && template === 'classic';
  const classicHeaderNodeCount = isClassicCv ? getClassicCvHeaderNodeCount(content, form) : 0;

  const Icon = isPlus ? Sparkles : Wand2;

  const generate = async () => {
    if (freeAiLimitReached) {
      toast({ title: 'Daily free AI limit reached', description: 'Upgrade to FaceMeX Plus or Pro for more document AI access.' });
      return;
    }

    if (kind === 'cv' && (!form.fullName.trim() || !form.email.trim())) {
      toast({ title: 'Add your details', description: 'Enter your name and email first.' });
      return;
    }

    if (kind === 'cover-letter' && (!form.jobTitle.trim() && !form.company.trim() && !form.summary.trim())) {
      toast({ title: 'Add job details', description: 'Enter a job title, company, or summary first.' });
      return;
    }

    trackDocumentEvent('generation', 'started');
    setBusy(true);
    try {
      let nextContent = createEditorHtml(localContent);
      {
        const endpoint = !isPlus
          ? '/api/ai/workspace'
          : kind === 'cv'
          ? '/api/ai/pro/resume-builder'
          : kind === 'cover-letter'
            ? '/api/ai/pro/cover-letter'
            : '/api/ai/workspace';
        const candidateDetails = { ...form };
        delete candidateDetails.idNumber;
        const templateGuidance = selectedTemplate?.id === 'cv-corporate' || (kind === 'cv' && template === 'classic')
          ? 'Use a professional CV section order: PROFESSIONAL SUMMARY, EDUCATION, EXPERIENCE, SKILLS, REFERENCES, ADDITIONAL INFORMATION. The candidate name, professional title, and contact details are rendered in the page header; do not repeat them in the body. Use only supplied information and do not include placeholders or empty sections.'
          : selectedTemplate
            ? `Follow the selected template "${selectedTemplate.name}" and its section structure: ${selectedTemplate.description}.`
            : `Use the ${template} visual style.`;
        const request = kind === 'cv'
          ? `Create a polished, ATS-friendly CV using only the candidate details below. Keep every claim factual; do not invent experience, achievements, skills, dates, or qualifications. Use clear section headings and concise bullets. ${templateGuidance} Candidate details: ${JSON.stringify(candidateDetails)}`
          : kind === 'cover-letter'
            ? `Create a tailored, professional cover letter using only the candidate details below. Do not invent experience, achievements, skills, dates, or qualifications. ${templateGuidance} Candidate details: ${JSON.stringify(candidateDetails)}`
            : `Create a polished ${kind.replace(/-/g, ' ')} using only the user details below. Never invent experience, qualifications, skills, dates, contact details, achievements, or project results. Use clear section headings. ${templateGuidance} User details: ${JSON.stringify(candidateDetails)}`;
        const response = await api.postViaSameOriginProxy(endpoint, {
          messages: [{ role: 'user', content: request }],
          ...(kind === 'cv' ? { task: 'resume_builder' } : kind === 'cover-letter' ? { task: 'cover_letter' } : {}),
          tier: isPro ? 'pro' : isPlus ? 'plus' : 'free',
          template,
        });
        const generated = String(
          kind === 'cv'
            ? response?.resumeText || response?.answer || response?.reply || response?.content || response?.response || response?.text || ''
            : response?.letter || response?.answer || response?.reply || response?.content || response?.response || response?.text || ''
        ).trim();
        if (!generated) throw new Error('The AI service returned an empty document.');
        nextContent = createEditorHtml(generated, kind === 'presentation', true);
        if (kind === 'cv' && template === 'classic') {
          nextContent = ensureClassicCvPersonalInfo(nextContent, form);
        }
        recordDocumentAIUsage();
      }

      setContent(nextContent);
      trackDocumentEvent('generation', 'succeeded');
      toast({ title: 'Document ready', description: 'AI generation complete.' });
    } catch (error) {
      trackDocumentEvent('generation', 'failed');
      console.error('FaceMeX document generation failed', error);
      toast({
        title: 'AI generation failed',
        description: getSafeDocumentErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const applyDocumentTemplate = (item: NonNullable<ReturnType<typeof getDocumentTemplate>>) => {
    const existingText = editor?.getText().trim() || '';
    if (existingText && !window.confirm('Applying a template replaces the current document content. Cancel to keep editing your current document. Continue?')) {
      return;
    }

    const details = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, String(value || '')]),
    );
    const markdown = item.id === 'cv-corporate'
      ? buildClassicCvTemplateContent(details)
      : buildDocumentTemplateContent(item, details);
    const nextContent = createEditorHtml(markdown, kind === 'presentation', true);
    editor?.commands.setContent(nextContent);
    setContent(nextContent);
    setTemplate(item.style);
    setTemplateId(item.id);
    setTemplateGalleryOpen(false);
    setCoachResponse('');
    setCoachSuggestion(null);
    toast({
      title: 'Template applied',
      description: item.id === 'cv-corporate'
        ? `${item.name} is ready to edit.`
        : `${item.name} is ready to edit. Replace bracketed prompts with your verified information.`,
    });
  };

  const importDocumentFile = async (file?: File) => {
    if (!file) return;
    const extension = file.name.toLocaleLowerCase().split('.').pop();
    if (!['txt', 'md', 'markdown'].includes(extension || '')) {
      toast({ title: 'Unsupported file type', description: 'Upload a plain text or Markdown file (.txt, .md, .markdown).', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File is too large', description: 'Choose a text document smaller than 2 MB.', variant: 'destructive' });
      return;
    }
    try {
      const source = await file.text();
      if (!source.trim()) throw new Error('This file is empty.');
      if (editor?.getText().trim() && !window.confirm('Importing this file replaces the current document content. Continue?')) return;
      const nextContent = createEditorHtml(source, kind === 'presentation', true);
      editor?.commands.setContent(nextContent);
      setContent(nextContent);
      setForm(emptyForm);
      setTemplateId('');
      setCoachResponse('');
      setCoachSuggestion(null);
      setTemplateGalleryOpen(false);
      toast({ title: 'Document imported', description: 'The text is now editable in the document studio.' });
    } catch (error) {
      console.error('FaceMeX document import failed', error);
      toast({
        title: 'Could not import this document',
        description: error instanceof Error ? error.message : 'Please check the file and try again.',
        variant: 'destructive',
      });
    }
  };

  const printDocument = () => {
    trackDocumentEvent('export', 'started');
    try {
      const win = window.open('', '_blank');
      if (!win) {
        trackDocumentEvent('export', 'failed');
        toast({ title: 'PDF window was blocked', description: 'Allow pop-ups for FaceMeX, then try printing again.', variant: 'destructive' });
        return;
      }

      win.document.write(documentHtml(kind, form, content, template, font, alignment, highlightColor, orientation, selectedTemplate?.variant));
      win.document.close();
      win.focus();
      win.print();
      trackDocumentEvent('export', 'succeeded');
    } catch (error) {
      trackDocumentEvent('export', 'failed');
      console.error('FaceMeX PDF export failed', error);
      toast({ title: 'PDF export failed', description: 'Please try again. Your document remains available in the editor.', variant: 'destructive' });
    }
  };

  const downloadDocx = async () => {
    trackDocumentEvent('export', 'started');
    try {
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: orientation === 'portrait' ? { width: 11906, height: 16838 } : { width: 16838, height: 11906 },
              margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
            },
          },
          children: [
            ...(form.fullName ? [new Paragraph({ children: [new TextRun({ text: form.fullName, bold: true, size: 34 })] })] : []),
            ...makeDocxBlocks(kind === 'cv' ? stripCvNamePlaceholder(content) : content),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentName || kind}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      trackDocumentEvent('export', 'succeeded');
    } catch (error) {
      trackDocumentEvent('export', 'failed');
      console.error('FaceMeX DOCX export failed', error);
      toast({ title: 'DOCX export failed', description: 'Please try again. Your document remains available in the editor.', variant: 'destructive' });
    }
  };

  const clearDocument = () => {
    setForm(emptyForm);
    setContent('<p></p>');
    setTemplateId('');
  };

  const handleSave = async () => {
    trackDocumentEvent('save', 'started');
    let localCopySaved = false;
    try {
      localStorage.setItem(getDraftKey(kind, documentId, userId), JSON.stringify({ form, content, template, templateId, font, alignment, highlightColor, orientation, savedAt: new Date().toISOString() }));
      localCopySaved = true;
    } catch (error) {
      console.error('FaceMeX local document recovery failed', error);
    }

    setSyncStatus('saving');
    try {
      const saved = await saveDocumentWithRetry(documentId || kind, {
        title,
        documentType: kind,
        content,
        metadata: { form, template, templateId, font, alignment, highlightColor, orientation },
        projectId,
      });
      setDraftSaved(true);
      setSyncStatus('saved');
      onDocumentSaved?.(saved);
      trackDocumentEvent('save', 'succeeded');
      toast({ title: 'Saved', description: 'Your draft has been saved.' });
    } catch (error) {
      trackDocumentEvent('save', 'failed');
      console.error('FaceMeX document save failed', error);
      setSyncStatus('error');
      toast({
        title: 'Cloud save failed',
        description: localCopySaved
          ? 'A local recovery copy is available. Check your connection and try again.'
          : 'The cloud save failed and browser storage could not keep a local recovery copy. Copy your document text somewhere safe before leaving this page.',
        variant: 'destructive',
      });
    }
  };

  const askDocumentCoach = async (mode: 'ask' | 'review' | 'edit' | 'draft') => {
    if (freeAiLimitReached) {
      toast({ title: 'Daily free AI limit reached', description: 'Upgrade to FaceMeX Plus or Pro for more document AI access.' });
      return;
    }

    const selectedRange = mode === 'edit' ? coachSelectionRef.current : null;
    const selection = selectedRange || editor?.state.selection;
    const original = selectedRange?.original || (selection && selection.from !== selection.to
      ? editor?.state.doc.textBetween(selection.from, selection.to, '\n') || ''
      : '');
    if (mode === 'edit' && !original.trim()) {
      toast({ title: 'Select document text first', description: 'Highlight the text you want FaceMeX to improve.' });
      return;
    }

    const userQuestion = coachPrompt.trim();
    if ((mode === 'ask' || mode === 'draft') && !userQuestion) {
      toast({ title: 'Ask FaceMeX a question', description: 'Enter what you want help with.' });
      return;
    }

    const draftDocumentText = editor?.getText() || '';
    const blankDocument = !draftDocumentText.trim();
    const explicitFullRewrite = /\b(?:whole|entire|complete|full)\s+(?:document|cv|cover letter|report|proposal|plan|presentation)\b|\b(?:rewrite|replace|redraft)\b.{0,40}\b(?:whole|entire|complete|full)\s+(?:document|cv|cover letter|report|proposal|plan|presentation|thing)\b|\b(?:rewrite|replace|redraft)\b.{0,30}\beverything\b|\bstart\s+(?:over|from scratch)\b/i.test(userQuestion);
    const instruction = mode === 'review'
      ? `Review this document for clarity, spelling, grammar, structure, repetition, and professionalism. Reply like a helpful writing assistant: start with a brief overall assessment, then use clear Markdown headings and concise bullets for specific strengths, recommended improvements, and missing information. Give actionable examples where useful. Focus on: ${userQuestion || 'the overall document quality'}. Never invent qualifications, skills, experience, or dates.`
      : mode === 'edit'
        ? `Improve only the selected text according to this request: ${userQuestion}. Keep all facts unchanged. Return a JSON object with string properties suggested and explanation. Selected text: ${JSON.stringify(original)}`
        : mode === 'draft'
          ? blankDocument
            ? `Create the complete ${kind} document from the user's request and available details. Return only a JSON object with string property replacementBody containing the complete document in Markdown and boolean wholeDocument set to true. Use clear headings and concise bullets. Never invent qualifications, skills, experience, dates, contact details, or achievements. User request: ${userQuestion}`
            : explicitFullRewrite
              ? `The user explicitly requested a whole-document rewrite. Rewrite the complete ${kind} document using the existing facts and available details. Return only a JSON object with string property replacementBody containing the complete replacement document in Markdown and boolean wholeDocument set to true. Never invent qualifications, skills, experience, dates, contact details, or achievements. User request: ${userQuestion}`
              : `Apply the user's requested changes to one existing section of this ${kind}. Return only a JSON object with string properties targetHeading (the exact text of one existing section heading, copied exactly) and replacementBody (only that section's new body in Markdown, without repeating its heading). Do not return the whole document and do not change other sections. If no single relevant existing heading can be identified, return an empty targetHeading. Preserve all facts and never invent qualifications, skills, experience, dates, contact details, or achievements. User request: ${userQuestion}`
          : `Answer the user's document-writing question in a clear, conversational, helpful style. Use short paragraphs and Markdown headings or bullets when they improve readability. Never invent personal facts. Question: ${userQuestion}`;

    if (mode === 'edit' || mode === 'draft') trackDocumentEvent('edit', 'started');
    setCoachBusy(true);
    setCoachResponse('');
    setCoachSuggestion(null);
    try {
      const userDetails = { ...form };
      delete userDetails.idNumber;
      const response = await api.postViaSameOriginProxy('/api/ai/workspace', {
        messages: [{
          role: 'user',
          content: `${instruction}\n\nDocument type: ${kind}\nSelected template: ${selectedTemplate ? `${selectedTemplate.name} — ${selectedTemplate.description}` : 'Blank or imported document'}\nDocument content:\n${editor?.getText() || content}\n\nUser-provided details:\n${JSON.stringify(userDetails)}`,
        }],
        intent: 'document_analysis',
        source: 'facemex-document-coach',
        directAnswer: true,
      });
      const answer = String(response?.answer || response?.reply || response?.text || response?.content || response?.data?.answer || '').trim();
      if (!answer) {
        throw new Error('The AI service returned an empty response.');
      }
      if (isNotFoundHtmlPage(answer)) {
        throw new InvalidDocumentContentError('The document service returned a “Page not found” page instead of an answer.');
      }
      if (mode === 'edit') {
        const jsonText = answer.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        try {
          const parsed = JSON.parse(jsonText);
          const suggested = String(parsed.suggested || '').trim();
          if (!suggested) throw new Error('The AI service returned an empty edit suggestion.');
          setCoachSuggestion({
            original,
            suggested,
            explanation: String(parsed.explanation || ''),
            from: selection!.from,
            to: selection!.to,
          });
          setCoachPrompt('');
          if (coachTextareaRef.current) coachTextareaRef.current.style.height = '32px';
        } catch {
          if (answer.trim().startsWith('{')) throw new Error('The AI service returned an invalid edit suggestion.');
          setCoachSuggestion({
            original,
            suggested: answer,
            explanation: 'Review this proposal before applying it. FaceMeX was asked not to add facts.',
            from: selection!.from,
            to: selection!.to,
          });
          setCoachPrompt('');
          if (coachTextareaRef.current) coachTextareaRef.current.style.height = '32px';
        }
        trackDocumentEvent('edit', 'succeeded');
      } else if (mode === 'draft') {
        applyAiDraft(answer, blankDocument, explicitFullRewrite);
        trackDocumentEvent('edit', 'succeeded');
        setCoachPrompt('');
        if (coachTextareaRef.current) coachTextareaRef.current.style.height = '32px';
      } else {
        setCoachResponse(answer);
        setCoachPrompt('');
        if (coachTextareaRef.current) coachTextareaRef.current.style.height = '32px';
      }
      recordDocumentAIUsage();
    } catch (error) {
      if (mode === 'edit' || mode === 'draft') trackDocumentEvent('edit', 'failed');
      console.error('FaceMeX document coach request failed', error);
      toast({
        title: 'FaceMeX could not complete that request',
        description: getSafeDocumentErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setCoachBusy(false);
    }
  };

  const applyCoachSuggestion = () => {
    if (!editor || !coachSuggestion) return;
    const currentSelection = editor.state.doc.textBetween(coachSuggestion.from, coachSuggestion.to, '\n');
    if (currentSelection !== coachSuggestion.original) {
      toast({ title: 'Selection changed', description: 'Select the text again before applying this suggestion.' });
      setCoachSuggestion(null);
      return;
    }
    editor.chain().focus().insertContentAt(
      { from: coachSuggestion.from, to: coachSuggestion.to },
      createEditorHtml(coachSuggestion.suggested, kind === 'presentation'),
    ).run();
    coachSelectionRef.current = null;
    setHasCoachSelection(false);
    setCoachSuggestion(null);
    toast({ title: 'Suggestion applied', description: 'You can undo this change from the editor toolbar.' });
  };

  const applyAiDraft = (responseText: string, blankDocument: boolean, explicitFullRewrite: boolean) => {
    if (!editor || !responseText.trim()) throw new Error('The AI service returned an empty document update.');
    const cleanedResponse = responseText.replace(/^```(?:json|text|markdown)?\s*/i, '').replace(/\s*```$/, '').trim();
    let parsed: Record<string, unknown> | null = null;
    try {
      const value = JSON.parse(cleanedResponse);
      if (value && typeof value === 'object' && !Array.isArray(value)) parsed = value as Record<string, unknown>;
    } catch {
      if ((!blankDocument && !explicitFullRewrite) || cleanedResponse.startsWith('{')) {
        throw new Error('The AI response was not valid section-edit JSON. Your document was not changed.');
      }
    }

    const wholeDocument = parsed?.wholeDocument === true;
    if (wholeDocument) {
      if (!blankDocument && !explicitFullRewrite) {
        throw new Error('A full-document replacement is allowed only when you explicitly request a whole-document rewrite. Your document was not changed.');
      }
      const replacementBody = typeof parsed?.replacementBody === 'string' ? parsed.replacementBody.trim() : '';
      if (!replacementBody) throw new Error('The AI response did not include replacement document content. Your document was not changed.');
      const html = createEditorHtml(replacementBody, kind === 'presentation', true);
      editor.commands.setContent(html);
      setContent(html);
    } else if (!parsed && (blankDocument || explicitFullRewrite)) {
      const html = createEditorHtml(cleanedResponse, kind === 'presentation', true);
      editor.commands.setContent(html);
      setContent(html);
    } else {
      const targetHeading = typeof parsed?.targetHeading === 'string' ? parsed.targetHeading.trim() : '';
      const replacementBody = typeof parsed?.replacementBody === 'string' ? parsed.replacementBody.trim() : '';
      if (!targetHeading || !replacementBody) {
        throw new Error('FaceMeX could not identify one existing section to update. Ask for a specific section heading; your document was not changed.');
      }

      const documentNodes: Array<{ node: typeof editor.state.doc; pos: number }> = [];
      editor.state.doc.forEach((node, pos) => documentNodes.push({ node: node as typeof editor.state.doc, pos }));
      const normalizeHeading = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
      const matches = documentNodes.filter(({ node }) =>
        node.type.name === 'heading' && normalizeHeading(node.textContent) === normalizeHeading(targetHeading)
      );
      if (matches.length !== 1) {
        throw new Error(matches.length === 0
          ? 'FaceMeX could not find that section heading in the document. Ask for an exact existing heading; your document was not changed.'
          : 'That section heading appears more than once. Ask for a unique existing heading; your document was not changed.');
      }

      const target = matches[0];
      const targetIndex = documentNodes.indexOf(target);
      const headingLevel = Number(target.node.attrs.level || 1);
      let end = editor.state.doc.content.size;
      let nextHeadingIndex = -1;
      for (let index = targetIndex + 1; index < documentNodes.length; index += 1) {
        const candidate = documentNodes[index];
        if (candidate.node.type.name === 'heading' && Number(candidate.node.attrs.level || 1) <= headingLevel) {
          end = candidate.pos;
          nextHeadingIndex = index;
          break;
        }
      }
      if (nextHeadingIndex > 0 && documentNodes[nextHeadingIndex - 1].node.type.name === 'horizontalRule') {
        end = documentNodes[nextHeadingIndex - 1].pos;
      }

      const start = target.pos + target.node.nodeSize;
      const html = createEditorHtml(replacementBody, kind === 'presentation', true);
      editor.chain().focus().insertContentAt({ from: start, to: end }, html).run();
    }

    setCoachResponse('');
    toast({ title: 'Document updated', description: 'FaceMeX applied your requested changes. Review the result and undo if needed.' });
  };

  const wordCount = (editor?.getText() || '').trim().split(/\s+/).filter(Boolean).length;
  const pageOrientation = isClassicCv ? 'portrait' : orientation;
  const pageWidthPx = (pageOrientation === 'portrait' ? 210 : 297) * (96 / 25.4);
  const composerPlaceholder = coachMode === 'draft'
    ? `Ask FaceMeX to write or edit your ${kind === 'cv' ? 'CV' : 'document'}`
    : coachMode === 'ask'
      ? 'Ask a question about this document'
      : coachMode === 'review'
        ? 'What should FaceMeX review? (optional)'
        : 'Select text in the document, then describe the improvement';

  const resizeCoachTextarea = (value: string) => {
    const textarea = coachTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    setCoachPrompt(value);
  };

  if (initError) {
    return (
      <div className="min-h-screen bg-white lg:bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Editor Error</h2>
          <p className="text-slate-700 lg:text-white/70 mb-4">{initError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fm-document-workspace fm-theme-${appearance} ${embeddedWorkspace ? 'h-full min-h-0' : 'h-screen h-[100dvh]'} overflow-hidden bg-slate-50 text-slate-900 lg:bg-[#0b0b0b] lg:text-white`}>
      <SensitiveContentShield
        context={kind === 'cv' ? 'cv' : 'cover-letter'}
        className={`mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[1500px] flex-col overflow-hidden ${embeddedWorkspace ? 'px-2 pb-0 pt-2 sm:px-5 lg:px-8 lg:pt-5' : 'px-3 pb-3 pt-3 sm:px-5 lg:px-8 lg:pt-5'}`}
        contentClassName="flex h-full min-h-0 flex-col"
      >
        <div className="fm-document-editor-header mb-2 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:mb-3 sm:gap-3 lg:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 lg:text-white/55">FaceMeX · {kind === 'cv' ? 'CV editor' : 'Document editor'}</p>
            <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-slate-900 lg:text-white lg:text-2xl">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 lg:gap-2.5">
            <span className="shrink-0 text-xs text-slate-500 lg:text-white/55" role="status" aria-live="polite">
              {syncStatus === 'loading' ? 'Loading...' : syncStatus === 'saving' ? 'Saving...' : syncStatus === 'error' ? 'Sync issue' : draftSaved ? 'Saved' : 'Unsaved'}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={handleSave} className="h-9 shrink-0 rounded-full border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 lg:border-white/10 lg:bg-white/[0.06] lg:text-white">
              <Save className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={printDocument} aria-label="Export PDF" title="Export PDF" className="h-9 w-9 shrink-0 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:border-white/10 lg:bg-white/[0.06] lg:text-white">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <input
          ref={documentUploadRef}
          type="file"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          className="hidden"
          aria-label="Upload a text or Markdown document"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            void importDocumentFile(file);
          }}
        />

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:gap-4">
          {detailsOpen && (
            <>
              <button
                type="button"
                className="absolute inset-0 z-20 cursor-default bg-black/60 xl:hidden"
                onClick={() => setDetailsOpen(false)}
                aria-label="Close document details"
              />
              <aside
                id="document-details-panel"
                aria-labelledby="document-details-title"
                className="absolute inset-x-0 top-0 z-30 mx-auto flex h-[min(78dvh,680px)] max-h-[calc(100%-1rem)] min-h-0 w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-2xl xl:static xl:mx-0 xl:h-full xl:max-h-none xl:w-[280px] xl:max-w-none xl:shrink-0 xl:shadow-none"
              >
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <h2 id="document-details-title" className="text-sm font-semibold text-slate-900 lg:text-white">Document details</h2>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDetailsOpen(false)} className="h-8 px-2 text-xs text-slate-500 lg:text-white/60">
                    Done
                  </Button>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
                  {fields.map(([key, label]) =>
                    key === 'summary' || key === 'experience' || key === 'skills' || key === 'education' || key === 'references' || key === 'extras'
                      ? (
                          <label key={key} className="block space-y-1">
                            <span className="text-xs font-semibold text-slate-600 lg:text-white/70">{label}</span>
                            <Textarea
                              rows={key === 'experience' || key === 'references' ? 4 : 3}
                              value={form[key as keyof FormState]}
                              onChange={(event) => update(key as keyof FormState, event.target.value)}
                              placeholder={
                                key === 'education'
                                  ? 'One entry per line: dates | institution | qualification | description'
                                  : key === 'experience'
                                    ? 'One entry per line: dates | company | job title | responsibilities'
                                    : key === 'references'
                                      ? 'One entry per line: name | position | organisation | contact'
                                      : key === 'skills'
                                        ? 'One skill per line'
                                        : undefined
                              }
                              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 lg:border-white/10 lg:bg-white/[0.04] lg:text-white lg:placeholder:text-white/35"
                            />
                          </label>
                        )
                      : (
                          <label key={key} className="block space-y-1">
                            <span className="text-xs font-semibold text-slate-600 lg:text-white/70">{label}</span>
                            <Input
                              value={form[key as keyof FormState]}
                              onChange={(event) => update(key as keyof FormState, event.target.value)}
                              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 lg:border-white/10 lg:bg-white/[0.04] lg:text-white lg:placeholder:text-white/35"
                            />
                          </label>
                        ),
                  )}

                  <Button onClick={generate} disabled={busy || freeAiLimitReached} className="h-11 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 lg:bg-blue-600 lg:hover:bg-blue-700">
                    <Icon className="mr-2 h-4 w-4" />
                    {busy ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
              </aside>
            </>
          )}

          <main className="fm-document-editor-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 pb-2 lg:gap-3 lg:border-white/10">
              <p className="min-w-0 truncate whitespace-nowrap text-[11px] text-slate-500 lg:text-xs lg:text-white/50">
                A4 {orientation} · {wordCount} words
              </p>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailsOpen((open) => !open)}
                  aria-expanded={detailsOpen}
                  aria-controls="document-details-panel"
                  className="h-8 min-w-[72px] shrink-0 whitespace-nowrap rounded-lg px-1.5 text-[11px] text-slate-600 sm:min-w-[78px] sm:px-2.5 sm:text-xs lg:text-white/70"
                >
                  {detailsOpen ? 'Hide details' : 'Details'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdvancedFormattingOpen((open) => !open)}
                  aria-expanded={advancedFormattingOpen}
                  className="h-8 min-w-[72px] shrink-0 whitespace-nowrap rounded-lg px-1.5 text-[11px] text-slate-600 sm:min-w-[78px] sm:px-2.5 sm:text-xs lg:text-white/70"
                >
                  {advancedFormattingOpen ? 'Done' : 'Format'}
                </Button>
              </div>
            </div>

            {advancedFormattingOpen && (
              <div className="fm-document-format-panel mt-2 max-h-[30dvh] shrink-0 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 lg:max-h-none lg:overflow-visible lg:border-white/10 lg:bg-[#171717]">
                <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 lg:border-white/10">
                  <select
                    value={orientation}
                    onChange={(event) => setOrientation(event.target.value as PageOrientation)}
                    aria-label="A4 page orientation"
                    className="fm-document-control h-9 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700 lg:border-white/10 lg:bg-white/[0.06] lg:text-white"
                  >
                    <option value="portrait">A4 Portrait</option>
                    <option value="landscape">A4 Landscape</option>
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={() => setTemplatesOpen((value) => !value)} aria-expanded={templatesOpen} className="fm-document-control h-9 rounded-full border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 lg:border-white/10 lg:bg-white/[0.06] lg:text-white">
                    Page style
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setTemplateGalleryOpen(true)} className="fm-document-control h-9 rounded-full border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 lg:border-white/10 lg:bg-white/[0.06] lg:text-white">
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Templates
                  </Button>
                </div>
                {templatesOpen && (
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    {templates.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setTemplate(item.key);
                          setTemplatesOpen(false);
                        }}
                        aria-pressed={template === item.key}
                        data-template={item.key}
                        className={`fm-template-choice rounded-xl border p-3 text-left ${
                          template === item.key
                            ? 'border-blue-500 bg-blue-50 lg:border-blue-500 lg:bg-blue-500/20'
                            : 'border-slate-200 bg-slate-50 lg:border-white/10 lg:bg-white/[0.05]'
                        }`}
                      >
                        <span className="block text-sm font-semibold lg:text-white">{item.label}</span>
                        <span className="mt-1 block text-xs text-slate-500 lg:text-white/50">{item.description}</span>
                      </button>
                    ))}
                  </div>
                )}
                <EditorToolbar
                  editor={editor}
                  onSave={handleSave}
                  onPrint={printDocument}
                  onDownload={downloadDocx}
                  onDetails={() => setDetailsOpen(true)}
                  onPageBreak={() => editor?.chain().focus().insertContent({ type: 'pageBreak' }).run()}
                  zoom={zoom}
                  onZoomChange={(value) => setZoom(value)}
                />
              </div>
            )}

            <div className="fm-document-canvas mt-2 min-h-0 min-w-0 flex-1 overflow-auto rounded-xl bg-[#202124] p-2 sm:p-5 lg:mt-3 lg:p-8">
              {documentLoadWarning && (
                <p className="mx-auto mb-3 max-w-4xl rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100" role="alert">
                  {documentLoadWarning}
                </p>
              )}
              <div className="mx-auto w-full" style={{ maxWidth: pageWidthPx }}>
                <div
                  className={`fm-document-page mx-auto bg-white text-slate-900 shadow-[0_12px_40px_rgba(0,0,0,0.35)]${isClassicCv ? ' fm-document-classic-cv' : ''}`}
                  data-template={template}
                  data-template-variant={selectedTemplate?.variant || 'default'}
                  data-hide-classic-header-nodes={classicHeaderNodeCount || undefined}
                  data-orientation={pageOrientation}
                  role="region"
                  aria-label={`Document page, A4 ${orientation}`}
                  tabIndex={0}
                  style={{
                    width: '100%',
                    maxWidth: pageWidthPx,
                    minHeight: 0,
                    aspectRatio: pageOrientation === 'portrait' ? '210 / 297' : '297 / 210',
                    zoom: zoom / 100,
                  }}
                >
                  <div className="w-full p-7 sm:p-12">
                    {isClassicCv && <ClassicCvHeader form={form} />}
                    <EditorContent editor={editor} className="document-editor" />
                  </div>
                </div>
              </div>
            </div>

            {(coachResponse || coachSuggestion) && (
              <section className="fm-document-response mt-2 max-h-[30vh] shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm lg:border-white/10 lg:bg-[#171717] lg:text-white" aria-live="polite" aria-label="FaceMeX answer">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 lg:bg-white/[0.08] lg:text-white/80">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 lg:text-white">FaceMeX</p>
                      <p className="text-[11px] text-slate-500 lg:text-white/45">{coachSuggestion ? 'Suggested edit' : 'Document assistant'}</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => { setCoachResponse(''); setCoachSuggestion(null); }} className="h-8 w-8 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:text-white/55 lg:hover:bg-white/10 lg:hover:text-white" aria-label="Dismiss response">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {coachResponse && (
                  <div className="fm-document-response-content">
                    {renderDocumentMarkdown(coachResponse)}
                  </div>
                )}
                {coachSuggestion && (
                  <>
                    <div className="fm-document-response-content">
                      {renderDocumentMarkdown(coachSuggestion.suggested)}
                    </div>
                    {coachSuggestion.explanation && (
                      <p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-6 text-slate-600 lg:border-white/10 lg:text-white/60">
                        {coachSuggestion.explanation}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" onClick={applyCoachSuggestion} className="h-9 rounded-full bg-blue-600 px-4 text-white hover:bg-blue-700">Apply edit</Button>
                      <Button type="button" variant="outline" onClick={() => setCoachSuggestion(null)} className="h-9 rounded-full border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50 lg:border-white/10 lg:bg-white/[0.04] lg:text-white lg:hover:bg-white/10">Keep original</Button>
                    </div>
                  </>
                )}
              </section>
            )}

            <div className="fm-document-composer-shell shrink-0 px-0 pt-2 sm:px-2 lg:pt-3">
              <div className="mx-auto w-full max-w-4xl">
                <div className="fm-document-composer flex items-end gap-2">
                  <select
                    value={coachMode}
                    onChange={(event) => {
                      const nextMode = event.target.value as typeof coachMode;
                      if (nextMode === 'edit' && editor) {
                        const { from, to } = editor.state.selection;
                        if (from !== to) {
                          coachSelectionRef.current = {
                            from,
                            to,
                            original: editor.state.doc.textBetween(from, to, '\n'),
                          };
                          setHasCoachSelection(true);
                        }
                      }
                      setCoachMode(nextMode);
                      setCoachResponse('');
                      setCoachSuggestion(null);
                    }}
                    aria-label="Choose document AI action"
                    disabled={coachBusy || freeAiLimitReached}
                    className="fm-document-mode-select mb-1 h-8 max-w-[40%] min-w-0 shrink-0 rounded-full border-0 bg-white/10 px-2 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Edit document</option>
                    <option value="ask">Ask</option>
                    <option value="review">Review</option>
                    <option value="edit">Edit selection</option>
                  </select>
                  <Textarea
                    ref={coachTextareaRef}
                    rows={1}
                    value={coachPrompt}
                    onChange={(event) => resizeCoachTextarea(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void askDocumentCoach(coachMode);
                      }
                    }}
                    placeholder={composerPlaceholder}
                    aria-label="Describe document changes for FaceMeX"
                    className="min-h-8 max-h-[120px] min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-1 text-[15px] leading-5 text-white/90 shadow-none placeholder:text-white/45 focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={coachBusy || freeAiLimitReached}
                  />
                  <Button
                    type="button"
                    onClick={() => void askDocumentCoach(coachMode)}
                    disabled={
                      coachBusy ||
                      freeAiLimitReached ||
                      (coachMode !== 'review' && !coachPrompt.trim()) ||
                      (coachMode === 'edit' && !hasCoachSelection)
                    }
                    aria-label={coachBusy ? 'FaceMeX is updating your document' : `Send ${coachMode} request to FaceMeX`}
                    title={coachBusy ? 'FaceMeX is working' : 'Send to FaceMeX'}
                    className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 p-0 text-white shadow-lg shadow-black/10 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-[#2b2b2b] disabled:text-white/40"
                  >
                    {coachBusy ? <Sparkles className="h-4 w-4 animate-pulse" /> : <ArrowUp className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SensitiveContentShield>
      <DocumentTemplateGallery
        open={templateGalleryOpen}
        kind={kind}
        selectedTemplateId={templateId}
        onClose={() => setTemplateGalleryOpen(false)}
        onUseTemplate={applyDocumentTemplate}
        onStartBlank={() => {
          if (editor?.getText().trim() && !window.confirm('Starting blank replaces the current document content. Continue?')) return;
          clearDocument();
          editor?.commands.setContent('<p></p>');
          setCoachResponse('');
          setCoachSuggestion(null);
          setTemplateGalleryOpen(false);
        }}
        onUpload={() => documentUploadRef.current?.click()}
      />
    </div>
  );
}
