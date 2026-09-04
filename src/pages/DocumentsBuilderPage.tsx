import { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import DocumentStudio from '@/components/documents/DocumentStudio';

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
  const [showDocumentMenu, setShowDocumentMenu] = useState(false);
  const [showNewDocMenu, setShowNewDocMenu] = useState(false);

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

  if (!selectedDoc) {
    return (
      <div className="min-h-screen bg-white lg:bg-black">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-500 lg:text-white/50">No documents found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white lg:bg-black lg:text-white flex flex-col">
      {/* Top Bar with Document Tabs */}
      <div className="sticky top-0 z-40 border-b border-slate-200 lg:border-white/10 bg-white lg:bg-black/50 backdrop-blur">
        <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8">
          {/* Document Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto py-3">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={
                  selectedDocId === doc.id
                    ? 'shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition bg-blue-50 text-blue-600 lg:bg-blue-500/20 lg:text-blue-400 border border-blue-200 lg:border-blue-500/30'
                    : 'shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition bg-slate-50 text-slate-600 hover:bg-slate-100 lg:bg-white/5 lg:text-white/70 lg:hover:bg-white/10'
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
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 lg:bg-white/10 lg:text-white/70 lg:hover:bg-white/20 transition"
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
              </button>

              {showNewDocMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-slate-200 lg:border-white/10 bg-white lg:bg-[#1a1a1a] shadow-lg z-50 overflow-hidden">
                  <div className="p-2 space-y-1">
                    {Object.entries(documentTypeConfig).map(([typeKey, config]) => (
                      <button
                        key={typeKey}
                        onClick={() => createNewDocument(typeKey as DocumentType)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 lg:hover:bg-white/10 transition flex items-center gap-2"
                      >
                        {config.icon}
                        <div>
                          <div className="text-sm font-medium text-slate-900 lg:text-white">{config.label}</div>
                          <div className="text-xs text-slate-500 lg:text-white/50">{config.description}</div>
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
      <div className="border-b border-slate-200 lg:border-white/10 bg-white lg:bg-black/30">
        <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 lg:text-white">{selectedDoc.name}</h2>
              <p className="text-xs text-slate-500 lg:text-white/50">{documentTypeConfig[selectedDoc.type].description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => renameDocument(selectedDoc.id, prompt('New name:', selectedDoc.name) || selectedDoc.name)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:text-white/60 lg:hover:bg-white/10 transition"
              title="Rename"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => duplicateDocument(selectedDoc.id)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:text-white/60 lg:hover:bg-white/10 transition"
              title="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </button>
            {documents.length > 1 && (
              <button
                onClick={() => deleteDocument(selectedDoc.id)}
                className="p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 lg:text-white/60 lg:hover:bg-red-500/10 lg:hover:text-red-400 transition"
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
        {selectedDoc && <DocumentStudio kind={selectedDoc.type} documentId={selectedDoc.id} documentName={selectedDoc.name} />}
      </div>
    </div>
  );
}
