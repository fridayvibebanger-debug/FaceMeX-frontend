const MAX_CHART_POINTS = 12;
const MAX_FLOW_STEPS = 8;

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
