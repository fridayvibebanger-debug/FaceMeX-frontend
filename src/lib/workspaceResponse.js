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

export function normalizeWorkspaceImages(raw, limit = 3) {
  if (!Number.isInteger(limit) || limit < 1 || !raw || typeof raw !== 'object') return [];

  let payload = raw;
  for (let depth = 0; depth < 2; depth += 1) {
    if (Array.isArray(payload.images)) break;
    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) break;
    payload = payload.data;
  }

  if (!Array.isArray(payload.images)) return [];

  return payload.images.slice(0, limit).flatMap((image, index) => {
    if (!image || typeof image !== 'object' || Array.isArray(image)) return [];

    const url = responseText(image.url);
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'images.unsplash.com' ||
        parsedUrl.username || parsedUrl.password) return [];
    } catch {
      return [];
    }

    return [{
      id: responseText(image.id) || url || `unsplash-${index}`,
      url,
      alt: responseText(image.alt),
      attribution: responseText(image.photographer || image.attribution),
      attributionUrl: responseText(image.attributionUrl),
      photoUrl: responseText(image.photoUrl),
    }];
  });
}

export function normalizeClarificationText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function removeRepeatedClarification(value, question) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text || !question) return value;

  const questionKey = normalizeClarificationText(question);
  if (!questionKey) return value;

  const normalized = normalizeClarificationText(text);
  if (!normalized.includes(questionKey)) return value;

  return text
    .split(/(\r?\n+)/)
    .map((part) => {
      if (/^\r?\n+$/.test(part)) return part;
      return part
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => normalizeClarificationText(sentence) !== questionKey)
        .join(' ');
    })
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function createSolveForXGuidanceResponse(prompt = '') {
  const text = String(prompt || '');
  if (
    /[=≠≈]/.test(text) ||
    !/\b(?:how\s+to\s+solve\s+for\s+x|how\s+(?:do|can|should)\s+(?:i|we|you)\s+solve\s+for\s+x|solve\s+for\s+x|solving\s+for\s+x)\b/i.test(text)
  ) {
    return '';
  }

  return [
    '1. Simplify both sides of the equation.',
    '2. Move the terms containing X to one side.',
    '3. Move the constants to the other side.',
    '4. Divide by the coefficient of X to isolate it.',
    '5. Check the answer by substituting it back into the original equation.',
    '',
    'Send me your exact equation, and I\'ll solve it step by step.',
  ].join('\n');
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
  const clarification = raw.followUp ?? raw.followup ?? raw.clarification;
  const question = responseText(
    clarification?.question ??
    raw.clarifyingQuestion ??
    (typeof clarification === 'string' ? clarification : raw.question),
  );
  const clarificationOptions = clarification?.options ?? clarification?.choices;
  const options = Array.isArray(clarificationOptions)
    ? clarificationOptions.map(responseText).filter(Boolean)
    : Array.isArray(raw.options)
      ? raw.options.map(responseText).filter(Boolean)
      : Array.isArray(raw.choices)
        ? raw.choices.map(responseText).filter(Boolean)
        : [];
  const validFollowUp = question.length <= 160 &&
    !/[|\]\r\n]/.test(question) &&
    options.length >= 2 &&
    options.length <= MAX_FOLLOW_UP_OPTIONS &&
    options.every((option) => option.length <= 80 && !/[|\]\r\n]/.test(option));
  const followUpMarker = validFollowUp
    ? `[[FOLLOW_UP: ${question} | ${options.join(' | ')}]]`
    : '';
  const answerSections = [
    directAnswer || suggestions,
    ...sections,
    ...(warnings.length ? ['### Important cautions', ...warnings.map((warning) => `- ${warning}`)] : []),
  ];
  const questionKey = normalizeClarificationText(question);
  const cleanedSections = validFollowUp
    ? answerSections.map((section) => removeRepeatedClarification(section, questionKey)).filter(Boolean)
    : answerSections;

  return [
    ...cleanedSections,
    followUpMarker,
  ].filter(Boolean).join('\n\n') || fallback;
}

const TECHNICAL_REQUEST_PATTERN = /\b(?:write|generate|provide|show|give|create|build|implement|fix|debug|refactor|review|run|execute|convert|translate)\b.{0,80}\b(?:code|script|program|function|component|query|regex|regular expression|javascript|typescript|react|python|java|c\+\+|html|css|sql|json|yaml|xml|api|terminal|command line)\b|\b(?:source code|example code|sample code|programming help|coding help|debugging help|technical documentation)\b|\b(?:code|coding|programming)\b.{0,50}\b(?:example|snippet|function|component|script|program|query)\b/i;
const CODE_LANGUAGE_PATTERN = /^(?:[a-z][\w+-]*|)$/i;
const CODE_SYNTAX_PATTERN = /(?:^|\n)\s*(?:import\s+(?:\{|\*|[\w$]+(?:\s+from\s+|$))|export\s+(?:default|const|function|class)|(?:const|let|var)\s+[\w$]+\s*=|function\s+[\w$]*\s*\(|class\s+[\w$]+\s*(?:\{|extends\b)|def\s+[\w$]+\s*\(|(?:SELECT|INSERT|UPDATE|DELETE)\s+[\w*]+\s+FROM\b|<\/?[a-z][^>]*>|[\w$]+\s*=>)/i;
const CODE_LINE_PATTERN = /^\s*(?:import\s+(?:\{|\*|[\w$]+(?:\s+from\s+|$))|export\s+(?:default|const|function|class)|(?:const|let|var)\s+[\w$]+\s*=|function\s+[\w$]*\s*\(|class\s+[\w$]+\s*(?:\{|extends\b)|def\s+[\w$]+\s*\(|(?:SELECT|INSERT|UPDATE|DELETE)\s+[\w*]+\s+FROM\b|console\.(?:log|error|warn)\s*\(|\/\/|#include\b|<\/?[a-z][^>]*>)/i;
const INTERNAL_OUTPUT_PATTERN = /(?:\b(?:system prompt|hidden instructions|developer message|internal reasoning|stack trace|traceback)\b|^\s*at\s+[\w.$]+\s*\(|\b(?:TypeError|ReferenceError|SyntaxError):\s)/im;

export function isExplicitTechnicalRequest(prompt) {
  const text = String(prompt || '');
  if (/\b(?:without|no|don't|do not|not)\s+(?:include\s+|show\s+|give\s+|use\s+)?(?:any\s+)?(?:source\s+)?code\b/i.test(text)) {
    return false;
  }
  return TECHNICAL_REQUEST_PATTERN.test(text);
}

function isMachineResponseJson(text) {
  if (!/^\s*[\[{]/.test(text)) return false;
  try {
    const value = JSON.parse(text);
    return Boolean(value && typeof value === 'object');
  } catch {
    return false;
  }
}

export function normalizeWorkspaceAnswerForDisplay(answer, prompt = '') {
  let text = String(answer || '').trim();
  if (!text || isExplicitTechnicalRequest(prompt)) return text;
  if (
    INTERNAL_OUTPUT_PATTERN.test(text) ||
    /^\s*(?:system|developer)\s*:/im.test(text) ||
    /^\s*you are facemex\b/im.test(text) ||
    isMachineResponseJson(text)
  ) {
    return 'Sorry, I couldn’t format that answer clearly. Please ask again, and I’ll try to explain it in plain language.';
  }

  text = text.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (block, rawLanguage, body) => {
    const language = String(rawLanguage || '').trim().toLowerCase();
    if (['chart', 'diagram'].includes(language)) {
      return parseWorkspaceVisualization(language, body) ? block : '';
    }
    const isCode = (
      CODE_LANGUAGE_PATTERN.test(language) &&
      /^(?:js|jsx|ts|tsx|py|python|java|c|cpp|csharp|cs|go|rust|php|ruby|swift|kotlin|sql|html|css|json|bash|sh|shell|powershell|yaml|yml|xml|jsonc)$/.test(language)
    ) || CODE_SYNTAX_PATTERN.test(body);
    return isCode ? '' : block;
  });
  text = text.replace(/`([^`\n]+)`/g, (inlineCode, body) =>
    CODE_SYNTAX_PATTERN.test(body) ? '' : inlineCode
  );
  text = text
    .split(/\n{2,}/)
    .filter((paragraph) => !(
      CODE_SYNTAX_PATTERN.test(paragraph) ||
      paragraph.split('\n').some((line) => CODE_LINE_PATTERN.test(line))
    ))
    .join('\n\n')
    .replace(/<\/?[a-z][^>]*>/gi, '');
  if (!text.trim()) {
    return 'Sorry, I couldn’t format that answer clearly. Please ask again, and I’ll try to explain it in plain language.';
  }
  return text.trim();
}

export function createWorkspaceMediaPlan(prompt, context = '') {
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
    ['programming-software', /\b(code|programming|software|javascript|typescript|react|python|api|component|interface|debug)\b/i],
    ['food', /\b(recipe|cook|cooking|food|dish|meal|chicken|bake|fry|ingredients)\b/i],
    ['people-fashion', /\b(outfit|fashion|clothing|beauty|hairstyle|makeup|model)\b/i],
    ['products-shopping', /\b(product|shopping|buy|compare|laptop|phone|gadget)\b/i],
    ['places-travel', /\b(travel|visit|tourism|landmark|destination|hotel|city)\b/i],
    ['education-science-technology', /\b(photosynthesis|solar|science|biology|physics|chemistry|math|mathematics|lesson|teach|explain|study)\b/i],
    ['business-professional', /\b(business|brand|branding|logo|startup|company|marketing|professional)\b/i],
    ['architecture-engineering', /\b(architecture|building|construction|engineering|blueprint|structure)\b/i],
    ['nature-environment', /\b(nature|animal|wildlife|plant|environment|climate|garden)\b/i],
    ['art-design', /\b(art|design|creative|illustration|graphic|logo|inspiration)\b/i],
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
    .slice(0, 180)
    .replace(/[\r\n|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:please\s+)?(?:how\s+(?:do|can|should)\s+i|what\s+is|explain|tell\s+me\s+about|show\s+me|find\s+me|give\s+me)\s+/i, '')
    .replace(/[?!.,;:]+$/g, '')
    .trim();
  const asksForImages = /\b(?:image|images|photo|photos|picture|pictures|visual reference|show me what .{1,35} looks like)\b/i.test(request);
  const asksForVideos = /\b(?:video|videos|youtube|watch|lesson video|find .* lesson|tutorial video)\b/i.test(request);
  const asksForLearningVideo = /\b(?:explain|teach|learn|tutorial|lesson|walk me through|step[- ]by[- ]step|how\s+(?:do|does|can|should|to)\b|show me how|guide me through|prepare for (?:a |an )?(?:job )?interview|career guidance|career planning|career advice|career path|career plan|improve my skills|skill development)\b/i.test(request);
  const asksForConceptExplanation = /\bwhat (?:is|are)\b/i.test(request) &&
    !/\b(?:capital|population|currency|president) of\b|\b(?:weather|time|distance|age)\b|\byour name\b/i.test(request);
  const hasVisualTopic = [
    category === 'food',
    category === 'people-fashion',
    category === 'products-shopping',
    category === 'places-travel',
    category === 'education-science-technology',
    category === 'architecture-engineering',
    category === 'nature-environment',
    category === 'art-design',
    /\b(?:logo|branding|cv example|resume example|cv template|resume template|portfolio example)\b/i.test(request),
  ].some(Boolean);
  const imageIsRelevant = category !== 'programming-software' && (asksForImages || hasVisualTopic);
  const imageQuery = subject
    ? `${subject} ${/\b(cv|resume)\b/i.test(request) ? 'CV resume template' : ''}`.replace(/\s+/g, ' ').trim().slice(0, 160)
    : '';
  const videoQuery = subject
    .replace(/\s+\b(?:and\s+)?(?:show|find|get|give)\s+me\b.*$/i, '')
    .replace(/^(?:(?:one|two|three|a few|some|\d+)\s+)?(?:useful\s+|relevant\s+)?(?:videos?|lessons?|youtube)\s+(?:about|on|for)\s+/i, '')
    .replace(/\s+(?:useful\s+|relevant\s+)?(?:videos?|lessons?|youtube)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  const asksForScienceExplanation = category === 'education-science-technology' &&
    /\b(?:how|why|what)\b/i.test(request);
  const showVideos = Boolean(
    (asksForVideos || asksForLearningVideo || asksForConceptExplanation || asksForScienceExplanation) &&
    videoQuery,
  );

  return {
    category,
    imageQuery: imageIsRelevant ? imageQuery : '',
    videoQuery: showVideos ? videoQuery : '',
    showImages: Boolean(imageIsRelevant && imageQuery),
    showVideos,
  };
}

const YOUTUBE_QUERY_STOP_WORDS = new Set([
  'about', 'and', 'are', 'can', 'does', 'for', 'from', 'help', 'how', 'into',
  'learn', 'lesson', 'make', 'me', 'my', 'please', 'show', 'teach', 'the',
  'through', 'to', 'tutorial', 'video', 'videos', 'walk', 'watch', 'what',
  'when', 'where', 'which', 'who', 'why', 'with', 'work', 'you', 'your',
  'explain', 'guide', 'step', 'steps', 'should', 'could', 'would', 'prepare',
  'improve', 'skills', 'skill', 'development', 'career', 'plan', 'job',
  'student', 'old', 'year', 'human', 'diagram',
]);

export function selectRelevantYouTubeLessonVideos(videos, query, limit = 2) {
  if (!Array.isArray(videos) || !Number.isInteger(limit) || limit < 1) return [];

  const terms = [...new Set(
    (String(query || '').toLowerCase().match(/[a-z0-9]+/g) || [])
      .filter((term) => term.length > 2 && !/^\d+$/.test(term) && !YOUTUBE_QUERY_STOP_WORDS.has(term)),
  )];
  if (!terms.length) return [];

  const selected = [];
  const seenIds = new Set();

  for (const video of videos) {
    if (!video || typeof video !== 'object') continue;
    const id = String(video.videoId || video.id || '').trim();
    if (!id || seenIds.has(id)) continue;

    const searchableText = [
      video.title,
      video.description,
      video.channelTitle,
    ].filter((value) => typeof value === 'string').join(' ').toLowerCase();
    const searchableTerms = new Set(searchableText.match(/[a-z0-9]+/g) || []);
    const matchedTerms = terms.filter((term) => searchableTerms.has(term)).length;
    const minimumMatches = terms.length > 1 ? 2 : 1;
    if (matchedTerms < minimumMatches) continue;

    seenIds.add(id);
    selected.push(video);
    if (selected.length >= limit) break;
  }

  return selected;
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
