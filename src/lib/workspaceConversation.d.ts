export type WorkspaceConversationMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export function buildWorkspaceConversationMessages(
  history: Array<{
    role: string;
    content?: string;
    deletedFromChat?: boolean;
  }>,
  latestPrompt: string,
  systemInstruction?: string,
): WorkspaceConversationMessage[];
