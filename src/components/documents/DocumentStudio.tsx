import { useMemo, useState } from 'react';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { Download, FileText, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useUserStore } from '@/store/userStore';
import SensitiveContentShield from '@/components/safety/SensitiveContentShield';

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

function splitLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
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

function documentHtml(kind: DocumentKind, form: FormState, content: string, template: TemplateKey, font: FontKey, bold: boolean) {
  const lines = content.split(/\r?\n/);
  const sections = lines.map((line) => {
    const safe = escapeHtml(line);
    if (/^[A-Z][A-Z ]{3,}$/.test(line.trim())) return `<h2>${safe}</h2>`;
    return line.trim() ? `<p>${safe}</p>` : '<div class="space"></div>';
  }).join('');
  const accent = template === 'minimal' ? '#172033' : template === 'executive' ? '#0f766e' : '#2563eb';
  const header = kind === 'cv'
    ? `<div class="name">${escapeHtml(form.fullName || 'Your Name')}</div><div class="meta">${[form.email, form.phone, form.location, form.idNumber].filter(Boolean).map(escapeHtml).join('  |  ')}</div>`
    : `<div class="name">${escapeHtml(form.fullName || 'Your Name')}</div><div class="meta">${[form.email, form.phone, form.location].filter(Boolean).map(escapeHtml).join('  |  ')}</div><div class="date">${new Date().toLocaleDateString('en-ZA')}</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>FaceMeX ${kind === 'cv' ? 'CV' : 'Cover Letter'}</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;font-family:${fontFamily(font)};color:#172033}.page{width:210mm;min-height:297mm;margin:16px auto;padding:20mm;background:#fff;box-shadow:0 16px 45px rgba(15,23,42,.14);font-size:11pt;line-height:1.45;font-weight:${bold ? 600 : 400}}.header{border-top:5px solid ${accent};padding:13px 0 12px;border-bottom:1px solid #dbe2ea;margin-bottom:22px}.name{font-size:25px;font-weight:800;letter-spacing:.02em;color:#101827}.meta,.date{margin-top:6px;font-size:9.5pt;color:#526174}.date{margin-top:16px}h2{font-size:11pt;letter-spacing:.12em;color:${accent};margin:18px 0 7px;border-bottom:1px solid #dbe2ea;padding-bottom:4px}p{margin:0 0 7px;white-space:pre-wrap}.space{height:5px}@media print{body{background:#fff}.page{margin:0;box-shadow:none}}
  </style></head><body><main class="page"><header class="header">${header}</header><section>${sections}</section></main></body></html>`;
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
  const isPlus = hasTier('plus');
  const isPro = hasTier('pro');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [template, setTemplate] = useState<TemplateKey>('modern');
  const [font, setFont] = useState<FontKey>('sans');
  const [bold, setBold] = useState(false);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  const title = kind === 'cv' ? 'AI CV Studio' : 'AI Cover Letter Studio';
  const localContent = useMemo(() => kind === 'cv' ? buildLocalCv(form) : buildLocalLetter(form), [form, kind]);
  const displayedContent = content || localContent;
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

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
        setContent(String(generated || localContent));
      } else {
        setContent(localContent);
      }
      toast({ title: `${kind === 'cv' ? 'CV' : 'Cover letter'} ready`, description: isPlus ? 'AI generation and formatting are ready.' : 'Your free modern template is ready.' });
    } catch (error: any) {
      if (isPlus) {
        toast({ title: 'AI unavailable', description: 'Your local template is ready instead. You can still download it.', variant: 'destructive' });
      }
      setContent(localContent);
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(documentHtml(kind, form, displayedContent, template, font, bold));
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
    <div className="min-h-screen bg-[#eef2f7] text-slate-950">
      <SensitiveContentShield context={kind === 'cv' ? 'cv' : 'cover-letter'} className="mx-auto max-w-7xl px-3 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">FaceMeX Documents</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Build a polished A4 document, choose a layout, then download it as PDF or DOCX.</p></div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{tier} plan</div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,.08)]">
            <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FileText className="h-5 w-5" /></div><div><h2 className="font-semibold">Your details</h2><p className="text-xs text-slate-500">Free users get a modern local template.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {fields.map(([key, label]) => key === 'summary' || key === 'experience' || key === 'skills' || key === 'education' || key === 'extras'
                ? <label key={key} className="space-y-1.5 sm:col-span-2 xl:col-span-1"><span className="text-xs font-semibold text-slate-600">{label}</span><Textarea rows={key === 'experience' ? 5 : 3} value={form[key as keyof FormState]} onChange={(event) => update(key as keyof FormState, event.target.value)} placeholder={`Add ${label.toLowerCase()}...`} /></label>
                : <label key={key} className="space-y-1.5"><span className="text-xs font-semibold text-slate-600">{label}</span><Input value={form[key as keyof FormState]} onChange={(event) => update(key as keyof FormState, event.target.value)} placeholder={label} /></label>)}
            </div>
            <Button onClick={generate} disabled={busy} className="mt-5 h-11 w-full rounded-xl bg-slate-950 text-sm hover:bg-slate-800"><GenerateIcon className="mr-2 h-4 w-4" />{busy ? 'Generating...' : isPlus ? 'Generate with AI' : `Generate ${kind === 'cv' ? 'CV' : 'letter'}`}</Button>
            <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">Plus adds AI generation. Pro adds the full professional toolkit.</p>
          </section>

          <section className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_45px_rgba(15,23,42,.08)] sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Document design</h2><p className="text-xs text-slate-500">A4 preview with print-to-PDF and DOCX export.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={downloadPdf} className="rounded-xl"><Download className="mr-1.5 h-3.5 w-3.5" />PDF</Button><Button variant="outline" size="sm" onClick={downloadDocx} className="rounded-xl"><Download className="mr-1.5 h-3.5 w-3.5" />DOCX</Button></div></div>
            <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{templates.map((item) => <button key={item.key} type="button" onClick={() => setTemplate(item.key)} className={`rounded-xl border p-3 text-left transition ${template === item.key ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}><span className="block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{item.description}</span></button>)}</div>
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2"><select value={font} onChange={(event) => setFont(event.target.value as FontKey)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium"><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option></select><Button type="button" variant={bold ? 'default' : 'outline'} size="sm" onClick={() => setBold((value) => !value)} className="h-9 rounded-lg px-3 font-bold">B</Button>{isPro && <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600"><Sparkles className="h-3.5 w-3.5" />Pro design tools unlocked</span>}</div>
            <div className="overflow-auto rounded-xl bg-slate-100 p-3 sm:p-6"><iframe title="A4 document preview" srcDoc={documentHtml(kind, form, displayedContent, template, font, bold)} className="mx-auto block h-[1120px] w-[794px] max-w-none border-0 bg-white shadow-xl" /></div>
          </section>
        </div>
      </SensitiveContentShield>
    </div>
  );
}
