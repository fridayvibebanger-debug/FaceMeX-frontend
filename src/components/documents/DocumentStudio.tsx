import { useEffect, useMemo, useRef, useState } from 'react';
import { AlignmentType, BorderStyle, Document, HeadingLevel, PageBreak as DocxPageBreak, Packer, Paragraph, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, TextRun, WidthType } from 'docx';
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Menu,
  Printer,
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
import { getDocument, saveDocument } from '@/lib/documents';
import { useUserStore } from '@/store/userStore';
import SensitiveContentShield from '@/components/safety/SensitiveContentShield';
import EditorToolbar from './EditorToolbar';

type DocumentKind = 'cv' | 'cover-letter' | 'portfolio' | 'bio' | 'linkedin-profile' | 'portfolio-website';
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
  extras: string;
  portfolio?: string;
  bio?: string;
  linkedinHeadline?: string;
  linkedinSummary?: string;
};

type Props = { kind: DocumentKind; documentId?: string; documentName?: string; projectId?: string | null };

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
  extras: '',
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLocalCv(form: FormState) {
  return [
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

function buildLocalLetter(form: FormState) {
  return [
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

function createEditorHtml(text: string) {
  const lines = text.split(/\r?\n/);
  const html = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<p></p>';
      if (/^[A-Z][A-Z ]{3,}$/.test(trimmed)) return `<h2>${escapeHtml(trimmed)}</h2>`;
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

function documentHtml(
  kind: DocumentKind,
  form: FormState,
  content: string,
  template: TemplateKey,
  font: FontKey,
  alignment: 'left' | 'center' | 'right' | 'justify',
  highlightColor: string,
  orientation: PageOrientation,
) {
  const accent = template === 'minimal'
    ? '#172033'
    : template === 'executive'
      ? '#0f766e'
      : '#2563eb';

  const header = kind === 'cv'
    ? `<div class="name">${escapeHtml(form.fullName || 'Your Name')}</div><div class="meta">${[form.email, form.phone, form.location, form.idNumber].filter(Boolean).map(escapeHtml).join('  |  ')}</div>`
    : `<div class="name">${escapeHtml(form.fullName || 'Your Name')}</div><div class="meta">${[form.email, form.phone, form.location].filter(Boolean).map(escapeHtml).join('  |  ')}</div><div class="date">${new Date().toLocaleDateString('en-ZA')}</div>`;

  const pageWidth = orientation === 'portrait' ? '210mm' : '297mm';
  const pageHeight = orientation === 'portrait' ? '297mm' : '210mm';
  return `<!doctype html><html><head><meta charset="utf-8"><title>FaceMeX ${kind === 'cv' ? 'CV' : 'Cover Letter'}</title><style>@page{size:A4 ${orientation};margin:0}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;font-family:${fontFamily(font)};color:#172033}.page{width:${pageWidth};min-height:${pageHeight};margin:16px auto;padding:20mm;background:#fff;box-shadow:0 16px 45px rgba(15,23,42,.14);font-size:11pt;line-height:1.45;text-align:${alignment}}.header{border-top:5px solid ${accent};padding:13px 0 12px;border-bottom:1px solid #dbe2ea;margin-bottom:22px}.name{font-size:25px;font-weight:800;letter-spacing:.02em;color:#101827}.meta,.date{margin-top:6px;font-size:9.5pt;color:#526174}.date{margin-top:16px}h2{font-size:11pt;letter-spacing:.12em;color:${accent};margin:18px 0 7px;border-bottom:1px solid #dbe2ea;padding-bottom:4px}p{margin:0 0 7px;white-space:pre-wrap}ul,ol{padding-left:20px;margin:0 0 10px}li{margin:0 0 4px}mark{background:${highlightColor};padding:0 .12em}.space{height:5px}.document-page-break{break-before:page;page-break-before:always;height:0;border:0}@media screen and (max-width:600px){body{background:#f8fafc}.page{width:100%;min-height:100vh;margin:0;padding:24px 20px;box-shadow:none;font-size:10pt}.name{font-size:22px}.header{margin-bottom:16px}}@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:${pageWidth};min-height:${pageHeight};padding:20mm}}</style></head><body><main class="page"><header class="header">${header}</header><section>${content}</section></main></body></html>`;
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

export default function DocumentStudio({ kind, documentId, documentName, projectId = null }: Props) {
  const { id: userId, tier, hasTier } = useUserStore();
  const isPlus = String(tier).toLowerCase() === 'plus' || hasTier('pro');
  const isPro = hasTier('pro');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [template, setTemplate] = useState<TemplateKey>('modern');
  const [font, setFont] = useState<FontKey>('sans');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [zoom, setZoom] = useState<ZoomLevel>(100);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachPrompt, setCoachPrompt] = useState('');
  const [coachResponse, setCoachResponse] = useState('');
  const [coachSuggestion, setCoachSuggestion] = useState<{ original: string; suggested: string; explanation: string; from: number; to: number } | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const documentSaveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const documentTitles: Record<DocumentKind, string> = {
    cv: 'AI CV Studio',
    'cover-letter': 'AI Cover Letter Studio',
    portfolio: 'Portfolio Builder',
    bio: 'Bio Builder',
    'linkedin-profile': 'LinkedIn Profile',
    'portfolio-website': 'Portfolio Website',
  };

  const title = documentName || documentTitles[kind];

  const buildLocalContent = (docKind: DocumentKind, docForm: FormState): string => {
    switch (docKind) {
      case 'cv':
        return buildLocalCv(docForm);
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
      default:
        return buildLocalCv(docForm);
    }
  };

  const localContent = useMemo(() => buildLocalContent(kind, form), [form, kind]);

  const saveDocumentWithRetry = async (key: string, draft: Parameters<typeof saveDocument>[1]) => {
    const save = documentSaveQueue.current.catch(() => undefined).then(async () => {
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

  const [content, setContent] = useState(() => createEditorHtml(localContent));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
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
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
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
          if (metadata.form) setForm({ ...emptyForm, ...(metadata.form as Partial<FormState>) });
          setContent(saved.content || '<p></p>');
          if (metadata.template) setTemplate(metadata.template as TemplateKey);
          if (metadata.font) setFont(metadata.font as FontKey);
          if (metadata.alignment) setAlignment(metadata.alignment as 'left' | 'center' | 'right' | 'justify');
          if (metadata.orientation) setOrientation(metadata.orientation as PageOrientation);
          if (metadata.highlightColor) setHighlightColor(String(metadata.highlightColor));
          setDraftSaved(true);
          setSyncStatus('saved');
        } else if (localDraft) {
          if (localDraft.form) setForm({ ...emptyForm, ...localDraft.form });
          if (typeof localDraft.content === 'string' && localDraft.content.trim()) setContent(localDraft.content);
          if (localDraft.template) setTemplate(localDraft.template);
          if (localDraft.font) setFont(localDraft.font);
          if (localDraft.alignment) setAlignment(localDraft.alignment);
          if (localDraft.orientation) setOrientation(localDraft.orientation);
          if (localDraft.highlightColor) setHighlightColor(localDraft.highlightColor);
          setSyncStatus('saving');
        } else {
          setSyncStatus('saved');
        }
      } catch (error) {
        console.error('FaceMeX document load failed', error);
        if (cancelled) return;
        if (localDraft) {
          if (localDraft.form) setForm({ ...emptyForm, ...localDraft.form });
          if (typeof localDraft.content === 'string' && localDraft.content.trim()) setContent(localDraft.content);
          if (localDraft.template) setTemplate(localDraft.template);
          if (localDraft.font) setFont(localDraft.font);
          if (localDraft.alignment) setAlignment(localDraft.alignment);
          if (localDraft.orientation) setOrientation(localDraft.orientation);
          if (localDraft.highlightColor) setHighlightColor(localDraft.highlightColor);
        }
        setSyncStatus('error');
      } finally {
        if (!cancelled) setDraftHydrated(true);
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
    if (!draftHydrated) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(getDraftKey(kind, documentId, userId), JSON.stringify({ form, content, template, font, alignment, highlightColor, orientation }));
      } catch {
        setDraftSaved(false);
      }

      setSyncStatus('saving');
      const draft = {
        title,
        documentType: kind,
        content,
        metadata: { form, template, font, alignment, highlightColor, orientation },
        projectId,
      };
      void saveDocumentWithRetry(documentId || kind, draft)
        .then(() => {
          setDraftSaved(true);
          setSyncStatus('saved');
        })
        .catch((error) => {
          console.error('FaceMeX document autosave failed', error);
          setDraftSaved(false);
          setSyncStatus('error');
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [alignment, content, font, form, kind, template, documentId, highlightColor, title, userId, draftHydrated, projectId, orientation]);

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
      default:
        return [];
    }
  };

  const fields = getFields(kind);

  const Icon = isPlus ? Sparkles : Wand2;

  const generate = async () => {
    if (kind === 'cv' && (!form.fullName.trim() || !form.email.trim())) {
      toast({ title: 'Add your details', description: 'Enter your name and email first.' });
      return;
    }

    if (kind === 'cover-letter' && (!form.jobTitle.trim() && !form.company.trim() && !form.summary.trim())) {
      toast({ title: 'Add job details', description: 'Enter a job title, company, or summary first.' });
      return;
    }

    setBusy(true);
    try {
      let nextContent = createEditorHtml(localContent);
      if (isPlus) {
        const endpoint = kind === 'cv' ? '/api/ai/pro/resume-builder' : '/api/ai/pro/cover-letter';
        const payload = kind === 'cv'
          ? { ...form, tier: isPro ? 'pro' : 'plus', template }
          : { jobTitle: form.jobTitle, company: form.company, resumeSummary: form.summary, extras: form.extras, candidateName: form.fullName, tier: isPro ? 'pro' : 'plus', template };

        const response = await api.post(endpoint, payload);
        const generated = String(kind === 'cv' ? response.resumeText || localContent : response.letter || localContent);
        nextContent = createEditorHtml(generated);
      }

      setContent(nextContent);
      toast({ title: 'Document ready', description: isPlus ? 'AI generation complete.' : 'Free template generated.' });
    } catch {
      setContent(createEditorHtml(localContent));
      toast({ title: 'Using local template', description: 'You can still edit and download your document.' });
    } finally {
      setBusy(false);
    }
  };

  const printDocument = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(documentHtml(kind, form, content, template, font, alignment, highlightColor, orientation));
    win.document.close();
    win.focus();
    win.print();
  };

  const downloadDocx = async () => {
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: orientation === 'portrait' ? { width: 11906, height: 16838 } : { width: 16838, height: 11906 },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children: [
          new Paragraph({ children: [new TextRun({ text: form.fullName || 'Your Name', bold: true, size: 34 })] }),
          ...makeDocxBlocks(content),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentName || kind}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearDocument = () => {
    setForm(emptyForm);
    setContent('<p></p>');
  };

  const handleSave = async () => {
    try {
      localStorage.setItem(getDraftKey(kind, documentId, userId), JSON.stringify({ form, content, template, font, alignment, highlightColor, orientation }));
      setSyncStatus('saving');
      await saveDocumentWithRetry(documentId || kind, {
        title,
        documentType: kind,
        content,
        metadata: { form, template, font, alignment, highlightColor, orientation },
        projectId,
      });
      setDraftSaved(true);
      setSyncStatus('saved');
      toast({ title: 'Saved', description: 'Your draft has been saved.' });
    } catch (error) {
      console.error('FaceMeX document save failed', error);
      setSyncStatus('error');
      toast({ title: 'Cloud save failed', description: 'A local recovery copy is available. Check your connection and try again.', variant: 'destructive' });
    }
  };

  const askDocumentCoach = async (mode: 'ask' | 'teach' | 'review' | 'edit') => {
    const selection = editor?.state.selection;
    const original = selection && selection.from !== selection.to
      ? editor?.state.doc.textBetween(selection.from, selection.to, '\n') || ''
      : '';
    if (mode === 'edit' && !original.trim()) {
      toast({ title: 'Select document text first', description: 'Highlight the text you want FaceMeX to improve.' });
      return;
    }

    const userQuestion = coachPrompt.trim();
    if (mode === 'ask' && !userQuestion) {
      toast({ title: 'Ask FaceMeX a question', description: 'Enter what you want help with.' });
      return;
    }

    const instruction = mode === 'teach'
      ? 'Teach the user to build this document step by step. Give only the next step, explain it simply, and ask one focused question. Never invent personal facts.'
      : mode === 'review'
        ? 'Review this document for clarity, spelling, grammar, structure, repetition, and professionalism. Give specific feedback and identify missing information as questions/placeholders. Never invent qualifications, skills, experience, or dates.'
        : mode === 'edit'
          ? `Improve only the selected text. Keep all facts unchanged. Return a JSON object with string properties suggested and explanation. Selected text: ${JSON.stringify(original)}`
          : `Answer the user's document-writing question in simple language. Never invent personal facts. Question: ${userQuestion}`;

    setCoachBusy(true);
    setCoachResponse('');
    setCoachSuggestion(null);
    try {
      const response = await api.post('/api/ai/workspace', {
        prompt: `${instruction}\n\nDocument type: ${kind}\nDocument content:\n${editor?.getText() || content}\n\nUser-provided details:\n${JSON.stringify(form)}`,
        message: instruction,
        question: instruction,
        originalPrompt: userQuestion || instruction,
        intent: 'document_analysis',
        source: 'facemex-document-coach',
        directAnswer: true,
      });
      const answer = String(response?.answer || response?.reply || response?.text || response?.content || response?.data?.answer || 'FaceMeX could not provide a response. Please try again.');
      if (mode === 'edit') {
        const jsonText = answer.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        try {
          const parsed = JSON.parse(jsonText);
          setCoachSuggestion({
            original,
            suggested: String(parsed.suggested || ''),
            explanation: String(parsed.explanation || ''),
            from: selection!.from,
            to: selection!.to,
          });
        } catch {
          setCoachSuggestion({
            original,
            suggested: answer,
            explanation: 'Review this proposal before applying it. FaceMeX was asked not to add facts.',
            from: selection!.from,
            to: selection!.to,
          });
        }
      } else {
        setCoachResponse(answer);
      }
    } catch (error) {
      console.error('FaceMeX document coach request failed', error);
      toast({ title: 'FaceMeX could not complete that request', description: 'Please try again.' , variant: 'destructive' });
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
      coachSuggestion.suggested,
    ).run();
    setCoachSuggestion(null);
    toast({ title: 'Suggestion applied', description: 'You can undo this change from the editor toolbar.' });
  };

  const wordCount = (editor?.getText() || '').trim().split(/\s+/).filter(Boolean).length;
  const pageWidthPx = orientation === 'portrait' ? 794 : 1123;
  const pageHeightPx = orientation === 'portrait' ? 1123 : 794;

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
    <div className="fm-document-workspace min-h-screen bg-[#0b0b0b] text-white">
      <style>{`
        .fm-document-workspace button {
          border-color: rgba(255, 255, 255, 0.12);
          background-color: #1b1b1b;
          color: #f4f4f5;
        }
        .fm-document-workspace button:hover:not(:disabled) {
          background-color: #292929;
        }
        .fm-document-workspace input:not([type='color']),
        .fm-document-workspace textarea,
        .fm-document-workspace select {
          border-color: rgba(255, 255, 255, 0.12);
          background-color: #171717;
          color: #f4f4f5;
        }
        .fm-document-workspace option {
          background-color: #171717;
          color: #f4f4f5;
        }
      `}</style>
      <SensitiveContentShield
        context={kind === 'cv' ? 'cv' : 'cover-letter'}
        className="mx-auto max-w-[1500px] px-3 pb-8 pt-4 sm:px-6 lg:px-8 lg:pt-7"
      >
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-blue-500">FaceMeX Documents</p>
            <h1 className="mt-1 text-2xl font-semibold lg:text-3xl">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase lg:border-white/10 lg:bg-white/[0.06] lg:text-white/70">
              {tier} plan
            </span>
            <span className="text-xs text-slate-500 lg:text-white/50">
              {syncStatus === 'loading' ? 'Loading...' : syncStatus === 'saving' ? 'Saving...' : syncStatus === 'error' ? 'Unable to sync' : draftSaved ? 'Saved ✓' : 'Unsaved changes'}
            </span>
          </div>
        </div>

        <div className="flex gap-5">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 lg:flex lg:border-white/10 lg:bg-white/[0.06] lg:text-white lg:hover:bg-white/10 xl:hidden"
            aria-label="Toggle details sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>

          <aside className={`w-full rounded-2xl border border-white/10 bg-[#111111] p-4 shadow-sm xl:w-[280px] ${
            sidebarOpen ? 'block' : 'hidden xl:block'
          }`}>
            <button
              type="button"
              onClick={() => setDetailsOpen((value) => !value)}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl text-left hover:bg-white/5"
            >
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-white">Your details</strong>
                <small className="block text-xs text-white/50">Tap to {detailsOpen ? 'hide' : 'show'}</small>
              </span>
              {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {detailsOpen && (
              <div className="mt-4 space-y-3">
                {fields.map(([key, label]) =>
                  key === 'summary' || key === 'experience' || key === 'skills' || key === 'education' || key === 'extras'
                    ? (
                        <label key={key} className="block space-y-1">
                          <span className="text-xs font-semibold text-white/70">{label}</span>
                          <Textarea
                            rows={key === 'experience' ? 4 : 3}
                            value={form[key as keyof FormState]}
                            onChange={(event) => update(key as keyof FormState, event.target.value)}
                            className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                          />
                        </label>
                      )
                    : (
                        <label key={key} className="block space-y-1">
                          <span className="text-xs font-semibold text-white/70">{label}</span>
                          <Input
                            value={form[key as keyof FormState]}
                            onChange={(event) => update(key as keyof FormState, event.target.value)}
                            className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                          />
                        </label>
                      ),
                )}

                <Button onClick={generate} disabled={busy} className="h-11 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 lg:bg-blue-600 lg:hover:bg-blue-700">
                  <Icon className="mr-2 h-4 w-4" />
                  {busy ? 'Generating...' : isPlus ? 'Generate with AI' : 'Generate document'}
                </Button>

                <div className="border-t border-white/10 pt-3">
                  <Button type="button" variant="outline" onClick={() => setCoachOpen((open) => !open)} className="h-11 w-full rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/10">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {coachOpen ? 'Close Document Coach' : 'Ask FaceMeX Document Coach'}
                  </Button>
                  {coachOpen && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        value={coachPrompt}
                        onChange={(event) => setCoachPrompt(event.target.value)}
                        placeholder="Ask how to write, improve, or understand this document..."
                        className="min-h-20 border-white/10 bg-white/[0.04] text-white placeholder:text-white/40"
                        disabled={coachBusy}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" onClick={() => void askDocumentCoach('teach')} disabled={coachBusy} className="min-h-11 border-white/10 bg-white/[0.04] text-white hover:bg-white/10">
                          Teach Me
                        </Button>
                        <Button type="button" variant="outline" onClick={() => void askDocumentCoach('review')} disabled={coachBusy} className="min-h-11 border-white/10 bg-white/[0.04] text-white hover:bg-white/10">
                          Review with FaceMeX
                        </Button>
                        <Button type="button" onClick={() => void askDocumentCoach('ask')} disabled={coachBusy} className="min-h-11 bg-blue-600 text-white hover:bg-blue-700">
                          Ask
                        </Button>
                        <Button type="button" variant="outline" onClick={() => void askDocumentCoach('edit')} disabled={coachBusy} className="min-h-11 border-white/10 bg-white/[0.04] text-white hover:bg-white/10">
                          Improve Selection
                        </Button>
                      </div>
                      {coachBusy && <p className="text-xs text-white/55">FaceMeX is reviewing your document...</p>}
                      {coachResponse && <div className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-white/85">{coachResponse}</div>}
                      {coachSuggestion && (
                        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <div>
                            <p className="text-xs font-semibold text-white/55">ORIGINAL</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-white/75">{coachSuggestion.original}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white/55">SUGGESTED</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-white">{coachSuggestion.suggested}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white/55">WHY</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-white/75">{coachSuggestion.explanation}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button type="button" onClick={applyCoachSuggestion} className="min-h-11 bg-blue-600 text-white hover:bg-blue-700">Apply</Button>
                            <Button type="button" variant="outline" onClick={() => setCoachSuggestion(null)} className="min-h-11 border-white/10 bg-white/[0.04] text-white hover:bg-white/10">Keep Original</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

          <main className="min-h-[calc(100vh-9rem)] min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#111111] p-3 shadow-sm lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h2 className="font-semibold text-white">Document editor</h2>
                <p className="text-xs text-white/50">A4 {orientation} · {wordCount} words</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={orientation}
                  onChange={(event) => setOrientation(event.target.value as PageOrientation)}
                  aria-label="A4 page orientation"
                  className="h-9 rounded-xl border border-white/10 bg-white/[0.06] px-2 text-xs text-white"
                >
                  <option value="portrait">A4 Portrait</option>
                  <option value="landscape">A4 Landscape</option>
                </select>
                <Button variant="outline" size="sm" onClick={printDocument} className="rounded-xl h-9 border-white/10 bg-white/[0.06] text-white hover:bg-white/10">
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={downloadDocx} className="rounded-xl h-9 border-white/10 bg-white/[0.06] text-white hover:bg-white/10">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  DOCX
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-t-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-xs font-bold text-white">Home</span>
              <Button variant="ghost" size="sm" onClick={() => setTemplatesOpen((value) => !value)} className="rounded-md text-white hover:bg-white/10">
                <Menu className="mr-1.5 h-4 w-4" />
                {templatesOpen ? 'Hide templates' : 'Templates'}
              </Button>
            </div>

            <div className="rounded-b-xl border border-t-0 border-white/10 bg-white/[0.02] p-2">
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

            {templatesOpen && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:w-60 lg:grid-cols-1 lg:rounded-r-xl lg:border lg:border-white/10 lg:bg-white/[0.03] lg:p-3">
                {templates.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setTemplate(item.key);
                      setTemplatesOpen(false);
                    }}
                    className={`rounded-xl border p-3 text-left ${
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

            <div className="mt-3 overflow-auto rounded-xl bg-slate-100 p-2 sm:p-5 lg:bg-[#1a1a1a]">
              <div className="mx-auto overflow-hidden" style={{ width: '100%', maxWidth: pageWidthPx, minHeight: `${Math.round(pageHeightPx * zoom / 100)}px` }}>
                <div className="block border-0 bg-white shadow-xl" style={{ width: '100%', minHeight: `${pageHeightPx}px`, transform: `scale(${zoom / 100})`, transformOrigin: 'top center', marginBottom: `${Math.round(pageHeightPx * (zoom / 100 - 1))}px` }}>
                  <div className="w-full bg-white p-4" style={{ minHeight: `${pageHeightPx}px` }}>
                    <EditorContent editor={editor} className="document-editor" />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SensitiveContentShield>
    </div>
  );
}
