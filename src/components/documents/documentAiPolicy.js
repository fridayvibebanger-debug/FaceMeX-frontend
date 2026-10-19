const FULL_DOCUMENT_TERMS =
  /\b(?:cv|resume|cover[\s-]?letter|portfolio|biography|bio|linkedin(?:\s+profile)?|portfolio\s+website|business\s+plan|presentation|proposal|report|meeting\s+notes|document)\b/i;
const TARGETED_EDIT_TERMS =
  /\b(?:summary|headline|title|selected\s+text|this\s+section|one\s+section|grammar|spelling|typos?|punctuation|proofread|wording\s+only|keep\s+(?:the\s+)?(?:design|layout|template)|preserve\s+(?:the\s+)?(?:design|layout|template))\b/i;

export function classifyDocumentEditIntent(instruction) {
  const text = String(instruction || '').trim();
  if (!text || TARGETED_EDIT_TERMS.test(text)) return 'targeted';

  const asksForProfessionalEnhancement =
    /\b(?:redesign|reformat|restructure|professionalize|professionalise|polish|enhance|improve|upgrade)\b/i.test(text) ||
    /\bmake\b.{0,80}\b(?:professional|investor[- ]ready|modern|cleaner)\b/i.test(text);
  const refersToWholeDocument =
    /\b(?:whole|entire|complete|full)\s+(?:document|cv|resume|cover[\s-]?letter|portfolio|business\s+plan|presentation|proposal|report|meeting\s+notes)\b/i.test(text) ||
    /\b(?:document|cv|resume|cover[\s-]?letter|portfolio|business\s+plan|presentation|proposal|report|meeting\s+notes)\b/i.test(text) ||
    /\b(?:it|this)\b/i.test(text) ||
    /\b(?:cleaner\s+design|modern\s+design|better\s+layout)\b/i.test(text);

  return asksForProfessionalEnhancement && refersToWholeDocument ? 'full' : 'targeted';
}

export function parseDocumentAIResponse(response) {
  const cleaned = String(response || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  let value;
  try {
    value = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (typeof value.clarification === 'string' && value.clarification.trim()) {
    return { type: 'clarification', message: value.clarification.trim() };
  }
  if (value.wholeDocument === true && typeof value.replacementBody === 'string' && value.replacementBody.trim()) {
    return {
      type: 'whole',
      body: value.replacementBody.trim(),
      explanation: typeof value.explanation === 'string' ? value.explanation.trim() : '',
      design: value.design && typeof value.design === 'object' && !Array.isArray(value.design)
        ? value.design
        : {},
    };
  }
  if (typeof value.targetHeading === 'string' && value.targetHeading.trim() &&
      typeof value.replacementBody === 'string' && value.replacementBody.trim()) {
    return {
      type: 'section',
      heading: value.targetHeading.trim(),
      body: value.replacementBody.trim(),
      explanation: typeof value.explanation === 'string' ? value.explanation.trim() : '',
    };
  }
  return null;
}

export function normalizeDocumentDesign(value) {
  const design = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = {};
  if (['classic', 'modern', 'minimal', 'executive'].includes(design.template)) result.template = design.template;
  if (['sans', 'serif', 'mono'].includes(design.font)) result.font = design.font;
  if (['left', 'center', 'right', 'justify'].includes(design.alignment)) result.alignment = design.alignment;
  if (['portrait', 'landscape'].includes(design.orientation)) result.orientation = design.orientation;
  if (['compact', 'standard', 'wide'].includes(design.pageMargin)) result.pageMargin = design.pageMargin;
  return result;
}
