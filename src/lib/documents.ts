import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export type PersistedDocument = {
  id: string;
  userId: string;
  projectId: string | null;
  documentKey: string;
  title: string;
  documentType: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDraft = {
  title: string;
  documentType: string;
  content: string;
  metadata: Record<string, unknown>;
  projectId?: string | null;
};

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error('Document sync requires Supabase configuration.');
  return supabase;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function mapDocument(row: any): PersistedDocument {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    documentKey: row.document_key,
    title: row.title,
    documentType: row.document_type,
    content: row.content,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getDocument(documentKey: string): Promise<PersistedDocument | null> {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  fail(authError);
  if (!authData.user) throw new Error('Sign in to load this document.');

  const { data, error } = await client
    .from('documents')
    .select('id,user_id,project_id,document_key,title,document_type,content,metadata,created_at,updated_at')
    .eq('user_id', authData.user.id)
    .eq('document_key', documentKey)
    .maybeSingle();
  fail(error);
  return data ? mapDocument(data) : null;
}

export async function saveDocument(documentKey: string, draft: DocumentDraft): Promise<PersistedDocument> {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  fail(authError);
  if (!authData.user) throw new Error('Sign in to save this document.');

  const { data, error } = await client
    .from('documents')
    .upsert({
      user_id: authData.user.id,
      project_id: draft.projectId || null,
      document_key: documentKey,
      title: draft.title.trim() || 'Untitled document',
      document_type: draft.documentType,
      content: draft.content,
      metadata: draft.metadata,
    }, { onConflict: 'user_id,document_key' })
    .select('id,user_id,project_id,document_key,title,document_type,content,metadata,created_at,updated_at')
    .single();
  fail(error);
  return mapDocument(data);
}
