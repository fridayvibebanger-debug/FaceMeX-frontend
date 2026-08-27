import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { AlignCenter, AlignLeft, AlignRight, Bold, Check, ChevronDown, ChevronUp, Clipboard, Download, FileText, Highlighter, Italic, Link, List, Menu, Minus, Plus, Printer, Redo2, Save, Sparkles, Strikethrough, Underline, Undo2, Wand2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useUserStore } from '@/store/userStore';
import SensitiveContentShield from '@/components/safety/SensitiveContentShield';
type ZoomLevel = 75 | 90 | 100 | 125;

type DocumentKind = 'cv' | 'cover-letter';
type TemplateKey = 'classic' | 'modern' | 'minimal' | 'executive';
type FontKey = 'sans' | 'serif' | 'mono';

type DocumentStudioProps = {
  kind: DocumentKind;
};

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

const templates: Array<{ key: TemplateKey; label: string; description: string }> = [
  { key: 'modern', label: 'Modern', description: 'Clean accent bar with strong section hierarchy.' },
  { key: 'classic', label: 'Classic', description: 'Traditional document structure for formal applications.' },
  { key: 'minimal', label: 'Minimal', description: 'Quiet, spacious layout that keeps focus on content.' },
  { key: 'executive', label: 'Executive', description: 'Bold header and compact information blocks.' },
];

const emptyForm: FormState = {
  fullName: '', email: '', phone: '', location: '', idNumber: '', jobTitle: '', company: '',
  summary: '', experience: '', skills: '', education: '', extras: '',
};

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatInlineHtml(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<u>$1</u>')
    .replace(/--([^-]+)--/g, '<s>$1</s>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>');
}

function buildLocalCv(form: FormState) {
  return [
    'PROFESSIONAL SUMMARY', form.summary || 'Motivated professional ready to contribute strong skills and a practical work ethic.', '',
    'EXPERIENCE', form.experience || 'Add your work experience, projects, volunteering, or community work here.', '',
    'SKILLS', form.skills || 'Add your strongest job-related skills here.', '',
    'EDUCATION', form.education || 'Add your education, certificates, or training here.', '',
    'ADDITIONAL INFORMATION', form.extras || 'Add languages, links, achievements, or references here.',
  ].join('\n');
}

function buildLocalLetter(form: FormState) {
  const greeting = form.company ? `Dear Hiring Manager at ${form.company},` : 'Dear Hiring Manager,';
  return [
    greeting, '',
    `I am writing to apply for the ${form.jobTitle || 'available position'} opportunity${form.company ? ` at ${form.company}` : ''}.`, '',
    form.summary || 'I am a motivated candidate with a strong work ethic and a willingness to learn and contribute.', '',
    form.extras || 'I would welcome the opportunity to discuss how my skills and experience can support your team.', '',
    'Thank you for considering my application.', '',
    'Sincerely,', form.fullName || '[Your Name]',
  ].join('\n');
}

function fontFamily(font: FontKey) {
  if (font === 'serif') return 'Georgia, "Times New Roman", serif';
  if (font === 'mono') return '"SFMono-Regular", Consolas, monospace';
  return 'Arial, Helvetica, sans-serif';
}

function documentHtml(kind: DocumentKind, form: FormState, content: string, template: TemplateKey, font: FontKey, bold: boolean, alignment: 'left' | 'center' | 'right') {
  const lines = content.split(/\r?\n/);
  const sections = lines.map((line) => {
    const safe = formatInlineHtml(line);
    if (/^[A-Z][A-Z ]{3,}$/.test(line.trim())) return `<h2>${safe}</h2>`;
    if (/^[-*]\s+/.test(line.trim())) return `<p class="bullet">&#8226; ${formatInlineHtml(line.trim().replace(/^[-*]\s+/, ''))}</p>`;
    return line.trim() ? `<p>${safe}</p>` : '<div class="space"></div>';
  }).join('');
  const accent = template === 'minimal' ? '#172033' : template === 'executive' ? '#0f766e' : '#2563eb';
  const header = kind === 'cv'
    ? `<div class="name">${escapeHtml(form.fullName || 'Your Name')}</div><div class="meta">${[form.email, form.phone, form.location, form.idNumber].filter(Boolean).map(escapeHtml).join('  |  ')}</div>`
    : `<div class="name">${escapeHtml(form.fullName || 'Your Name')}</div><div class="meta">${[form.email, form.phone, form.location].filter(Boolean).map(escapeHtml).join('  |  ')}</div><div class="date">${new Date().toLocaleDateString('en-ZA')}</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>FaceMeX ${kind === 'cv' ? 'CV' : 'Cover Letter'}</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;font-family:${fontFamily(font)};color:#172033}.page{width:210mm;min-height:297mm;margin:16px auto;padding:20mm;background:#fff;box-shadow:0 16px 45px rgba(15,23,42,.14);font-size:11pt;line-height:1.45;font-weight:${bold ? 600 : 400};text-align:${alignment}}.header{border-top:5px solid ${accent};padding:13px 0 12px;border-bottom:1px solid #dbe2ea;margin-bottom:22px}.name{font-size:25px;font-weight:800;letter-spacing:.02em;color:#101827}.meta,.date{margin-top:6px;font-size:9.5pt;color:#526174}.date{margin-top:16px}h2{font-size:11pt;letter-spacing:.12em;color:${accent};margin:18px 0 7px;border-bottom:1px solid #dbe2ea;padding-bottom:4px}p{margin:0 0 7px;white-space:pre-wrap}.bullet{padding-left:12px}.space{height:5px}@media screen and (max-width:600px){body{background:#f8fafc}.page{width:100%;min-height:100vh;margin:0;padding:24px 20px;box-shadow:none;font-size:10pt}.name{font-size:22px}.header{margin-bottom:16px}}@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:210mm;min-height:297mm;padding:20mm}}
  </style></head><body><main class="page"><header class="header">${header}</header><section>${sections}</section></main></body></html>`;
}

function getDraftKey(kind: DocumentKind) {
  return `facemex_document_draft_${kind}`;
}

function makeDocxParagraphs(content: string, bold: boolean) {
  return content.split(/\r?\n/).map((line) => {
    const isHeading = /^[A-Z][A-Z ]{3,}$/.test(line.trim());
    return new Paragraph({
      heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
      spacing: { after: 100 },
      children: [new TextRun({ text: line, bold: bold || isHeading })],
    });
  });
}

export default function DocumentStudio({ kind }: DocumentStudioProps) {
  const { tier, hasTier } = useUserStore();
  const isPlus = String(tier).toLowerCase() === 'plus' || hasTier('pro');
  const isPro = hasTier('pro');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [template, setTemplate] = useState<TemplateKey>('modern');
  const [font, setFont] = useState<FontKey>('sans');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>(100);
  const [draftSaved, setDraftSaved] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const title = kind === 'cv' ? 'AI CV Studio' : 'AI Cover Letter Studio';
  const localContent = useMemo(() => kind === 'cv' ? buildLocalCv(form) : buildLocalLetter(form), [form, kind]);
  const displayedContent = content || localContent;
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

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
      // Ignore an unavailable or invalid local draft.
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

  const updateContent = (next: string, recordHistory = true) => {
    setContent(next);
    if (!recordHistory) return;
    setHistory((current) => [...current.slice(0, historyIndex + 1), next].slice(-50));
    setHistoryIndex((current) => Math.min(current + 1, 49));
  };

  const formatSelection = (marker: '**' | '__' | '~~' | '--' | '==') => {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return;
    const selected = displayedContent.slice(start, end);
    const next = `${displayedContent.slice(0, start)}${marker}${selected}${marker}${displayedContent.slice(end)}`;
    updateContent(next);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + marker.length, end + marker.length);
    });
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setContent(history[nextIndex]);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setContent(history[nextIndex]);
  };

  const clearDocument = () => {
    updateContent('');
    setForm(emptyForm);
  };

  const selectAll = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    editor.select();
  };

  const copyDocument = async () => {
    try {
      await navigator.clipboard.writeText(displayedContent);
      toast({ title: 'Copied', description: 'Document text copied.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select the text and copy it manually.', variant: 'destructive' });
    }
  };

  const addBullet = () => {
    const editor = editorRef.current;
    const start = editor?.selectionStart ?? displayedContent.length;
    const lineStart = displayedContent.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const next = `${displayedContent.slice(0, lineStart)}- ${displayedContent.slice(lineStart)}`;
    updateContent(next);
    requestAnimationFrame(() => editor?.focus());
  };

  const insertLink = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = displayedContent.slice(start, end) || 'link text';
    const next = `${displayedContent.slice(0, start)}${selected} (https://)${displayedContent.slice(end)}`;
    updateContent(next);
    requestAnimationFrame(() => editor.focus());
  };

  const generate = async () => {
    if (kind === 'cv' && (!form.fullName.trim() || !form.email.trim())) {
      toast({ title: 'Add your details', description: 'Enter at least your name and email first.' });
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
        const generated = kind === 'cv' ? response.resumeText : response.letter;
        updateContent(String(generated || localContent));
      } else {
        updateContent(localContent);
      }
      toast({ title: `${kind === 'cv' ? 'CV' : 'Cover letter'} ready`, description: isPlus ? 'AI generation and formatting are ready.' : 'Your free modern template is ready.' });
    } catch (error: any) {
      if (isPlus) {
        toast({ title: 'AI unavailable', description: 'Your local template is ready instead. You can still download it.', variant: 'destructive' });
      }
      updateContent(localContent);
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(documentHtml(kind, form, displayedContent, template, font, bold, alignment));
    win.document.close();
    win.focus();
    win.print();
  };

  const downloadDocx = async () => {
    const doc = new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: [
      new Paragraph({ children: [new TextRun({ text: form.fullName || (kind === 'cv' ? 'Your Name' : 'Your Name'), bold: true, size: 34 })] }),
      new Paragraph({ children: [new TextRun({ text: [form.email, form.phone, form.location].filter(Boolean).join(' | '), size: 18, color: '526174' })] }),
      ...makeDocxParagraphs(displayedContent, bold),
    ] }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facemex-${kind === 'cv' ? 'cv' : 'cover-letter'}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const fields = kind === 'cv'
    ? [['fullName', 'Full name'], ['email', 'Email'], ['phone', 'Phone'], ['location', 'Location'], ['idNumber', 'ID / Profile ID'], ['summary', 'Professional summary'], ['experience', 'Experience / projects'], ['skills', 'Skills'], ['education', 'Education'], ['extras', 'Additional information']]
    : [['fullName', 'Your name'], ['email', 'Email'], ['phone', 'Phone'], ['location', 'Location'], ['jobTitle', 'Job title'], ['company', 'Company'], ['summary', 'Your experience / summary'], ['extras', 'Why this role and other details']];
  const GenerateIcon = isPlus ? Sparkles : Wand2;

  return (
    <div className="min-h-screen bg-white text-slate-950 lg:bg-[#101318] lg:text-slate-100">
      <SensitiveContentShield context={kind === 'cv' ? 'cv' : 'cover-letter'} className="mx-auto max-w-[1440px] px-3 pb-8 pt-4 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 lg:mb-8">
          <div><p className="text-[11px] font-semibold uppercase tracking-[.22em] text-blue-500">FaceMeX Documents</p><h1 className="mt-1 text-2xl font-semibold tracking-tight lg:text-3xl">{title}</h1><p className="mt-1 max-w-2xl text-xs text-slate-500 lg:text-sm lg:text-slate-400">Create, edit, and export a polished document anywhere.</p></div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:border-slate-700 lg:bg-[#181d24] lg:text-slate-300">{tier} plan</div>
        </div>

        <div className="grid gap-5">
          {detailsOpen && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:absolute lg:left-8 lg:top-24 lg:z-30 lg:w-[380px] lg:border-slate-700 lg:bg-[#181d24] lg:p-5 lg:shadow-[0_20px_60px_rgba(0,0,0,.35)]">
            <button type="button" onClick={() => setDetailsOpen((value) => !value)} className="flex min-h-12 w-full items-center gap-3 rounded-xl text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 lg:hover:bg-white/5" aria-expanded={detailsOpen} aria-controls="document-details-panel">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1"><h2 className="font-semibold">Your details</h2><p className="text-xs text-slate-500">Free users get a modern local template.</p></div>
              {detailsOpen ? <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />}
            </button>
            {detailsOpen && <div id="document-details-panel" className="mt-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {fields.map(([key, label]) => key === 'summary' || key === 'experience' || key === 'skills' || key === 'education' || key === 'extras'
                  ? <label key={key} className="space-y-1.5 sm:col-span-2 xl:col-span-1"><span className="text-xs font-semibold text-slate-600">{label}</span><Textarea rows={key === 'experience' ? 5 : 3} value={form[key as keyof FormState]} onChange={(event) => update(key as keyof FormState, event.target.value)} placeholder={`Add ${label.toLowerCase()}...`} /></label>
                  : <label key={key} className="space-y-1.5"><span className="text-xs font-semibold text-slate-600">{label}</span><Input value={form[key as keyof FormState]} onChange={(event) => update(key as keyof FormState, event.target.value)} placeholder={label} /></label>)}
              </div>
              <Button onClick={generate} disabled={busy} className="mt-5 h-11 w-full rounded-xl bg-slate-950 text-sm hover:bg-slate-800"><GenerateIcon className="mr-2 h-4 w-4" />{busy ? 'Generating...' : isPlus ? 'Generate with AI' : `Generate ${kind === 'cv' ? 'CV' : 'letter'}`}</Button>
              <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">Plus adds AI generation. Pro adds the full professional toolkit.</p>
            </div>}
          </section>}

          <section className="relative min-h-0 min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 lg:min-h-[calc(100vh-9rem)] lg:border-slate-700 lg:bg-[#181d24] lg:p-6 lg:shadow-[0_20px_60px_rgba(0,0,0,.2)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Document design</h2><p className="text-xs text-slate-500">A4 preview with print-to-PDF and DOCX export.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setDetailsOpen((value) => !value)} className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 lg:border-slate-600 lg:bg-[#080a0d] lg:text-slate-200 lg:hover:bg-[#181d24]"><Menu className="mr-1.5 h-3.5 w-3.5" />{detailsOpen ? 'Hide details' : 'Details'}</Button><Button type="button" variant="outline" size="sm" onClick={downloadPdf} className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 lg:border-slate-600 lg:bg-[#080a0d] lg:text-slate-200 lg:hover:bg-[#181d24]"><Download className="mr-1.5 h-3.5 w-3.5" />PDF</Button><Button type="button" variant="outline" size="sm" onClick={downloadDocx} className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 lg:border-slate-600 lg:bg-[#080a0d] lg:text-slate-200 lg:hover:bg-[#181d24]"><Download className="mr-1.5 h-3.5 w-3.5" />DOCX</Button></div></div>
            <div className="mb-4 flex items-center justify-between rounded-t-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm lg:border-slate-700 lg:bg-[#080a0d] lg:text-white lg:shadow-lg">
              <div className="flex items-center gap-2"><span className="text-xs font-bold tracking-wide">Home</span><span className="text-[11px] text-slate-500 lg:text-slate-400">Document editor</span></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setTemplatesOpen((value) => !value)} className="h-9 shrink-0 gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-950 sm:h-8 lg:border-white/10 lg:bg-transparent lg:text-slate-200 lg:hover:bg-white/10 lg:hover:text-white"><Menu className="h-4 w-4" />{templatesOpen ? <><span className="hidden sm:inline">Hide templates</span><span className="sm:hidden">Hide</span></> : <><span className="hidden sm:inline">Show templates</span><span className="sm:hidden">Templates</span></>}</Button>
            </div>
            <div className="mb-4 flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto rounded-b-xl border border-t-0 border-slate-200 bg-slate-50 p-2 shadow-sm lg:flex-wrap lg:overflow-x-visible lg:border-slate-700 lg:bg-[#11151b] lg:shadow-lg">
              <span className="shrink-0 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Clipboard</span>
              <Button type="button" variant="outline" size="icon" onClick={copyDocument} className="h-10 w-10 shrink-0 rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 lg:h-9 lg:w-9 lg:border-slate-600 lg:bg-[#181d24] lg:text-slate-200 lg:hover:bg-[#252c36] lg:hover:text-white" aria-label="Copy document"><Clipboard className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={selectAll} className="h-10 w-10 shrink-0 rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 lg:h-9 lg:w-9 lg:border-slate-600 lg:bg-[#181d24] lg:text-slate-200 lg:hover:bg-[#252c36] lg:hover:text-white" aria-label="Select all text"><Check className="h-4 w-4" /></Button>
              <span className="mx-1 h-6 w-px shrink-0 bg-slate-200 lg:bg-slate-700" />
              <span className="shrink-0 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Font</span>
              <select value={font} onChange={(event) => setFont(event.target.value as FontKey)} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 lg:h-9" aria-label="Document font"><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option></select>
              <Button type="button" variant={bold ? 'default' : 'outline'} size="icon" onClick={() => { setBold((value) => !value); formatSelection('**'); }} className="h-10 w-10 shrink-0 rounded-md border-slate-200 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 lg:h-9 lg:w-9 lg:border-slate-600 lg:bg-[#181d24] lg:text-slate-200 lg:hover:bg-[#252c36] lg:hover:text-white" aria-label="Bold"><Bold className="h-4 w-4" /></Button>
              <Button type="button" variant={italic ? 'default' : 'outline'} size="icon" onClick={() => { setItalic((value) => !value); formatSelection('__'); }} className="h-10 w-10 shrink-0 rounded-md border-slate-200 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 lg:h-9 lg:w-9 lg:border-slate-600 lg:bg-[#181d24] lg:text-slate-200 lg:hover:bg-[#252c36] lg:hover:text-white" aria-label="Italic"><Italic className="h-4 w-4" /></Button>
              <Button type="button" variant={underline ? 'default' : 'outline'} size="icon" onClick={() => { setUnderline((value) => !value); formatSelection('~~'); }} className="h-10 w-10 shrink-0 rounded-md border-slate-200 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 lg:h-9 lg:w-9 lg:border-slate-600 lg:bg-[#181d24] lg:text-slate-200 lg:hover:bg-[#252c36] lg:hover:text-white" aria-label="Underline"><Underline className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={() => formatSelection('--')} className="h-10 w-10 shrink-0 rounded-md border-slate-200 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 lg:h-9 lg:w-9 lg:border-slate-600 lg:bg-[#181d24] lg:text-slate-200 lg:hover:bg-[#252c36] lg:hover:text-white" aria-label="Strikethrough"><Strikethrough className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={() => formatSelection('==')} className="h-10 w-10 shrink-0 rounded-md border-slate-200 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 lg:h-9 lg:w-9 lg:border-slate-600 lg:bg-[#181d24] lg:text-slate-200 lg:hover:bg-[#252c36] lg:hover:text-white" aria-label="Highlight text"><Highlighter className="h-4 w-4" /></Button>
              <span className="mx-1 h-6 w-px shrink-0 bg-slate-700" />
              <Button type="button" variant={alignment === 'left' ? 'default' : 'outline'} size="icon" onClick={() => setAlignment('left')} className="h-9 w-9 shrink-0 rounded-md" aria-label="Align left"><AlignLeft className="h-4 w-4" /></Button>
              <Button type="button" variant={alignment === 'center' ? 'default' : 'outline'} size="icon" onClick={() => setAlignment('center')} className="h-9 w-9 shrink-0 rounded-md" aria-label="Align center"><AlignCenter className="h-4 w-4" /></Button>
              <Button type="button" variant={alignment === 'right' ? 'default' : 'outline'} size="icon" onClick={() => setAlignment('right')} className="h-9 w-9 shrink-0 rounded-md" aria-label="Align right"><AlignRight className="h-4 w-4" /></Button>
              <span className="mx-1 h-6 w-px shrink-0 bg-slate-200 lg:bg-slate-700" />
              <Button type="button" variant="outline" size="icon" onClick={undo} disabled={historyIndex <= 0} className="h-9 w-9 rounded-lg" aria-label="Undo"><Undo2 className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} className="h-9 w-9 rounded-lg" aria-label="Redo"><Redo2 className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={addBullet} className="h-9 w-9 rounded-lg" aria-label="Add bullet list"><List className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={insertLink} className="h-9 w-9 shrink-0 rounded-md" aria-label="Insert link"><Link className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={() => window.print()} className="h-9 w-9 shrink-0 rounded-md" aria-label="Print document"><Printer className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={clearDocument} className="h-9 w-9 shrink-0 rounded-md text-slate-500 hover:text-red-600" aria-label="Clear document"><X className="h-4 w-4" /></Button>
              <span className="mx-1 h-6 w-px shrink-0 bg-slate-200 lg:bg-slate-700" />
              <Button type="button" variant="outline" size="icon" onClick={() => setZoom((value) => Math.max(75, value - 15) as ZoomLevel)} disabled={zoom === 75} className="h-9 w-9 rounded-lg" aria-label="Zoom out"><Minus className="h-4 w-4" /></Button>
              <span className="min-w-12 text-center text-xs font-semibold text-slate-600">{zoom}%</span>
              <Button type="button" variant="outline" size="icon" onClick={() => setZoom((value) => Math.min(125, value + 15) as ZoomLevel)} disabled={zoom === 125} className="h-9 w-9 rounded-lg" aria-label="Zoom in"><Plus className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setZoom(100)} disabled={zoom === 100} className="h-9 rounded-lg px-2 text-xs" aria-label="Reset zoom">Reset</Button>
              {draftSaved && <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600"><Save className="h-3.5 w-3.5" />Saved</span>}
            </div>
            {templatesOpen && <aside className="mb-4 max-h-[52vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:absolute lg:left-0 lg:top-0 lg:z-10 lg:mb-0 lg:h-full lg:max-h-none lg:w-60 lg:rounded-r-xl lg:rounded-l-none lg:border-slate-700 lg:bg-[#11151b] lg:shadow-lg"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-blue-600 lg:text-blue-400">Design library</p><h3 className="mt-1 text-sm font-semibold text-slate-900 lg:text-white">CV templates</h3></div><Button type="button" variant="ghost" size="icon" onClick={() => setTemplatesOpen(false)} className="h-9 w-9 shrink-0 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950 lg:text-slate-400 lg:hover:bg-white/10 lg:hover:text-white" aria-label="Hide templates"><X className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 gap-2 lg:grid-cols-1">{templates.map((item) => <button key={item.key} type="button" onClick={() => setTemplate(item.key)} className={`min-h-20 rounded-lg border p-3 text-left transition active:scale-[.98] ${template === item.key ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 lg:bg-blue-500/15' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 lg:border-slate-700 lg:bg-[#181d24] lg:hover:border-slate-500 lg:hover:bg-[#202631]'}`}><span className="block text-sm font-semibold text-slate-900 lg:text-white">{item.label}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500 sm:text-[11px] lg:text-slate-400">{item.description}</span></button>)}</div></aside>}
            <div className="mb-4 overflow-auto rounded-xl bg-slate-100 p-2 sm:p-6 lg:bg-[#0e1116]">
              <div className="mx-auto max-w-[794px] overflow-hidden" style={{ minHeight: `${Math.round(1120 * zoom / 100)}px` }}>
                <iframe title="A4 document preview" srcDoc={documentHtml(kind, form, displayedContent, template, font, bold, alignment)} className="block h-[1120px] w-full border-0 bg-white shadow-xl" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${10000 / zoom}%` }} />
              </div>
            </div>
            <label className="mb-4 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Edit document text</span><textarea ref={editorRef} value={displayedContent} onChange={(event) => updateContent(event.target.value)} className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 outline-none ring-blue-500 focus:ring-2" /></label>
          </section>
        </div>
      </SensitiveContentShield>
    </div>
  );
}
