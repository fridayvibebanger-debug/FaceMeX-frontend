export const MAX_PDF_CHAT_FILE_SIZE = 3 * 1024 * 1024;

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const PDF_SIGNATURE = Buffer.from('%PDF-', 'ascii');

export function validatePDFChatPayload(payload = {}) {
  if (payload.feature !== 'pdf_chat') return null;

  const attachments = Array.isArray(payload.attachments)
    ? payload.attachments
    : Array.isArray(payload.files)
      ? payload.files
      : payload.file
        ? [payload.file]
        : [];
  if (attachments.length !== 1) return 'Upload one PDF before starting a document chat.';

  const [attachment] = attachments;
  const mimeType = String(attachment?.mimeType || attachment?.type || '').toLowerCase();
  if (mimeType !== 'application/pdf') return 'The attached file must be a PDF.';

  const suppliedData = attachment?.data || attachment?.base64 || attachment?.dataUrl;
  if (typeof suppliedData !== 'string') return 'The PDF file data is missing.';
  const base64 = suppliedData.replace(/^data:application\/pdf;base64,/i, '');
  const maximumBase64Length = Math.ceil(MAX_PDF_CHAT_FILE_SIZE / 3) * 4;
  if (!base64 || base64.length > maximumBase64Length || !BASE64_PATTERN.test(base64)) {
    return 'The PDF must be valid base64 data and no larger than 3 MB.';
  }

  const fileBytes = Buffer.from(base64, 'base64');
  if (fileBytes.length === 0 || fileBytes.length > MAX_PDF_CHAT_FILE_SIZE) {
    return 'The PDF must be no larger than 3 MB.';
  }
  if (fileBytes.subarray(0, 1024).indexOf(PDF_SIGNATURE) < 0) {
    return 'The attached file does not have a valid PDF signature.';
  }

  return null;
}
