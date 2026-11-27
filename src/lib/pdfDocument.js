function normalizeText(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function createChunks(pages) {
  const chunks = [];

  for (const page of pages) {
    const text = normalizeText(page.text);
    if (!text) continue;

    for (let start = 0, part = 1; start < text.length; part += 1) {
      const end = Math.min(text.length, start + 1400);
      let sliceEnd = end;
      if (end < text.length) {
        const boundary = text.lastIndexOf('\n', end);
        if (boundary > start + 700) sliceEnd = boundary;
      }
      const chunkText = normalizeText(text.slice(start, sliceEnd));
      if (chunkText) {
        chunks.push({
          chunkId: `p${page.pageNumber}-c${part}`,
          pageNumber: page.pageNumber,
          text: chunkText,
        });
      }
      start = sliceEnd;
    }
  }

  return chunks;
}

export async function extractPDFDocument(file) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({
    data: bytes,
    disableWorker: false,
  }).promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push({ pageNumber, text: normalizeText(text) });
  }

  const chunks = createChunks(pages);
  if (chunks.length === 0) {
    throw new Error(
      'This PDF appears to be scanned or contains no readable text. OCR is unavailable, so FaceMeX could not process it.',
    );
  }

  return {
    name: file.name,
    pageCount: pdf.numPages,
    pages,
    chunks,
  };
}

function tokenize(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function retrievePDFChunks(
  chunks,
  question,
  limit = 5,
) {
  if (!chunks.length) return [];
  const questionTerms = new Set(tokenize(question));
  if (!questionTerms.size) return chunks.slice(0, limit);

  const corpusTermCounts = chunks.map((chunk) => {
    const counts = new Map<string, number>();
    for (const term of tokenize(chunk.text)) counts.set(term, (counts.get(term) || 0) + 1);
    return counts;
  });
  const documentFrequency = new Map<string, number>();
  for (const counts of corpusTermCounts) {
    for (const term of counts.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }
  }

  const averageLength = chunks.reduce((total, chunk) => total + tokenize(chunk.text).length, 0) / chunks.length;
  const scored = chunks.map((chunk, index) => {
    const terms = tokenize(chunk.text);
    const counts = corpusTermCounts[index];
    let score = 0;
    for (const term of questionTerms) {
      const frequency = counts.get(term) || 0;
      if (!frequency) continue;
      const idf = Math.log(1 + (chunks.length - (documentFrequency.get(term) || 0) + 0.5) / ((documentFrequency.get(term) || 0) + 0.5));
      const normalizedFrequency = frequency * 2.2 / (frequency + 1.2 * (0.25 + 0.75 * terms.length / Math.max(1, averageLength)));
      score += idf * normalizedFrequency;
    }
    return { chunk, score };
  });

  return scored
    .sort((left, right) => right.score - left.score)
    .filter((item) => item.score > 0)
    .slice(0, limit)
    .map((item) => item.chunk);
}

export function formatPDFContext(chunks) {
  return chunks
    .map((chunk) => `[Page ${chunk.pageNumber}] ${chunk.text}`)
    .join('\n\n');
}
