import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { ChevronDown, ChevronUp, Download, FileText, Menu, Printer, Save, Sparkles, Wand2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useUserStore } from '@/store/userStore';
import SensitiveContentShield from '@/components/safety/SensitiveContentShield';
import EditorToolbar from './EditorToolbar';

type DocumentKind = 'cv' | 'cover-letter';
type TemplateKey = 'classic' | 'modern' | 'minimal' | 'executive';
type FontKey = 'sans' | 'serif' | 'mono';
type ZoomLevel = 75 | 90 | 100 | 125;
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
};

type Props = { kind: DocumentKind };

const templates: Array<{ key: TemplateKey; label: string; description: string }> = [
  { key: 'modern', label: 'Modern', description: 'Clean accent bar and clear hierarchy.' },
  { key: 'classic', label: 'Classic', description: 'Traditional formal application layout.' },
  { key: 'minimal', label: 'Minimal', description: 'Quiet, spacious and easy to scan.' },
  { key: 'executive', label: 'Executive', description: 'Bold header for senior applications.' },
];

const emptyForm: FormState = {
  fullName: '', email: '', phone: '', location: '', idNumber: '',
  jobTitle: '', company: '', summary: '', experience: '', skills: '',
  education: '', extras: ''
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInlineHtml(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<u>$1</u>')
    .replace(/--([^-]+)--/g, '<s>$1</s>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>');
}

function getDraftKey(kind: DocumentKind) {
  return `facemex_document_draft_${kind}`;
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
    form.extras || 'Add languages, links, achievements, or references.'
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
    form.fullName || '[Your Name]'
  ].join('\n');
}

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
  bold: boolean,
  alignment: 'left' | 'center' | 'right' | 'justify',
  highlightColor: string
) {
  const sections = content
    .split(/\r?\n/)
    .map((line) => {
      const safe = formatInlineHtml(line);
      if (/^[A-Z][A-Z ]{3,}$/.test(line.trim())) return `<h2>${safe}</h2>`;
      if (/^[-*]\s+/.test(line.trim())) return `<p class="bullet">&#8226; ${formatInlineHtml(line.trim().replace(/^[-*]\s+/, ''))}</p>`;
      return line.trim() ? `<p>${safe}</p>` : '<div class="space"></div>';
    })
    .join('');

  const accent = template === 'minimal'
    ? '#172033'
    : template === 'executive'
      ? '#0f766e'
      : '#2563eb';

  const header = kind === 'cv'
    ? `<div class="name">${escapeHtml(form.fullName || 'Your Name')}</div><div class="meta">${[form.email, form.phone, form.location, form.idNumber].filter(Boolean).map(escapeHtml).join('  |  ')}</div>`
    : `<div class="name">${escapeHtml(form.fullName || 'Your Name')}</div><div class="meta">${[form.email, form.phone, form.location].filter(Boolean).map(escapeHtml).join('  |  ')}</div><div class="date">${new Date().toLocaleDateString('en-ZA')}</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>FaceMeX ${kind === 'cv' ? 'CV' : 'Cover Letter'}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;font-family:${fontFamily(font)};color:#172033}.page{width:210mm;min-height:297mm;margin:16px auto;padding:20mm;background:#fff;box-shadow:0 16px 45px rgba(15,23,42,.14);font-size:11pt;line-height:1.45;font-weight:${bold ? 600 : 400};text-align:${alignment}}.header{border-top:5px solid ${accent};padding:13px 0 12px;border-bottom:1px solid #dbe2ea;margin-bottom:22px}.name{font-size:25px;font-weight:800;letter-spacing:.02em;color:#101827}.meta,.date{margin-top:6px;font-size:9.5pt;color:#526174}.date{margin-top:16px}h2{font-size:11pt;letter-spacing:.12em;color:${accent};margin:18px 0 7px;border-bottom:1px solid #dbe2ea;padding-bottom:4px}p{margin:0 0 7px;white-space:pre-wrap}.bullet{padding-left:12px}mark{background:${highlightColor};padding:0 .12em}.space{height:5px}@media screen and (max-width:600px){body{background:#f8fafc}.page{width:100%;min-height:100vh;margin:0;padding:24px 20px;box-shadow:none;font-size:10pt}.name{font-size:22px}.header{margin-bottom:16px}}@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:210mm;min-height:297mm;padding:20mm}}</style></head><body><main class="page"><header class="header">${header}</header><section>${sections}</section></main></body></html>`;
}

function makeDocxParagraphs(content: string, bold: boolean) {
  return content.split(/\r?\n/).map((line) => {
    const heading = /^[A-Z][A-Z ]{3,}$/.test(line.trim());
    return new Paragraph({
      heading: heading ? HeadingLevel.HEADING_2 : undefined,
      spacing: { after: 100 },
      children: [new TextRun({ text: line, bold: bold || heading })],
    });
  });
}

export default function DocumentStudio({ kind }: Props) {
  const { tier, hasTier } = useUserStore();
  const isPlus = String(tier).toLowerCase() === 'plus' || hasTier('pro');
  const isPro = hasTier('pro');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [content, setContent] = useState('');
  const [template, setTemplate] = useState<TemplateKey>('modern');
  const [font, setFont] = useState<FontKey>('sans');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [zoom, setZoom] = useState<ZoomLevel>(100);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const title = kind === 'cv' ? 'AI CV Studio' : 'AI Cover Letter Studio';
  const localContent = useMemo(() => kind === 'cv' ? buildLocalCv(form) : buildLocalLetter(form), [form, kind]);
  const displayedContent = content || localContent;

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateContent = (next: string) => {
    setContent(next);
    setHistory((current) => [...current.slice(0, historyIndex + 1), next].slice(-50));
    setHistoryIndex((current) => Math.min(current + 1, 49));
  };

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(getDraftKey(kind)) || 'null');
      if (draft?.form) setForm({ ...emptyForm, ...draft.form });
      if (typeof draft?.content === 'string') setContent(draft.content);
      if (draft?.template) setTemplate(draft.template);
      if (draft?.font) setFont(draft.font);
      if (typeof draft?.bold === 'boolean') setBold(draft.bold);
      if (draft?.alignment) setAlignment(draft.alignment);
    } catch {
      // ignore draft errors
    }
  }, [kind]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(getDraftKey(kind), JSON.stringify({ form, content, template, font, bold, alignment }));
        setDraftSaved(true);
      } catch {
        setDraftSaved(false);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [alignment, bold, content, font, form, kind, template]);

  useEffect(() => {
    if (history.length === 0 && !content) {
      setHistory([localContent]);
      setHistoryIndex(0);
    }
  }, [content, history.length, localContent]);

  const formatSelection = (marker: '**' | '__' | '~~' | '--' | '==') => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return;

    const selected = displayedContent.slice(start, end);
    updateContent(`${displayedContent.slice(0, start)}${marker}${selected}${marker}${displayedContent.slice(end)}`);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + marker.length, end + marker.length);
    });
  };

  const selectAll = () => {
    editorRef.current?.focus();
    editorRef.current?.select();
  };

  const copyDocument = async () => {
    try {
      await navigator.clipboard.writeText(displayedContent);
      toast({ title: 'Copied', description: 'Document text copied.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select and copy the text manually.', variant: 'destructive' });
    }
  };

  const pasteDocument = async () => {
    try {
      const pasted = await navigator.clipboard.readText();
      if (!pasted) return;
      const editor = editorRef.current;
      const start = editor?.selectionStart ?? displayedContent.length;
      const end = editor?.selectionEnd ?? start;
      updateContent(`${displayedContent.slice(0, start)}${pasted}${displayedContent.slice(end)}`);
    } catch {
      toast({ title: 'Paste unavailable', description: 'Use your device paste command.', variant: 'destructive' });
    }
  };

  const addBullet = () => {
    const editor = editorRef.current;
    const start = editor?.selectionStart ?? displayedContent.length;
    const lineStart = displayedContent.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    updateContent(`${displayedContent.slice(0, lineStart)}- ${displayedContent.slice(lineStart)}`);
  };

  const insertLink = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = displayedContent.slice(start, end) || 'link text';
    const url = window.prompt('Add a URL', 'https://');
    if (!url) return;

    updateContent(`${displayedContent.slice(0, start)}${selected} (${url})${displayedContent.slice(end)}`);
  };

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
      if (isPlus) {
        const endpoint = kind === 'cv' ? '/api/ai/pro/resume-builder' : '/api/ai/pro/cover-letter';
        const payload = kind === 'cv'
          ? { ...form, tier: isPro ? 'pro' : 'plus', template }
          : { jobTitle: form.jobTitle, company: form.company, resumeSummary: form.summary, extras: form.extras, candidateName: form.fullName, tier: isPro ? 'pro' : 'plus', template };

        const response = await api.post(endpoint, payload);
        updateContent(String(kind === 'cv' ? response.resumeText || localContent : response.letter || localContent));
      } else {
        updateContent(localContent);
      }

      toast({ title: 'Document ready', description: isPlus ? 'AI generation complete.' : 'Free template generated.' });
    } catch {
      updateContent(localContent);
      toast({ title: 'Using local template', description: 'You can still edit and download your document.' });
    } finally {
      setBusy(false);
    }
  };

  const printDocument = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(documentHtml(kind, form, displayedContent, template, font, bold, alignment, highlightColor));
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
          ...makeDocxParagraphs(displayedContent, bold),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facemex-${kind}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearDocument = () => {
    setForm(emptyForm);
    setContent('');
    setBold(false);
    setItalic(false);
    setUnderline(false);
    setAlignment('left');
    setHighlightColor('#fef08a');
    setFont('sans');
  };

  const fields = kind === 'cv'
    ? [
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
      ]
    : [
        ['fullName', 'Your name'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['location', 'Location'],
        ['jobTitle', 'Job title'],
        ['company', 'Company'],
        ['summary', 'Your experience / summary'],
        ['extras', 'Why this role and other details'],
      ];

  const Icon = isPlus ? Sparkles : Wand2;

  const handleSave = () => {
    try {
      localStorage.setItem(getDraftKey(kind), JSON.stringify({ form, content, template, font, bold, alignment }));
      setDraftSaved(true);
      toast({ title: 'Saved', description: 'Your draft has been saved.' });
    } catch {
      toast({ title: 'Save failed', description: 'Your browser blocked draft saving.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 lg:bg-[#101318] lg:text-slate-100">
      <SensitiveContentShield
        context={kind === 'cv' ? 'cv' : 'cover-letter'}
        className="mx-auto max-w-[1500px] px-3 pb-8 pt-4 sm:px-6 lg:px-8 lg:pt-7"
      >
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-blue-500">FaceMeX Documents</p>
            <h1 className="mt-1 text-2xl font-semibold lg:text-3xl">{title}</h1>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase lg:border-slate-700 lg:bg-[#181d24] lg:text-slate-300">
            {tier} plan
          </span>
        </div>

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:border-slate-700 lg:bg-[#181d24]">
            <button
              type="button"
              onClick={() => setDetailsOpen((value) => !value)}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl text-left hover:bg-slate-50 lg:hover:bg-white/5"
            >
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">Your details</strong>
                <small className="block text-xs text-slate-500">Tap to {detailsOpen ? 'hide' : 'show'}</small>
              </span>
              {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {detailsOpen && (
              <div className="mt-4 space-y-3">
                {fields.map(([key, label]) =>
                  key === 'summary' || key === 'experience' || key === 'skills' || key === 'education' || key === 'extras'
                    ? (
                        <label key={key} className="block space-y-1">
                          <span className="text-xs font-semibold text-slate-600 lg:text-slate-300">{label}</span>
                          <Textarea
                            rows={key === 'experience' ? 4 : 3}
                            value={form[key as keyof FormState]}
                            onChange={(event) => update(key as keyof FormState, event.target.value)}
                          />
                        </label>
                      )
                    : (
                        <label key={key} className="block space-y-1">
                          <span className="text-xs font-semibold text-slate-600 lg:text-slate-300">{label}</span>
                          <Input
                            value={form[key as keyof FormState]}
                            onChange={(event) => update(key as keyof FormState, event.target.value)}
                          />
                        </label>
                      )
                )}

                <Button onClick={generate} disabled={busy} className="h-11 w-full rounded-xl bg-slate-950 text-white">
                  <Icon className="mr-2 h-4 w-4" />
                  {busy ? 'Generating...' : isPlus ? 'Generate with AI' : 'Generate document'}
                </Button>
              </div>
            )}
          </aside>

          <main className="min-h-[calc(100vh-9rem)] min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:border-slate-700 lg:bg-[#181d24] lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 lg:border-slate-700">
              <div>
                <h2 className="font-semibold">Document editor</h2>
                <p className="text-xs text-slate-500 lg:text-slate-400">A4 workspace</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={printDocument} className="rounded-xl">
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={downloadDocx} className="rounded-xl">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  DOCX
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-t-xl border border-slate-200 bg-slate-50 px-3 py-2 lg:border-slate-700 lg:bg-[#080a0d]">
              <span className="text-xs font-bold">Home</span>
              <Button variant="ghost" size="sm" onClick={() => setTemplatesOpen((value) => !value)} className="rounded-md">
                <Menu className="mr-1.5 h-4 w-4" />
                {templatesOpen ? 'Hide templates' : 'Templates'}
              </Button>
            </div>

            <div className="rounded-b-xl border border-t-0 border-slate-200 bg-slate-50 p-2 lg:border-slate-700 lg:bg-[#11151b]">
              <EditorToolbar
                onBold={() => {
                  setBold((value) => !value);
                  formatSelection('**');
                }}
                onItalic={() => {
                  setItalic((value) => !value);
                  formatSelection('__');
                }}
                onUnderline={() => {
                  setUnderline((value) => !value);
                  formatSelection('~~');
                }}
                onStrike={() => formatSelection('--')}
                onAlignLeft={() => setAlignment('left')}
                onAlignCenter={() => setAlignment('center')}
                onAlignRight={() => setAlignment('right')}
                onAlignJustify={() => setAlignment('justify')}
                onBulletList={addBullet}
                onNumberedList={() => {
                  const editor = editorRef.current;
                  if (!editor) return;
                  const start = editor.selectionStart;
                  const end = editor.selectionEnd;
                  const selected = displayedContent.slice(start, end);
                  updateContent(`${displayedContent.slice(0, start)}1. ${selected}${displayedContent.slice(end)}`);
                }}
                onUndo={() => {
                  if (historyIndex > 0) {
                    const index = historyIndex - 1;
                    setHistoryIndex(index);
                    setContent(history[index]);
                  }
                }}
                onRedo={() => {
                  if (historyIndex < history.length - 1) {
                    const index = historyIndex + 1;
                    setHistoryIndex(index);
                    setContent(history[index]);
                  }
                }}
                onLink={insertLink}
                onClear={clearDocument}
                onHighlight={() => formatSelection('==')}
                onHeading={(level) => {
                  const editor = editorRef.current;
                  if (!editor) return;
                  const start = editor.selectionStart;
                  const end = editor.selectionEnd;
                  const selected = displayedContent.slice(start, end) || 'Heading';
                  const marker = '#'.repeat(level);
                  updateContent(`${displayedContent.slice(0, start)}${marker} ${selected}${displayedContent.slice(end)}`);
                }}
                onIndent={() => {
                  const editor = editorRef.current;
                  if (!editor) return;
                  const start = editor.selectionStart;
                  const end = editor.selectionEnd;
                  const selected = displayedContent.slice(start, end);
                  updateContent(`${displayedContent.slice(0, start)}  ${selected}${displayedContent.slice(end)}`);
                }}
                onOutdent={() => {
                  const editor = editorRef.current;
                  if (!editor) return;
                  const start = editor.selectionStart;
                  const end = editor.selectionEnd;
                  const selected = displayedContent.slice(start, end).replace(/^  /, '');
                  updateContent(`${displayedContent.slice(0, start)}${selected}${displayedContent.slice(end)}`);
                }}
                onCopy={copyDocument}
                onPaste={pasteDocument}
                onSelectAll={selectAll}
                fontValue={font}
                sizeValue={String(16)}
                alignValue={alignment}
                highlightColor={highlightColor}
                onFontChange={(value) => setFont(value as FontKey)}
                onSizeChange={() => undefined}
                onHighlightColorChange={setHighlightColor}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                isBold={bold}
                isItalic={italic}
                isUnderline={underline}
                isStrike={false}
                onSave={handleSave}
              />
            </div>

            {templatesOpen && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:w-60 lg:grid-cols-1 lg:rounded-r-xl lg:border lg:border-slate-700 lg:bg-[#11151b] lg:p-3">
                {templates.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setTemplate(item.key);
                      setTemplatesOpen(false);
                    }}
                    className={`rounded-xl border p-3 text-left ${template === item.key ? 'border-blue-500 bg-blue-50 lg:bg-blue-500/15' : 'border-slate-200 bg-slate-50 lg:border-slate-700 lg:bg-[#181d24]'}`}
                  >
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 overflow-auto rounded-xl bg-slate-100 p-2 sm:p-5 lg:bg-[#0e1116]">
              <div className="mx-auto overflow-hidden" style={{ width: '100%', maxWidth: 794, minHeight: `${Math.round(1120 * zoom / 100)}px` }}>
                <iframe
                  title="A4 document preview"
                  srcDoc={documentHtml(kind, form, displayedContent, template, font, bold, alignment, highlightColor)}
                  className="block border-0 bg-white shadow-xl"
                  style={{ width: `${10000 / zoom}%`, height: '1120px', transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                />
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold text-slate-600 lg:text-slate-300">Edit document text</span>
              <textarea
                ref={editorRef}
                value={displayedContent}
                onChange={(event) => updateContent(event.target.value)}
                className="min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </main>
        </div>
      </SensitiveContentShield>
    </div>
  );
}
