export type DocumentEditScope = 'full' | 'targeted';

export type ParsedDocumentAIResponse =
  | { type: 'clarification'; message: string }
  | { type: 'whole'; body: string; explanation: string; design: Record<string, unknown> }
  | { type: 'section'; heading: string; body: string; explanation: string };

export function classifyDocumentEditIntent(instruction: string): DocumentEditScope;
export function parseDocumentAIResponse(response: string): ParsedDocumentAIResponse | null;
export function normalizeDocumentDesign(value: unknown): {
  template?: 'classic' | 'modern' | 'minimal' | 'executive';
  font?: 'sans' | 'serif' | 'mono';
  alignment?: 'left' | 'center' | 'right' | 'justify';
  orientation?: 'portrait' | 'landscape';
  pageMargin?: 'compact' | 'standard' | 'wide';
};
