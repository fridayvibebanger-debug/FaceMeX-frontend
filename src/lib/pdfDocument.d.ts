export type PDFPageText = {
  pageNumber: number;
  text: string;
};

export type PDFTextChunk = {
  chunkId: string;
  pageNumber: number;
  text: string;
};

export type ExtractedPDFDocument = {
  name: string;
  pageCount: number;
  pages: PDFPageText[];
  chunks: PDFTextChunk[];
};

export function extractPDFDocument(file: File): Promise<ExtractedPDFDocument>;
export function retrievePDFChunks(chunks: PDFTextChunk[], question: string, limit?: number): PDFTextChunk[];
export function formatPDFContext(chunks: PDFTextChunk[]): string;
