import { useEffect, useMemo, useState } from 'react';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
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
import { Extension } from '@tiptap/core';
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
import { useUserStore } from '@/store/userStore';
import SensitiveContentShield from '@/components/safety/SensitiveContentShield';
import EditorToolbar from './EditorToolbar';

type DocumentKind = 'cv' | 'cover-letter' | 'portfolio' | 'bio' | 'linkedin-profile' | 'portfolio-website';
type TemplateKey = 'classic' | 'modern' | 'minimal' | 'executive';
type FontKey = 'sans' | 'serif' | 'mono';
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

type Props = { kind: DocumentKind; documentId?: string; documentName?: string };

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
    form.summary || 'Motivated professional ready to contribute strong skills and a practical work ethic.',
    '',
    'EXPERIENCE',
    form.experience || 'Add work experience, projects, volunteering, or community work.',
    '',
    'SKILLS',
    form.skills || 'Add your strongest job-related skills.',
    '',
    'EDUCATION',
    form.education || 'Add education, certificates, or training.',
    '',
    'ADDITIONAL INFORMATION',
    form.extras || 'Add languages, links, achievements, or references.',
  ].join('\n');
}

function buildLocalLetter(form: FormState) {
  return [
    form.company ? `Dear Hiring Manager at ${form.company},` : 'Dear Hiring Manager,',
    '',
    `I am writing to apply for the ${form.jobTitle || 'available position'} opportunity${form.company ? ` at ${form.company}` : ''}.`,
    '',
    form.summary || 'I am a motivated candidate with a strong work ethic and a willingness to learn and contribute.',
    '',
    form.extras || 'I would welcome the opportunity to discuss how my skills and experience can support your team.',
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
    form.summary || 'Brief description of your work and expertise.',
    '',
    'FEATURED PROJECTS',
    form.experience || 'Add your featured projects, case studies, and notable work.',
    '',
    'SKILLS & EXPERTISE',
    form.skills || 'List your key skills and technical expertise.',
    '',
    'LINKS & CONTACT',
    form.extras || 'Add portfolio links, social media, and contact information.',
  ].join('\n');
}

function buildLocalBio(form: FormState) {
  return [
    'PROFESSIONAL BIOGRAPHY',
    form.fullName || 'Your Name',
    form.jobTitle || 'Professional Title',
    '',
    'ABOUT',
    form.summary || 'Write a compelling professional biography highlighting your expertise, achievements, and career highlights.',
    '',
    'BACKGROUND',
    form.education || 'Describe your educational background and professional journey.',
    '',
    'EXPERTISE',
    form.skills || 'Highlight your core competencies and areas of expertise.',
    '',
    'CONTACT',
    form.extras || 'Add contact information and social media links.',
  ].join('\n');
}

function buildLocalLinkedInProfile(form: FormState) {
  return [
    form.fullName || 'Your Name',
    form.jobTitle || 'Professional Headline',
    '',
    'ABOUT',
    form.summary || 'A compelling summary of your professional background, skills, and career goals. Share your unique value proposition.',
    '',
    'EXPERIENCE',
    form.experience || 'Add your work experience with key achievements and responsibilities.',
    '',
    'SKILLS',
    form.skills || 'List your top professional skills.',
    '',
    'EDUCATION',
    form.education || 'Add your educational background.',
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
    form.summary || 'Tell your story. Share your background, passion, and what drives you professionally.',
    '',
    'SERVICES / EXPERTISE',
    form.skills || 'Describe the services or expertise you offer.',
    '',
    'PORTFOLIO / WORK',
    form.experience || 'Showcase your best work with descriptions and results.',
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

function getDraftKey(kind: DocumentKind, documentId?: string) {
  return documentId ? `facemex_document_draft_${documentId}` : `facemex_document_draft_${kind}`;
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
) {
  const accent = template === 'minimal'
    ? '#172033'
    : template === 'executive'
      ? '#0f766e'
      : '#2563eb';

  const header = kind === 'cv'
    ? `<div class="name">${escapeHtml(form.fullName || 'Your Name')}</div><div class="meta">${[form.email, form.phone, form.location, form.idNumber].filter(Boolean).map(escapeHtml).join('  |  ')}</div>`
    : `<div class="name">${escapeHtml(form.fullName || 'Your Name')}</div><div class="meta">${[form.email, form.phone, form.location].filter(Boolean).map(escapeHtml).join('  |  ')}</div><div class="date">${new Date().toLocaleDateString('en-ZA')}</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>FaceMeX ${kind === 'cv' ? 'CV' : 'Cover Letter'}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;font-family:${fontFamily(font)};color:#172033}.page{width:210mm;min-height:297mm;margin:16px auto;padding:20mm;background:#fff;box-shadow:0 16px 45px rgba(15,23,42,.14);font-size:11pt;line-height:1.45;text-align:${alignment}}.header{border-top:5px solid ${accent};padding:13px 0 12px;border-bottom:1px solid #dbe2ea;margin-bottom:22px}.name{font-size:25px;font-weight:800;letter-spacing:.02em;color:#101827}.meta,.date{margin-top:6px;font-size:9.5pt;color:#526174}.date{margin-top:16px}h2{font-size:11pt;letter-spacing:.12em;color:${accent};margin:18px 0 7px;border-bottom:1px solid #dbe2ea;padding-bottom:4px}p{margin:0 0 7px;white-space:pre-wrap}ul,ol{padding-left:20px;margin:0 0 10px}li{margin:0 0 4px}mark{background:${highlightColor};padding:0 .12em}.space{height:5px}@media screen and (max-width:600px){body{background:#f8fafc}.page{width:100%;min-height:100vh;margin:0;padding:24px 20px;box-shadow:none;font-size:10pt}.name{font-size:22px}.header{margin-bottom:16px}}@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:210mm;min-height:297mm;padding:20mm}}</style></head><body><main class="page"><header class="header">${header}</header><section>${content}</section></main></body></html>`;
}

function makeDocxParagraphs(content: string) {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const heading = /^[A-Z][A-Z ]{3,}$/.test(line.trim());
      return new Paragraph({
        heading: heading ? HeadingLevel.HEADING_2 : undefined,
        spacing: { after: 100 },
        children: [new TextRun({ text: line, bold: heading })],
      });
    });
}

export default function DocumentStudio({ kind, documentId, documentName }: Props) {
  const { tier, hasTier } = useUserStore();
  const isPlus = String(tier).toLowerCase() === 'plus' || hasTier('pro');
  const isPro = hasTier('pro');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [template, setTemplate] = useState<TemplateKey>('modern');
  const [font, setFont] = useState<FontKey>('sans');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [zoom, setZoom] = useState<ZoomLevel>(100);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    try {
      const draft = JSON.parse(localStorage.getItem(getDraftKey(kind, documentId)) || 'null');
      if (draft?.form) setForm({ ...emptyForm, ...draft.form });
      if (typeof draft?.content === 'string' && draft.content.trim()) setContent(draft.content);
      if (draft?.template) setTemplate(draft.template);
      if (draft?.font) setFont(draft.font);
      if (draft?.alignment) setAlignment(draft.alignment);
    } catch {
      // ignore invalid drafts
    }
  }, [kind, documentId]);

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(getDraftKey(kind, documentId), JSON.stringify({ form, content, template, font, alignment }));
        setDraftSaved(true);
      } catch {
        setDraftSaved(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [alignment, content, font, form, kind, template, documentId]);

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

    win.document.write(documentHtml(kind, form, content, template, font, alignment, highlightColor));
    win.document.close();
    win.focus();
    win.print();
  };

  const downloadDocx = async () => {
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children: [
          new Paragraph({ children: [new TextRun({ text: form.fullName || 'Your Name', bold: true, size: 34 })] }),
          ...makeDocxParagraphs(content.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n')),
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

  const handleSave = () => {
    try {
      localStorage.setItem(getDraftKey(kind, documentId), JSON.stringify({ form, content, template, font, alignment }));
      setDraftSaved(true);
      toast({ title: 'Saved', description: 'Your draft has been saved.' });
    } catch {
      toast({ title: 'Save failed', description: 'Your browser blocked draft saving.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 lg:bg-black lg:text-white">
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
            <span className="text-xs text-slate-500 lg:text-white/50">{draftSaved ? 'Saved ✓' : 'Unsaved changes'}</span>
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

          <aside className={`w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:border-white/10 lg:bg-white/[0.04] xl:w-[280px] ${
            sidebarOpen ? 'block' : 'hidden xl:block'
          }`}>
            <button
              type="button"
              onClick={() => setDetailsOpen((value) => !value)}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl text-left hover:bg-slate-50 lg:hover:bg-white/5"
            >
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm lg:text-white">Your details</strong>
                <small className="block text-xs text-slate-500 lg:text-white/50">Tap to {detailsOpen ? 'hide' : 'show'}</small>
              </span>
              {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {detailsOpen && (
              <div className="mt-4 space-y-3">
                {fields.map(([key, label]) =>
                  key === 'summary' || key === 'experience' || key === 'skills' || key === 'education' || key === 'extras'
                    ? (
                        <label key={key} className="block space-y-1">
                          <span className="text-xs font-semibold text-slate-600 lg:text-white/70">{label}</span>
                          <Textarea
                            rows={key === 'experience' ? 4 : 3}
                            value={form[key as keyof FormState]}
                            onChange={(event) => update(key as keyof FormState, event.target.value)}
                            className="lg:border-white/10 lg:bg-white/[0.04] lg:text-white"
                          />
                        </label>
                      )
                    : (
                        <label key={key} className="block space-y-1">
                          <span className="text-xs font-semibold text-slate-600 lg:text-white/70">{label}</span>
                          <Input
                            value={form[key as keyof FormState]}
                            onChange={(event) => update(key as keyof FormState, event.target.value)}
                            className="lg:border-white/10 lg:bg-white/[0.04] lg:text-white"
                          />
                        </label>
                      ),
                )}

                <Button onClick={generate} disabled={busy} className="h-11 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 lg:bg-blue-600 lg:hover:bg-blue-700">
                  <Icon className="mr-2 h-4 w-4" />
                  {busy ? 'Generating...' : isPlus ? 'Generate with AI' : 'Generate document'}
                </Button>
              </div>
            )}
          </aside>

          <main className="min-h-[calc(100vh-9rem)] min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 lg:border-white/10">
              <div>
                <h2 className="font-semibold lg:text-white">Document editor</h2>
                <p className="text-xs text-slate-500 lg:text-white/50">A4 workspace</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={printDocument} className="rounded-xl h-9 lg:border-white/10 lg:bg-white/[0.06] lg:text-white lg:hover:bg-white/10">
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={downloadDocx} className="rounded-xl h-9 lg:border-white/10 lg:bg-white/[0.06] lg:text-white lg:hover:bg-white/10">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  DOCX
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-t-xl border border-slate-200 bg-slate-50 px-3 py-2 lg:border-white/10 lg:bg-white/[0.03]">
              <span className="text-xs font-bold lg:text-white">Home</span>
              <Button variant="ghost" size="sm" onClick={() => setTemplatesOpen((value) => !value)} className="rounded-md lg:text-white lg:hover:bg-white/10">
                <Menu className="mr-1.5 h-4 w-4" />
                {templatesOpen ? 'Hide templates' : 'Templates'}
              </Button>
            </div>

            <div className="rounded-b-xl border border-t-0 border-slate-200 bg-slate-50 p-2 lg:border-white/10 lg:bg-white/[0.02]">
              <EditorToolbar
                editor={editor}
                onSave={handleSave}
                onPrint={printDocument}
                onDownload={downloadDocx}
                onDetails={() => setDetailsOpen(true)}
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
              <div className="mx-auto overflow-hidden" style={{ width: '100%', maxWidth: 794, minHeight: `${Math.round(1120 * zoom / 100)}px` }}>
                <div className="block border-0 bg-white shadow-xl" style={{ width: '100%', minHeight: '1120px', transform: `scale(${zoom / 100})`, transformOrigin: 'top center', marginBottom: `${Math.round(1120 * (zoom / 100 - 1))}px` }}>
                  <div className="w-full bg-white p-4" style={{ minHeight: '1120px' }}>
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
