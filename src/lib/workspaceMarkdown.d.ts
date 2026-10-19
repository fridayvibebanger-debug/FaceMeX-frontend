export type WorkspaceMarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; start: number; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'quote'; text: string }
  | { type: 'separator' }
  | { type: 'code'; language: string; text: string };

export type WorkspaceInlineToken =
  | { type: 'text' | 'strong' | 'emphasis' | 'code' | 'math'; text: string }
  | { type: 'link' | 'image'; text: string; href: string };

export function parseWorkspaceMarkdown(source: string): WorkspaceMarkdownBlock[];
export function formatWorkspaceMath(source: string): string;
export function tokenizeWorkspaceInline(source: string): WorkspaceInlineToken[];
