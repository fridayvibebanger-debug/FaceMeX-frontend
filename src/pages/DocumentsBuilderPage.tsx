import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Menu,
  Search,
  Settings,
  X,
} from 'lucide-react';
import DocumentStudio from '@/components/documents/DocumentStudio';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('DocumentsBuilderPage Error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
          <div className="text-center px-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Editor</h2>
            <p className="text-white/70 mb-4">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function getSuggestedCvName() {
  if (typeof window === 'undefined') return 'My CV';
  return window.prompt('What would you like to name your CV?', 'My CV')?.trim() || 'My CV';
}

export type DocumentType = 'cv' | 'cover-letter' | 'portfolio' | 'bio' | 'linkedin-profile' | 'portfolio-website';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  createdAt: Date;
  updatedAt: Date;
}

const documentTypeConfig: Record<DocumentType, { label: string; description: string; icon: React.ReactNode }> = {
  cv: {
    label: 'CV / Resume',
    description: 'Professional curriculum vitae',
    icon: <FileText className="h-5 w-5" />,
  },
  'cover-letter': {
    label: 'Cover Letter',
    description: 'Job application letter',
    icon: <FileText className="h-5 w-5" />,
  },
  portfolio: {
    label: 'Portfolio',
    description: 'Work samples & projects',
    icon: <FileText className="h-5 w-5" />,
  },
  bio: {
    label: 'Professional Bio',
    description: 'About you in professional context',
    icon: <FileText className="h-5 w-5" />,
  },
  'linkedin-profile': {
    label: 'LinkedIn Profile',
    description: 'LinkedIn headline & summary',
    icon: <FileText className="h-5 w-5" />,
  },
  'portfolio-website': {
    label: 'Portfolio Website',
    description: 'Personal portfolio site content',
    icon: <FileText className="h-5 w-5" />,
  },
};

export default function DocumentsBuilderPage() {
  const [documents, setDocuments] = useState<Document[]>(() => [{
    id: '1',
    name: getSuggestedCvName(),
    type: 'cv',
    createdAt: new Date(),
    updatedAt: new Date(),
  }]);
  const [selectedDocId, setSelectedDocId] = useState<string>('1');
  const [showNewDocMenu, setShowNewDocMenu] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [documentSearch, setDocumentSearch] = useState('');

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  const createNewDocument = (type: DocumentType) => {
    const newDoc: Document = {
      id: String(Date.now()),
      name: `${documentTypeConfig[type].label} ${documents.filter((d) => d.type === type).length + 1}`,
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDocuments([...documents, newDoc]);
    setSelectedDocId(newDoc.id);
    setShowNewDocMenu(false);
    setMobileSidebarOpen(false);
  };

  const duplicateDocument = (docId: string) => {
    const docToDuplicate = documents.find((d) => d.id === docId);
    if (!docToDuplicate) return;

    const newDoc: Document = {
      id: String(Date.now()),
      name: `${docToDuplicate.name} (Copy)`,
      type: docToDuplicate.type,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDocuments([...documents, newDoc]);
    setSelectedDocId(newDoc.id);
  };

  const deleteDocument = (docId: string) => {
    const newDocs = documents.filter((d) => d.id !== docId);
    if (newDocs.length === 0) return; // Keep at least one
    setDocuments(newDocs);
    if (selectedDocId === docId) {
      setSelectedDocId(newDocs[0].id);
    }
  };

  const renameDocument = (docId: string, newName: string) => {
    setDocuments(documents.map((d) => (d.id === docId ? { ...d, name: newName } : d)));
  };

  const visibleDocuments = documents.filter((doc) => doc.name.toLowerCase().includes(documentSearch.toLowerCase()));

  if (!selectedDoc) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white/50">No documents found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#111111] px-3 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Open documents sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">FaceMeX Documents</p>
          <p className="truncate text-sm font-semibold text-white">{selectedDoc.name}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewDocMenu((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Create new document"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close documents sidebar"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,340px)] flex-col bg-[#171717] text-white shadow-2xl transition-transform duration-200 lg:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Documents sidebar"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Documents</p>
              <p className="text-xs text-white/45">Your workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Close documents sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => setShowNewDocMenu((value) => !value)}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-white/15 px-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Plus className="h-4 w-4" />
            New document
          </button>
          <label className="mt-3 flex items-center gap-2 rounded-lg bg-white/10 px-3 text-white/60 focus-within:ring-2 focus-within:ring-blue-400">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={documentSearch}
              onChange={(event) => setDocumentSearch(event.target.value)}
              placeholder="Search documents"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              aria-label="Search documents"
            />
          </label>
        </div>

        {showNewDocMenu && (
          <div className="mx-3 mb-2 rounded-lg border border-white/10 bg-[#202020] p-1">
            {Object.entries(documentTypeConfig).map(([typeKey, config]) => (
              <button
                key={typeKey}
                type="button"
                onClick={() => createNewDocument(typeKey as DocumentType)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-white/10"
              >
                {config.icon}
                <span className="text-sm">{config.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Recent documents</p>
          <div className="space-y-1">
            {visibleDocuments.map((doc) => (
              <div key={doc.id} className={`group flex items-center gap-1 rounded-lg ${selectedDocId === doc.id ? 'bg-white/15' : 'hover:bg-white/10'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setMobileSidebarOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <FileText className="h-4 w-4 shrink-0 text-white/55" />
                  <span className="truncate text-sm">{doc.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => duplicateDocument(doc.id)}
                  className="mr-1 hidden h-8 w-8 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white group-hover:flex"
                  aria-label={`Duplicate ${doc.name}`}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {visibleDocuments.length === 0 && <p className="px-2 py-4 text-sm text-white/45">No documents found</p>}
          </div>
        </div>
      </aside>

      {/* Top Bar with Document Tabs */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#111111]/95 backdrop-blur">
        <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8">
          {/* Document Tabs */}
          <div className="hidden items-center gap-2 overflow-x-auto py-3 lg:flex">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={
                  selectedDocId === doc.id
                    ? 'shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition bg-white/[0.04] text-white/70 hover:bg-white/10'
                }
              >
                <FileText className="h-4 w-4" />
                <span className="max-w-[150px] truncate">{doc.name}</span>
                {documents.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument(doc.id);
                    }}
                    className="ml-1 text-xs opacity-0 hover:opacity-100 transition"
                  >
                    ×
                  </button>
                )}
              </button>
            ))}

            {/* New Document Button */}
            <div className="relative">
              <button
                onClick={() => setShowNewDocMenu(!showNewDocMenu)}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/[0.06] text-white/75 hover:bg-white/10 transition"
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
              </button>

              {showNewDocMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-lg z-50 overflow-hidden">
                  <div className="p-2 space-y-1">
                    {Object.entries(documentTypeConfig).map(([typeKey, config]) => (
                      <button
                        key={typeKey}
                        onClick={() => createNewDocument(typeKey as DocumentType)}
                        className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-white/10 transition flex items-center gap-2"
                      >
                        {config.icon}
                        <div>
                          <div className="text-sm font-medium text-white">{config.label}</div>
                          <div className="text-xs text-white/50">{config.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Actions Bar */}
      <div className="border-b border-white/10 bg-[#111111]">
        <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <div>
              <h2 className="text-sm font-semibold text-white">{selectedDoc.name}</h2>
              <p className="text-xs text-white/50">{documentTypeConfig[selectedDoc.type].description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => renameDocument(selectedDoc.id, prompt('New name:', selectedDoc.name) || selectedDoc.name)}
              className="p-2 rounded-lg text-white/60 hover:bg-white/10 transition"
              title="Rename"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => duplicateDocument(selectedDoc.id)}
              className="p-2 rounded-lg text-white/60 hover:bg-white/10 transition"
              title="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </button>
            {documents.length > 1 && (
              <button
                onClick={() => deleteDocument(selectedDoc.id)}
                className="p-2 rounded-lg text-white/60 hover:bg-red-500/10 hover:text-red-400 transition"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <ErrorBoundary>
          {selectedDoc && <DocumentStudio kind={selectedDoc.type} documentId={selectedDoc.id} documentName={selectedDoc.name} />}
        </ErrorBoundary>
      </div>
    </div>
  );
}
