import JSZip from 'jszip';

export const MAX_WORKSPACE_DOCUMENT_TEXT_LENGTH = 6000;

function decodeXmlText(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([\da-f]+);/gi, (_, codePoint) => String.fromCodePoint(parseInt(codePoint, 16)));
}

function xmlTextNodes(xml) {
  return Array.from(
    xml.matchAll(/<(?:[\w.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?t\s*>/g),
    (match) => decodeXmlText(match[1]),
  );
}

function normalizeDocumentText(text) {
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (normalized.length <= MAX_WORKSPACE_DOCUMENT_TEXT_LENGTH) return normalized;

  return `${normalized.slice(0, MAX_WORKSPACE_DOCUMENT_TEXT_LENGTH)}\n[Document text truncated for analysis.]`;
}

async function extractDocxText(file) {
  const archive = await JSZip.loadAsync(await file.arrayBuffer());
  const document = archive.file('word/document.xml');
  if (!document) throw new Error('This DOCX file does not contain readable document text.');

  const xml = await document.async('text');
  const paragraphs = Array.from(
    xml.matchAll(/<(?:[\w.-]+:)?p\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?p\s*>/g),
    (match) => xmlTextNodes(match[1]).join(''),
  );
  const text = normalizeDocumentText(paragraphs.filter(Boolean).join('\n'));
  if (!text) throw new Error('No readable text was found in this DOCX file.');
  return text;
}

async function extractXlsxText(file) {
  const archive = await JSZip.loadAsync(await file.arrayBuffer());
  const sharedStringsFile = archive.file('xl/sharedStrings.xml');
  const sharedStrings = sharedStringsFile
    ? Array.from(
        (await sharedStringsFile.async('text')).matchAll(/<(?:[\w.-]+:)?si\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?si\s*>/g),
        (match) => xmlTextNodes(match[1]).join(''),
      )
    : [];
  const worksheetPaths = Object.keys(archive.files)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  if (!worksheetPaths.length) throw new Error('This XLSX file does not contain readable worksheets.');

  const sheets = [];
  for (const [sheetIndex, path] of worksheetPaths.entries()) {
    const worksheet = await archive.file(path).async('text');
    const rows = Array.from(
      worksheet.matchAll(/<(?:[\w.-]+:)?row\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?row\s*>/g),
      (rowMatch) => {
        const cells = Array.from(
          rowMatch[1].matchAll(/<(?:[\w.-]+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[\w.-]+:)?c\s*>)/g),
          (cellMatch) => {
            const attributes = cellMatch[1];
            const body = cellMatch[2] || '';
            const reference = attributes.match(/\br=["']([^"']+)["']/i)?.[1];
            const type = attributes.match(/\bt=["']([^"']+)["']/i)?.[1];
            const rawValue = body.match(/<(?:[\w.-]+:)?v\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?v\s*>/i)?.[1];
            const value = type === 's' && rawValue !== undefined
              ? sharedStrings[Number(rawValue)] || ''
              : type === 'inlineStr'
                ? xmlTextNodes(body).join('')
                : rawValue === undefined
                  ? ''
                  : decodeXmlText(rawValue);

            return value ? `${reference ? `${reference}: ` : ''}${value}` : '';
          },
        ).filter(Boolean);

        return cells.join(' | ');
      },
    ).filter(Boolean);

    if (rows.length) sheets.push(`Sheet ${sheetIndex + 1}\n${rows.join('\n')}`);
  }

  const text = normalizeDocumentText(sheets.join('\n\n'));
  if (!text) throw new Error('No readable cell values were found in this XLSX file.');
  return text;
}

export async function extractWorkspaceDocumentText(file) {
  const extension = file.name.toLowerCase().split('.').pop();
  const mimeType = String(file.type || '').toLowerCase();

  if (extension === 'txt' || mimeType === 'text/plain') {
    const text = normalizeDocumentText(await file.text());
    if (!text) throw new Error('This text file is empty.');
    return text;
  }

  if (
    extension === 'docx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) return extractDocxText(file);
  if (
    extension === 'xlsx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) return extractXlsxText(file);
  if (extension === 'doc' || mimeType === 'application/msword') {
    throw new Error('Legacy .doc files are not supported. Save the document as .docx or PDF and upload it again.');
  }

  throw new Error('This document format cannot be analyzed.');
}
