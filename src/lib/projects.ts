import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export type WorkspaceProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  owner: 'created' | 'shared';
};

export type ProjectConversation = {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMessage = {
  id: string;
  projectId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

const attachmentPathCache = new Map<string, string>();

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Project storage requires Supabase configuration.');
  }
  return supabase;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function mapProject(row: any): WorkspaceProject {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: 'created',
  };
}

function mapConversation(row: any): ProjectConversation {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: any, projectId: string): ProjectMessage {
  return {
    id: row.id,
    projectId,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    metadata: row.metadata || {},
  };
}

export async function listProjects(): Promise<WorkspaceProject[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('workspace_projects')
    .select('id,name,created_at,updated_at')
    .order('updated_at', { ascending: false });
  throwIfError(error);
  return (data || []).map(mapProject);
}

export async function createProject(name: string): Promise<WorkspaceProject> {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  throwIfError(authError);
  if (!authData.user) throw new Error('Sign in to create a project.');

  const { data, error } = await client
    .from('workspace_projects')
    .insert({ user_id: authData.user.id, name: name.trim() })
    .select('id,name,created_at,updated_at')
    .single();
  throwIfError(error);
  return mapProject(data);
}

export async function renameProject(projectId: string, name: string): Promise<WorkspaceProject> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('workspace_projects')
    .update({ name: name.trim() })
    .eq('id', projectId)
    .select('id,name,created_at,updated_at')
    .single();
  throwIfError(error);
  return mapProject(data);
}

export async function deleteProject(projectId: string): Promise<void> {
  const client = requireSupabase();
  const storage = client.storage.from('workspace-project-files');
  const listProjectFiles = async (prefix: string): Promise<string[]> => {
    const pageSize = 100;
    const allEntries: any[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await storage.list(prefix, { limit: pageSize, offset });
      throwIfError(error);
      allEntries.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }

    const files = await Promise.all(allEntries.map(async (entry) => {
      const entryPath = `${prefix}/${entry.name}`;
      return entry.id === null ? listProjectFiles(entryPath) : [entryPath];
    }));
    return files.flat();
  };

  const filePaths = await listProjectFiles(projectId);
  if (filePaths.length > 0) {
    const { error: storageError } = await storage.remove(filePaths);
    throwIfError(storageError);
  }

  const { error } = await client.from('workspace_projects').delete().eq('id', projectId);
  throwIfError(error);
}

export async function listProjectConversations(projectId: string): Promise<ProjectConversation[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('workspace_project_conversations')
    .select('id,project_id,title,created_at,updated_at')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });
  throwIfError(error);
  return (data || []).map(mapConversation);
}

export async function createProjectConversation(projectId: string, title = 'New chat'): Promise<ProjectConversation> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('workspace_project_conversations')
    .insert({ project_id: projectId, title })
    .select('id,project_id,title,created_at,updated_at')
    .single();
  throwIfError(error);
  return mapConversation(data);
}

export async function listProjectMessages(conversationId: string, projectId: string): Promise<ProjectMessage[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('workspace_project_messages')
    .select('id,conversation_id,role,content,created_at,metadata')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  throwIfError(error);
  return Promise.all((data || []).map(async (row) => {
    const message = mapMessage(row, projectId);
    const images = Array.isArray(message.metadata?.images) ? message.metadata.images as Array<Record<string, any>> : [];
    const hydratedImages = await Promise.all(images.map(async (image) => {
      if (!image.storagePath) return image;
      const { data: signedData, error: signedError } = await client.storage
        .from('workspace-project-files')
        .createSignedUrl(image.storagePath, 60 * 60);
      if (signedError) throw signedError;
      return { ...image, dataUrl: signedData.signedUrl };
    }));
    return {
      ...message,
      projectId,
      metadata: { ...message.metadata, images: hydratedImages },
    };
  }));
}

export async function searchProjectContext(projectId: string, prompt: string): Promise<string> {
  const client = requireSupabase();
  const conversations = await listProjectConversations(projectId);
  const conversationIds = conversations.map((conversation) => conversation.id);
  if (conversationIds.length === 0) return '';

  const ignoredTerms = new Set(['about', 'after', 'again', 'could', 'does', 'from', 'have', 'help', 'into', 'please', 'should', 'that', 'them', 'then', 'there', 'they', 'this', 'what', 'when', 'where', 'which', 'with', 'would', 'your']);
  const terms = Array.from(new Set(prompt.toLowerCase().match(/[a-z0-9]{4,}/g) || []))
    .filter((term) => !ignoredTerms.has(term))
    .slice(0, 5);

  let query = client
    .from('workspace_project_messages')
    .select('id,conversation_id,role,content,created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })
    .limit(6);

  if (terms.length > 0) {
    query = query.or(terms.map((term) => `content.ilike.%${term}%`).join(','));
  }

  const { data, error } = await query;
  throwIfError(error);
  const titleById = new Map(conversations.map((conversation) => [conversation.id, conversation.title]));
  return (data || []).reverse().map((row) =>
    `[${titleById.get(row.conversation_id) || 'Project chat'} / ${row.role}] ${row.content}`
  ).join('\n').slice(-6000);
}

export async function saveProjectMessage(message: ProjectMessage): Promise<void> {
  const client = requireSupabase();
  const metadata = { ...(message.metadata || {}) };
  const images = Array.isArray(metadata.images) ? metadata.images as Array<Record<string, any>> : [];
  if (images.length > 0) {
    metadata.images = await Promise.all(images.map(async (image, index) => {
      if (!image.dataUrl) return image;
      const cacheKey = `${message.id}:${image.id || index}`;
      const cachedPath = attachmentPathCache.get(cacheKey);
      if (image.storagePath || cachedPath) {
        return { ...image, storagePath: image.storagePath || cachedPath, dataUrl: undefined };
      }

      const blobResponse = await fetch(image.dataUrl);
      const blob = await blobResponse.blob();
      const fileName = String(image.name || `image-${index}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${message.projectId}/${message.conversationId}/${message.id}/${index}-${fileName}`;
      const { error: uploadError } = await client.storage
        .from('workspace-project-files')
        .upload(storagePath, blob, { contentType: blob.type || 'application/octet-stream', upsert: true });
      throwIfError(uploadError);
      attachmentPathCache.set(cacheKey, storagePath);
      return { ...image, storagePath, dataUrl: undefined };
    }));
  }

  const { error } = await client.from('workspace_project_messages').upsert({
    id: message.id,
    conversation_id: message.conversationId,
    role: message.role,
    content: message.content,
    created_at: message.createdAt,
    metadata,
  });
  throwIfError(error);
}

export async function updateProjectConversationTitle(conversationId: string, title: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('workspace_project_conversations')
    .update({ title: title.slice(0, 100) })
    .eq('id', conversationId);
  throwIfError(error);
}
