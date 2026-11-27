export const MAX_PDF_CHAT_FILE_SIZE = 3 * 1024 * 1024;
export const MAX_PDF_CHAT_MESSAGES = 12;
export const MAX_PDF_CHAT_MESSAGE_LENGTH = 20_000;
export const MAX_PDF_CHAT_TOTAL_MESSAGE_LENGTH = 50_000;

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const PDF_SIGNATURE = Buffer.from('%PDF-', 'ascii');
const UNSUPPORTED_DOCUMENT_REFERENCE_KEYS = [
  'documentId',
  'document_id',
  'id',
  'path',
  'filePath',
  'file_path',
  'storagePath',
  'storage_path',
  'url',
];

function hasUnsupportedDocumentReference(value) {
  return UNSUPPORTED_DOCUMENT_REFERENCE_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(value, key)
  );
}

export function validatePDFChatPayload(payload = {}) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    payload.feature !== 'pdf_chat'
  ) {
    return null;
  }

  if (
    hasUnsupportedDocumentReference(payload) ||
    !Array.isArray(payload.messages) ||
    payload.messages.length === 0 ||
    payload.messages.length > MAX_PDF_CHAT_MESSAGES
  ) {
    return 'The PDF chat request is invalid or too large.';
  }

  let totalMessageLength = 0;
  let systemMessageCount = 0;
  for (const message of payload.messages) {
    if (
      !message ||
      typeof message !== 'object' ||
      !['system', 'user', 'assistant'].includes(message.role) ||
      typeof message.content !== 'string' ||
      !message.content.trim() ||
      message.content.length > MAX_PDF_CHAT_MESSAGE_LENGTH ||
      hasUnsupportedDocumentReference(message)
    ) {
      return 'The PDF chat request contains an invalid message.';
    }

    totalMessageLength += message.content.length;
    if (totalMessageLength > MAX_PDF_CHAT_TOTAL_MESSAGE_LENGTH) {
      return 'The PDF chat request is too large.';
    }
    if (message.role === 'system') systemMessageCount += 1;
  }
  if (
    systemMessageCount > 1 ||
    payload.messages[payload.messages.length - 1].role !== 'user'
  ) {
    return 'The PDF chat request contains an invalid conversation.';
  }

  const attachments = Array.isArray(payload.attachments)
    ? payload.attachments
    : Array.isArray(payload.files)
      ? payload.files
      : payload.file
        ? [payload.file]
        : [];
  if (attachments.length !== 1) return 'Upload one PDF before starting a document chat.';

  const [attachment] = attachments;
  if (
    !attachment ||
    typeof attachment !== 'object' ||
    Array.isArray(attachment) ||
    hasUnsupportedDocumentReference(attachment) ||
    typeof attachment.name !== 'string' ||
    !attachment.name.trim() ||
    attachment.name.length > 180 ||
    /[\\\/\u0000-\u001f]/.test(attachment.name)
  ) {
    return 'The attached PDF has invalid document details.';
  }

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
