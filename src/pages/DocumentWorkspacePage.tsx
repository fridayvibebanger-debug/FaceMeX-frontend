import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Menu, MoreHorizontal, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import DocumentStudio, { type DocumentKind } from '@/components/documents/DocumentStudio';
import {
  deleteDocument,
  getDocument,
  listDocuments,
  saveDocument,
  type PersistedDocument,
} from '@/lib/documents';
import { useUserStore } from '@/store/userStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APPEARANCE_CHANGE_EVENT, getAppearanceMode, type AppearanceMode } from '@/lib/appearance';

type WorkspaceDocument = {
  id: string;
  name: string;
  type: DocumentKind;
  updatedAt: string;
  synced: boolean;
};

const documentTypes: Array<{ type: DocumentKind; name: string; description: string }> = [
  { type: 'cv', name: 'CV / Resume', description: 'ATS-friendly career document' },
  { type: 'cover-letter', name: 'Cover Letter', description: 'A tailored job application letter' },
  { type: 'business-plan', name: 'Business Plan', description: 'Strategy, market, operations, and financials' },
  { type: 'presentation', name: 'Presentation', description: 'A structured, slide-by-slide deck' },
  { type: 'proposal', name: 'Project Proposal', description: 'Scope, deliverables, timeline, and budget' },
  { type: 'report', name: 'Report', description: 'Evidence, analysis, and recommendations' },
  { type: 'meeting-notes', name: 'Meeting Notes', description: 'Agenda, decisions, and action items' },
  { type: 'portfolio', name: 'Portfolio', description: 'Selected projects and work samples' },
  { type: 'bio', name: 'Professional Bio', description: 'A clear professional introduction' },
  { type: 'linkedin-profile', name: 'LinkedIn Profile', description: 'Headline, summary, and experience' },
  { type: 'portfolio-website', name: 'Portfolio Website', description: 'Content for a personal portfolio site' },
];
const starterTemplateTypes: DocumentKind[] = [
  'cv',
  'business-plan',
  'presentation',
  'proposal',
  'report',
  'cover-letter',
];

const defaultDocumentKey = 'facemex-ai-resume';

function isDocumentKind(value: string): value is DocumentKind {
  return documentTypes.some((item) => item.type === value);
}

function mapPersistedDocument(document: PersistedDocument): WorkspaceDocument {
  return {
    id: document.documentKey,
    name: document.title,
    type: isDocumentKind(document.documentType) ? document.documentType : 'cv',
    updatedAt: document.updatedAt,
    synced: true,
  };
}

function localDocumentsKey(userId: string) {
  return `facemex_document_workspace_${userId || 'signed-out'}`;
}

function readLocalDocuments(userId: string): WorkspaceDocument[] {
  try {
    const stored = JSON.parse(localStorage.getItem(localDocumentsKey(userId)) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item): item is WorkspaceDocument =>
      item &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.type === 'string' &&
      isDocumentKind(item.type) &&
      typeof item.updatedAt === 'string'
    );
  } catch {
    return [];
  }
}

function createDocumentKey(type: DocumentKind, projectId: string | null) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return projectId ? `${projectId}:${type}:${id}` : `facemex-${type}-${id}`;
}

function nextDocumentName(type: DocumentKind, documents: WorkspaceDocument[]) {
  const label = documentTypes.find((item) => item.type === type)?.name || 'Document';
  const count = documents.filter((document) => document.type === type).length;
  return count ? `${label} ${count + 1}` : `My ${label}`;
}

export default function DocumentWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const userId = useUserStore((state) => state.id);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [allTemplatesOpen, setAllTemplatesOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [appearance, setAppearance] = useState<AppearanceMode>(() => getAppearanceMode());

  useEffect(() => {
    const handleAppearanceChange = (event: Event) => {
      const mode = (event as CustomEvent<AppearanceMode>).detail;
      setAppearance(mode === 'light' ? 'light' : 'dark');
    };
    window.addEventListener(APPEARANCE_CHANGE_EVENT, handleAppearanceChange);
    return () => window.removeEventListener(APPEARANCE_CHANGE_EVENT, handleAppearanceChange);
  }, []);

  const createLocalStarter = useCallback((): WorkspaceDocument => ({
    id: projectId ? `${projectId}:cv` : defaultDocumentKey,
    name: 'My CV',
    type: 'cv',
    updatedAt: new Date().toISOString(),
    synced: false,
  }), [projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');

    const loadDocuments = async () => {
      const localDocuments = readLocalDocuments(userId).filter((document) =>
        !projectId || document.id.startsWith(`${projectId}:`)
      );
      try {
        const savedDocuments = await listDocuments(projectId);
        const merged = new Map(localDocuments.map((document) => [document.id, document]));
        savedDocuments.forEach((document) => merged.set(document.documentKey, mapPersistedDocument(document)));
        const ordered = [...merged.values()].sort((left, right) =>
          Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
        );
        if (cancelled) return;
        const available = ordered.length ? ordered : [createLocalStarter()];
        setDocuments(available);
        setSelectedId((current) => available.some((document) => document.id === current) ? current : available[0].id);
      } catch (error) {
        console.error('FaceMeX documents workspace load failed', error);
        if (cancelled) return;
        const available = localDocuments.length ? localDocuments : [createLocalStarter()];
        setDocuments(available);
        setSelectedId((current) => available.some((document) => document.id === current) ? current : available[0].id);
        setLoadError(error instanceof Error ? error.message : 'Cloud documents could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDocuments();
    return () => { cancelled = true; };
  }, [createLocalStarter, projectId, userId]);

  useEffect(() => {
    if (!documents.length) return;
    try {
      localStorage.setItem(localDocumentsKey(userId), JSON.stringify(documents));
    } catch (error) {
      console.error('FaceMeX document list recovery failed', error);
    }
  }, [documents, userId]);

  const selectedDocument = documents.find((document) => document.id === selectedId);
  const backToWorkspace = () => {
    if (Number(window.history.state?.idx) > 0) {
      navigate(-1);
      return;
    }

    navigate(projectId ? `/projects/${encodeURIComponent(projectId)}` : '/ai/job-assistant');
  };

  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? documents.filter((document) => document.name.toLocaleLowerCase().includes(query))
      : documents;
  }, [documents, search]);

  const createDocument = (type: DocumentKind) => {
    const document: WorkspaceDocument = {
      id: createDocumentKey(type, projectId),
      name: nextDocumentName(type, documents),
      type,
      updatedAt: new Date().toISOString(),
      synced: false,
    };
    setDocuments((current) => [document, ...current]);
    setSelectedId(document.id);
    setNewMenuOpen(false);
    setAllTemplatesOpen(false);
    setSidebarOpen(false);
    setOpenActionsId(null);
  };

  const handleDocumentSaved = useCallback((saved: PersistedDocument) => {
    const document = mapPersistedDocument(saved);
    setDocuments((current) => [
      document,
      ...current.filter((item) => item.id !== document.id),
    ]);
  }, []);

  const duplicateDocument = async (document: WorkspaceDocument) => {
    try {
      const source = await getDocument(document.id);
      if (!source) throw new Error('The saved document could not be found.');
      const id = createDocumentKey(document.type, projectId);
      const copy = await saveDocument(id, {
        title: `${source.title} (Copy)`,
        documentType: source.documentType,
        content: source.content,
        metadata: source.metadata,
        projectId,
      });
      const duplicated = mapPersistedDocument(copy);
      setDocuments((current) => [duplicated, ...current.filter((item) => item.id !== id)]);
      setSelectedId(id);
      setSidebarOpen(false);
    } catch (error) {
      console.error('FaceMeX document duplicate failed', error);
      toast({
        title: 'Could not duplicate this document',
        description: error instanceof Error ? error.message : 'Please check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  const renameDocument = async (document: WorkspaceDocument, requestedName: string) => {
    const name = requestedName.trim();
    if (!name || name === document.name) {
      setRenamingId(null);
      setRenameValue('');
      return;
    }
    try {
      if (document.synced) {
        const source = await getDocument(document.id);
        if (!source) throw new Error('The saved document could not be found.');
        const saved = await saveDocument(document.id, {
          title: name,
          documentType: source.documentType,
          content: source.content,
          metadata: source.metadata,
          projectId,
        });
        setDocuments((current) => [
          mapPersistedDocument(saved),
          ...current.filter((item) => item.id !== document.id),
        ]);
      } else {
        setDocuments((current) => current.map((item) =>
          item.id === document.id ? { ...item, name, updatedAt: new Date().toISOString() } : item
        ));
      }
      setRenamingId(null);
      setRenameValue('');
    } catch (error) {
      console.error('FaceMeX document rename failed', error);
      toast({
        title: 'Could not rename this document',
        description: error instanceof Error ? error.message : 'Please check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  const removeDocument = async (document: WorkspaceDocument) => {
    if (!window.confirm(`Delete “${document.name}”? This cannot be undone.`)) return;
    try {
      if (document.synced) await deleteDocument(document.id);
      localStorage.removeItem(`facemex_document_draft_${userId || 'signed-out'}_${document.id}`);
      const remaining = documents.filter((item) => item.id !== document.id);
      const available = remaining.length
        ? remaining
        : [{
            ...createLocalStarter(),
            id: createDocumentKey('cv', projectId),
            name: 'My CV',
          }];
      setDocuments(available);
      if (selectedId === document.id) setSelectedId(available[0].id);
      setOpenActionsId(null);
    } catch (error) {
      console.error('FaceMeX document delete failed', error);
      toast({
        title: 'Could not delete this document',
        description: error instanceof Error ? error.message : 'Please check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  const documentList = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 p-3">
        <Button
          type="button"
          variant="ghost"
          onClick={backToWorkspace}
          className="h-10 min-w-0 flex-1 justify-start rounded-lg px-3 text-white/70 hover:bg-white/[0.08] hover:text-white"
          aria-label="Back to workspace"
        >
          <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">Back to workspace</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          className="h-10 w-10 shrink-0 text-white/55 hover:bg-white/[0.08] hover:text-white lg:hidden"
          aria-label="Close documents sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3">
        <Button
          type="button"
          onClick={() => {
            setSidebarOpen(true);
            setNewMenuOpen((open) => !open);
          }}
          className="h-10 w-full justify-start rounded-lg border border-white/10 bg-white/[0.06] px-3 text-white hover:bg-white/[0.11]"
          aria-expanded={newMenuOpen}
        >
          <Plus className="mr-2 h-4 w-4" />
          New document
        </Button>
      </div>
      {newMenuOpen && (
        <div className="fm-document-new-menu mx-3 mb-3 max-h-[42vh] overflow-y-auto rounded-xl border border-white/10 bg-[#202020] p-1">
          {documentTypes
            .filter((item) => allTemplatesOpen || starterTemplateTypes.includes(item.type))
            .map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => createDocument(item.type)}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-white/55" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">{item.name}</span>
                <span className="block text-xs text-white/45">{item.description}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAllTemplatesOpen((open) => !open)}
            className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-blue-300 hover:bg-white/10"
            aria-expanded={allTemplatesOpen}
          >
            {allTemplatesOpen ? 'Show fewer templates' : 'More templates'}
          </button>
        </div>
      )}
      <label className="mx-3 flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-white/50 focus-within:border-white/25">
        <Search className="h-4 w-4 shrink-0" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search documents"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          aria-label="Search documents"
        />
      </label>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-5">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Recent</p>
        {loading && <p className="px-2 py-3 text-xs text-white/45">Loading saved documents…</p>}
        {!loading && visibleDocuments.map((document) => (
          <div
            key={document.id}
            className={`group relative mb-1 flex items-center gap-1 rounded-xl ${
              selectedId === document.id ? 'bg-white/[0.12]' : 'hover:bg-white/[0.07]'
            }`}
          >
            {renamingId === document.id ? (
              <form
                className="flex min-h-10 min-w-0 flex-1 items-center gap-1 px-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void renameDocument(document, renameValue);
                }}
              >
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setRenamingId(null);
                      setRenameValue('');
                    }
                  }}
                  aria-label="New document name"
                  className="h-8 min-w-0 flex-1 rounded-md border border-blue-400/60 bg-black/30 px-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="rounded-md px-2 py-1 text-xs font-medium text-blue-300 hover:bg-white/10">
                  Save
                </button>
                <button type="button" onClick={() => { setRenamingId(null); setRenameValue(''); }} className="rounded-md px-2 py-1 text-xs text-white/55 hover:bg-white/10">
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedId(document.id);
                  setSidebarOpen(false);
                  setOpenActionsId(null);
                }}
                className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-current={selectedId === document.id ? 'page' : undefined}
              >
                <FileText className={`h-4 w-4 shrink-0 ${selectedId === document.id ? 'text-white/80' : 'text-white/45'}`} />
                <span className="min-w-0 flex-1 truncate text-sm text-white/85">{document.name}</span>
              </button>
            )}
            {renamingId !== document.id && <button
              type="button"
              onClick={() => setOpenActionsId((current) => current === document.id ? null : document.id)}
              className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white"
              aria-label={`Actions for ${document.name}`}
              aria-expanded={openActionsId === document.id}
              title="Document actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>}
            {openActionsId === document.id && (
              <div className="fm-document-actions-menu absolute right-1 top-10 z-30 w-44 rounded-xl border border-white/10 bg-[#202020] p-1.5 shadow-xl" role="menu">
                <button type="button" role="menuitem" onClick={() => { setOpenActionsId(null); setRenamingId(document.id); setRenameValue(document.name); }} className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10">
                  Rename
                </button>
                <button type="button" role="menuitem" disabled={!document.synced} onClick={() => { setOpenActionsId(null); void duplicateDocument(document); }} title={!document.synced ? 'Save to your account before duplicating' : undefined} className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
                  Duplicate
                </button>
                <button type="button" role="menuitem" onClick={() => { setOpenActionsId(null); void removeDocument(document); }} className="w-full rounded-lg px-3 py-2 text-left text-xs text-red-300 hover:bg-red-400/10">
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
        {!loading && visibleDocuments.length === 0 && (
          <p className="px-2 py-4 text-sm text-white/45">No matching documents.</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-white/10 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-xs font-semibold text-white/80">
          FM
        </div>
        <div className="min-w-0 text-xs">
          <span className="block truncate font-medium text-white/75">FaceMeX Documents</span>
          <span className="block truncate text-white/40">Drafts sync to your account</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`fm-document-workspace-root fm-theme-${appearance} flex h-screen h-[100dvh] flex-col overflow-hidden bg-[#0b0b0b] text-white`}>
      <header className="fm-documents-header z-20 flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#111111] px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9 text-white/75 lg:hidden"
            aria-label="Open documents sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="truncate text-sm font-semibold tracking-tight">FaceMeX</span>
          <span className="hidden text-white/30 sm:inline">/</span>
          <span className="hidden text-sm text-white/60 sm:inline">Documents</span>
        </div>
      </header>

      {loadError && (
        <div className="z-10 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
          Cloud document sync is unavailable: {loadError}. Your current browser draft remains available.
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="fm-documents-sidebar hidden w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#171717] lg:flex" aria-label="Documents workspace">
          {documentList}
        </aside>
        {sidebarOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close documents sidebar"
            />
            <aside className="fm-documents-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(88vw,340px)] flex-col border-r border-white/10 bg-[#171717] lg:hidden" aria-label="Documents workspace">
              {documentList}
            </aside>
          </>
        )}
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {selectedDocument ? (
            <DocumentStudio
              key={selectedDocument.id}
              kind={selectedDocument.type}
              documentId={selectedDocument.id}
              documentName={selectedDocument.name}
              projectId={projectId}
              onDocumentSaved={handleDocumentSaved}
              embeddedWorkspace
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/50">
              {loading ? 'Loading your documents…' : 'Choose a document or create a new one.'}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
