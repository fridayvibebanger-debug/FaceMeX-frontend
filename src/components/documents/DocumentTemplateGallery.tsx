import { useEffect, useMemo, useState } from 'react';
import { Check, FilePlus2, FileUp, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  documentTemplateCategories,
  listDocumentTemplates,
} from './documentTemplates';
import type { DocumentTemplate } from './documentTemplates';

type Props = {
  open: boolean;
  kind: string;
  selectedTemplateId: string;
  onClose: () => void;
  onUseTemplate: (template: DocumentTemplate) => void;
  onStartBlank: () => void;
  onUpload: () => void;
};

function TemplateThumbnail({ template, large = false }: { template: DocumentTemplate; large?: boolean }) {
  const accent = template.variant === 'creative' ? '#a3d900'
    : template.variant === 'clinical' || template.variant === 'technology' || template.variant === 'pitch' ? '#1769c2'
      : template.variant === 'sidebar' || template.variant === 'letter' ? '#d9d0c4'
        : '#4b73c7';

  return (
    <div
      aria-hidden="true"
      className={`fm-template-thumbnail relative overflow-hidden rounded-md bg-white text-slate-800 shadow-sm ${large ? 'min-h-48 p-4 sm:min-h-80 sm:p-8' : 'h-32 p-3'}`}
      style={{ borderTop: `5px solid ${accent}` }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="block h-2 w-[42%] rounded-full bg-slate-800/80" />
        <span className="block h-1.5 w-[23%] rounded-full" style={{ backgroundColor: `${accent}99` }} />
      </div>
      {template.variant === 'creative' && (
        <div className="mb-3 h-3 w-full" style={{ backgroundColor: accent }} />
      )}
      {template.variant === 'sidebar' && (
        <div className="absolute bottom-0 left-0 top-9 w-[31%]" style={{ backgroundColor: `${accent}28` }} />
      )}
      {template.variant === 'letter' && (
        <div className="mb-3 flex gap-2">
          <span className="h-10 w-[26%] rounded-sm" style={{ backgroundColor: `${accent}30` }} />
          <span className="mt-2 h-2 w-[56%] rounded-full bg-slate-700/80" />
        </div>
      )}
      <div className={`grid gap-2 ${template.variant === 'sidebar' ? 'ml-[34%]' : ''}`}>
        {Array.from({ length: large ? 7 : 4 }, (_, index) => (
          <div key={index} className="grid gap-1.5">
            {index % 2 === 0 && (
              <span className="block h-1.5 w-[38%] rounded-full" style={{ backgroundColor: `${accent}d9` }} />
            )}
            <span className="block h-1 w-full rounded-full bg-slate-300" />
            {index === 1 && template.documentType.includes('presentation') && (
              <span className="mt-1 grid h-12 grid-cols-4 items-end gap-1 px-2">
                {[45, 72, 54, 90].map((height, barIndex) => (
                  <i key={barIndex} className="block rounded-t-sm" style={{ height: `${height}%`, backgroundColor: `${accent}b8` }} />
                ))}
              </span>
            )}
          </div>
        ))}
      </div>
      <span className="absolute bottom-2 right-3 text-[8px] font-semibold tracking-[0.18em] text-slate-400">FACEMEX</span>
    </div>
  );
}

function TemplatePreview({ template }: { template: DocumentTemplate }) {
  const sections = template.content
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.replace(/^##\s*/, '').replace(/^SLIDE\s+\d+\s+[—-]\s*/i, ''))
    .slice(0, 6);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,0.7fr)]">
      <TemplateThumbnail template={template} large />
      <div className="flex min-w-0 flex-col">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">{template.category}</p>
        <h3 className="mt-2 text-xl font-semibold text-white">{template.name}</h3>
        <p className="mt-2 text-sm leading-6 text-white/60">{template.description}</p>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Included structure</p>
        <ul className="mt-2 grid gap-2 text-sm text-white/75">
          {sections.map((section) => <li key={section} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />{section}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default function DocumentTemplateGallery({
  open,
  kind,
  selectedTemplateId,
  onClose,
  onUseTemplate,
  onStartBlank,
  onUpload,
}: Props) {
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const templates = useMemo(() => listDocumentTemplates(kind), [kind]);
  const availableCategories = useMemo(
    () => documentTemplateCategories.filter((item) => templates.some((template) => template.category === item)),
    [templates],
  );
  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return templates.filter((template) => (
      (category === 'All' || template.category === category) &&
      (!normalizedQuery || `${template.name} ${template.description} ${template.documentType}`.toLocaleLowerCase().includes(normalizedQuery))
    ));
  }, [category, query, templates]);
  const [previewId, setPreviewId] = useState('');
  const preview = visibleTemplates.find((template) => template.id === previewId) || visibleTemplates[0];

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (previewId && !visibleTemplates.some((template) => template.id === previewId)) {
      setPreviewId('');
    }
  }, [previewId, visibleTemplates]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-template-gallery-title"
        className="flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden border border-white/10 bg-[#111214] text-white shadow-2xl sm:h-[min(90dvh,900px)] sm:max-w-6xl sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="document-template-gallery-title" className="truncate text-lg font-semibold sm:text-xl">Choose a template</h2>
            <p className="mt-0.5 text-xs text-white/50">Your current document stays unchanged until you apply a template.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 shrink-0 rounded-full text-white/65 hover:bg-white/10 hover:text-white" aria-label="Close template gallery">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:grid-rows-1">
          <div className="flex min-h-0 min-w-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="shrink-0 space-y-3 p-3 sm:p-4">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white/50 focus-within:border-blue-400/70">
                <Search className="h-4 w-4 shrink-0" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates or document types" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40" aria-label="Search templates" />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Template categories">
                {['All', ...availableCategories].map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${category === item ? 'border-blue-400/50 bg-blue-500/20 text-blue-100' : 'border-white/10 text-white/60 hover:bg-white/[0.06]'}`}>
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onStartBlank} className="h-9 rounded-full border-white/15 bg-white/[0.04] px-3 text-xs text-white hover:bg-white/10">
                  <FilePlus2 className="mr-1.5 h-4 w-4" />Blank document
                </Button>
                <Button type="button" variant="outline" onClick={onUpload} className="h-9 rounded-full border-white/15 bg-white/[0.04] px-3 text-xs text-white hover:bg-white/10">
                  <FileUp className="mr-1.5 h-4 w-4" />Upload text file
                </Button>
              </div>
              <p className="text-[11px] text-white/40">Import supports plain text and Markdown (.txt, .md, .markdown).</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pt-0 sm:p-4 sm:pt-0">
              {visibleTemplates.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {visibleTemplates.map((template) => (
                    <button
                      type="button"
                      key={template.id}
                      onClick={() => setPreviewId(template.id)}
                      aria-pressed={preview?.id === template.id}
                      className={`min-w-0 rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${preview?.id === template.id ? 'border-blue-400/70 bg-blue-400/10' : 'border-white/10 bg-white/[0.025] hover:border-white/25'}`}
                    >
                      <TemplateThumbnail template={template} />
                      <span className="mt-2 block truncate text-xs font-semibold text-white/90">{template.name}</span>
                      <span className="mt-1 block truncate text-[10px] text-white/45">{template.category}</span>
                      {template.id === selectedTemplateId && <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-300"><Check className="h-3 w-3" />Current template</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-white/10 p-4 text-sm text-white/55">No templates match this search. Choose a different document type from the workspace sidebar to browse its templates.</p>
              )}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto p-4 sm:p-6">
            {preview ? (
              <>
                <TemplatePreview template={preview} />
                <div className="mt-auto flex justify-end pt-5">
                  <Button type="button" onClick={() => onUseTemplate(preview)} className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto sm:px-6">
                    Use this template
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/55">Choose a template to preview it.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
