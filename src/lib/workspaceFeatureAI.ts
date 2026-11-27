import { api } from '@/lib/api';

export type WorkspaceFeatureMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type WorkspaceFeatureAttachment = {
  name: string;
  mimeType: string;
  data: string;
};

type WorkspaceFeatureRequest = {
  feature: string;
  messages: WorkspaceFeatureMessage[];
  task?: string;
  attachments?: WorkspaceFeatureAttachment[];
};

export async function requestWorkspaceFeatureAI({
  feature,
  messages,
  task,
  attachments,
}: WorkspaceFeatureRequest): Promise<string> {
  const response = await api.postViaSameOriginProxy('/api/ai/workspace', {
    feature,
    messages,
    ...(task ? { task } : {}),
    ...(attachments?.length ? { attachments } : {}),
  });

  if (response?.success === false || response?.error) {
    throw new Error(
      typeof response.error === 'string'
        ? response.error
        : typeof response.message === 'string'
          ? response.message
          : 'FaceMeX could not complete this request.',
    );
  }

  const content = String(response?.content || response?.response || response?.text || '').trim();
  if (!content) throw new Error('FaceMeX returned an empty response. Please try again.');
  return content;
}
