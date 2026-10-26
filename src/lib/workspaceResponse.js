const MAX_CHART_POINTS = 12;
const MAX_FLOW_STEPS = 8;
const MAX_FOLLOW_UP_OPTIONS = 5;

function safeLabel(value, maxLength) {
  if (typeof value !== 'string') return null;
  const label = value.trim();
  return label && label.length <= maxLength ? label : null;
}

export function parseWorkspaceVisualization(kind, source) {
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const title = safeLabel(value.title, 100);
  if (!title) return null;

  if (kind === 'chart') {
    if (!['bar', 'line'].includes(value.type) || !Array.isArray(value.data) ||
      value.data.length === 0 || value.data.length > MAX_CHART_POINTS) return null;
    const xLabel = safeLabel(value.xLabel, 60);
    const yLabel = safeLabel(value.yLabel, 60);
    if (!xLabel || !yLabel) return null;
    const data = value.data.map((point) => {
      if (!point || typeof point !== 'object' || Array.isArray(point) ||
        typeof point.value !== 'number' || !Number.isFinite(point.value) ||
        Math.abs(point.value) > 1_000_000_000_000) return null;
      const label = safeLabel(point.label, 48);
      return label ? { label, value: point.value } : null;
    });
    if (data.some((point) => point === null)) return null;
    return { kind: 'chart', chartType: value.type, title, xLabel, yLabel, data };
  }

  if (kind === 'diagram' && value.type === 'flow' && Array.isArray(value.steps) &&
    value.steps.length >= 2 && value.steps.length <= MAX_FLOW_STEPS) {
    const steps = value.steps.map((step) => safeLabel(step, 180));
    if (steps.some((step) => step === null)) return null;
    return { kind: 'diagram', diagramType: 'flow', title, steps };
  }

  return null;
}

export function extractYouTubeVideoId(input) {
  if (typeof input !== 'string' || input.length > 2048) return null;
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) return null;

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (hostname === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return /^[\w-]{11}$/.test(id || '') ? id : null;
  }
  if (!['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(hostname)) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  const id = url.pathname === '/watch'
    ? url.searchParams.get('v')
    : ['embed', 'shorts', 'live'].includes(segments[0]) ? segments[1] : null;
  return /^[\w-]{11}$/.test(id || '') ? id : null;
}

export function extractYouTubeUrlFromText(input) {
  if (typeof input !== 'string') return null;
  const match = input.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s<>"']+/i);
  if (!match) return null;
  const candidate = match[0].replace(/[),.;!?]+$/, '');
  const videoId = extractYouTubeVideoId(candidate);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

export function isYouTubeSummaryRequest(input) {
  return typeof input === 'string' &&
    /\b(?:summari[sz](?:e|es|ed|ing)|summary|transcrib(?:e|es|ed|ing)|transcript)\b/i.test(input);
}

function responseText(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) {
    return value.map((item) => responseText(
      typeof item === 'object' && item !== null
        ? item.content ?? item.text ?? item.body ?? item.label
        : item
    )).filter(Boolean).join('\n');
  }
  return '';
}

export function normalizeWorkspaceResponse(raw, fallback = '') {
  if (typeof raw === 'string') return raw.trim() || fallback;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;

  const directAnswer = [raw.answer, raw.reply, raw.response, raw.text, raw.content, raw.message]
    .map(responseText)
    .find(Boolean) || '';
  const suggestions = Array.isArray(raw.suggestions)
    ? raw.suggestions.map(responseText).filter(Boolean).join('\n\n')
    : '';
  const sections = Array.isArray(raw.sections)
    ? raw.sections.map((section) => {
      if (!section || typeof section !== 'object') return responseText(section);
      const heading = responseText(section.heading ?? section.title);
      const content = responseText(section.content ?? section.text ?? section.body);
      return [heading ? `### ${heading}` : '', content].filter(Boolean).join('\n\n');
    }).filter(Boolean)
    : [];
  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : [raw.warnings])
    .map(responseText)
    .filter(Boolean);
  const followUp = raw.followUp ?? raw.followup;
  const question = responseText(followUp?.question);
  const options = Array.isArray(followUp?.options)
    ? followUp.options.map(responseText).filter(Boolean)
    : Array.isArray(followUp?.choices)
      ? followUp.choices.map(responseText).filter(Boolean)
      : [];
  const validFollowUp = question.length <= 160 &&
    !/[|\]\r\n]/.test(question) &&
    options.length >= 2 &&
    options.length <= MAX_FOLLOW_UP_OPTIONS &&
    options.every((option) => option.length <= 80 && !/[|\]\r\n]/.test(option));
  const followUpMarker = validFollowUp
    ? `[[FOLLOW_UP: ${question} | ${options.join(' | ')}]]`
    : '';

  return [
    directAnswer || suggestions,
    ...sections,
    ...(warnings.length ? ['### Important cautions', ...warnings.map((warning) => `- ${warning}`)] : []),
    followUpMarker,
  ].filter(Boolean).join('\n\n') || fallback;
}

export function createWorkspaceMediaPlan(prompt, context = '', answer = '') {
  const currentPrompt = String(prompt || '').replace(/\s+/g, ' ').trim();
  const isShortFollowUp = currentPrompt.length <= 60 &&
    currentPrompt.split(/\s+/).length <= 4 &&
    !/[?!.]/.test(currentPrompt) &&
    !/^(?:what|who|where|when|which|how|can|could|would|will|is|are|do|does|did|please|help|write|make|create|start|fix|build|explain|show|find|search|calculate|plan|compare|give)\b/i.test(currentPrompt);
  const request = `${isShortFollowUp ? String(context || '').slice(-1200) : ''}\n${currentPrompt}`
    .replace(/\s+/g, ' ')
    .trim();
  const lower = request.toLowerCase();
  const categories = [
    ['food', /\b(recipe|cook|cooking|food|dish|meal|chicken|bake|fry|ingredients)\b/i],
    ['people-fashion', /\b(outfit|fashion|clothing|beauty|hairstyle|makeup|model)\b/i],
    ['products-shopping', /\b(product|shopping|buy|compare|laptop|phone|gadget)\b/i],
    ['places-travel', /\b(travel|visit|tourism|landmark|destination|hotel|city)\b/i],
    ['education-science-technology', /\b(photosynthesis|solar|science|biology|physics|chemistry|math|mathematics|lesson|teach|explain|study)\b/i],
    ['business-professional', /\b(business|brand|branding|logo|startup|company|marketing|professional)\b/i],
    ['architecture-engineering', /\b(architecture|building|construction|engineering|blueprint|structure)\b/i],
    ['nature-environment', /\b(nature|animal|wildlife|plant|environment|climate|garden)\b/i],
    ['art-design', /\b(art|design|creative|illustration|graphic|logo|inspiration)\b/i],
    ['programming-software', /\b(code|programming|software|javascript|typescript|react|python|api|component|interface|debug)\b/i],
  ];
  const category = categories.find(([, pattern]) => pattern.test(lower))?.[0] || 'other';
  const contextualUserPrompts = isShortFollowUp
    ? String(context || '')
      .split('\n')
      .filter((line) => /^\s*user:/i.test(line))
      .slice(-2)
      .map((line) => line.replace(/^\s*user:\s*/i, '').trim())
    : [];
  const subject = [...contextualUserPrompts, currentPrompt]
    .filter(Boolean)
    .join(' — ')
    .slice(0, 180);
  const answerText = String(answer || '');
  const visualContext = answerText
    .replace(/\[\[(?:VISUAL_REFERENCE|FOLLOW_UP):?[\s\S]*?\]\]/g, ' ')
    .replace(/[#*_`[\]()>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  const imageSubject = [subject.slice(0, 100), visualContext]
    .filter(Boolean)
    .join(' ')
    .slice(0, 145)
    .trim();
  const videoSubject = [subject.slice(0, 120), visualContext.slice(0, 60)]
    .filter(Boolean)
    .join(' ')
    .slice(0, 175)
    .trim();

  return {
    category,
    imageQuery: imageSubject ? `${imageSubject} visual reference`.slice(0, 160) : '',
    videoQuery: videoSubject ? `${videoSubject} explainer lesson`.slice(0, 210) : '',
    showImages: Boolean(imageSubject),
    showVideos: Boolean(videoSubject),
  };
}

export function parseWorkspaceFollowUp(input) {
  if (typeof input !== 'string') return { content: '', followUp: null };
  const marker = /\[\[FOLLOW_UP:\s*([^\]\n]{1,240})\]\]/i;
  const match = input.match(marker);
  if (!match) return { content: input, followUp: null };

  const [question, ...rawOptions] = match[1].split('|').map((value) => value.trim());
  const options = rawOptions.filter((option) => option.length > 0 && option.length <= 80);
  if (!question || question.length > 160 || options.length < 2 || options.length > MAX_FOLLOW_UP_OPTIONS) {
    return { content: input, followUp: null };
  }

  return {
    content: input.replace(match[0], '').trim(),
    followUp: { question, options },
  };
}
