export type MarkdownTable = {
  headers: string[];
  alignments: Array<'left' | 'center' | 'right'>;
  rows: string[][];
};

export function renderMarkdownToEditorHtml(text: string, slides?: boolean): string;

export function parseMarkdownTable(
  headerLine: string,
  separatorLine: string,
  bodyLines?: string[],
): MarkdownTable | null;
