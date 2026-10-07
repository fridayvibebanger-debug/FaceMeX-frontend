type AnalyticsPayload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    facemexGoogleAnalyticsLoaded?: boolean;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || '';
const ANALYTICS_CONSENT_KEY = 'facemex_analytics_consent';
const ALLOWED_PAYLOAD_FIELDS = new Set([
  'page_path',
  'path',
  'intent',
  'image_count',
  'has_images',
  'tier',
  'auto_job_search',
  'feature',
  'action',
  'batch_size',
  'total_jobs',
  'category',
]);

function hasAnalyticsConsent() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

function safeAnalyticsValue(value: unknown) {
  if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim();
  if (normalized.length > 64 || /[@?=#]/.test(normalized)) return undefined;
  return /^[\w:/ -]*$/.test(normalized) ? normalized : undefined;
}

function safeAnalyticsPayload(payload?: AnalyticsPayload) {
  if (!payload) return {};
  const safe: Record<string, string | number | boolean> = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (!ALLOWED_PAYLOAD_FIELDS.has(key)) return;
    const safeValue = safeAnalyticsValue(value);
    if (safeValue !== undefined) safe[key] = safeValue;
  });

  return safe;
}

export function isAnalyticsConfigured() {
  return Boolean(GA_MEASUREMENT_ID);
}

export function getAnalyticsConsent(): 'granted' | 'denied' | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function initializeAnalytics() {
  if (
    typeof window === 'undefined' ||
    !GA_MEASUREMENT_ID ||
    !hasAnalyticsConsent() ||
    window.facemexGoogleAnalyticsLoaded
  ) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  script.onload = () => {
    window.facemexGoogleAnalyticsLoaded = true;
  };
  document.head.appendChild(script);
}

export function setAnalyticsConsent(consent: 'granted' | 'denied') {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  } catch {
    return;
  }

  if (consent === 'granted') {
    initializeAnalytics();
  } else if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('consent', 'update', { analytics_storage: 'denied' });
  }
}

export function trackEvent(event: string, _label?: string, payload?: AnalyticsPayload) {
  if (typeof window === 'undefined' || !hasAnalyticsConsent() || !window.gtag) return;
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(event)) return;

  window.gtag('event', event, safeAnalyticsPayload(payload));
}

export function trackAppOpen() {
  trackEvent('app_open');
}

export function trackButtonClick(event: string, label?: string, payload?: AnalyticsPayload) {
  trackEvent(event, label, payload || (label ? { action: label } : undefined));
}

export function trackError(event: string, _message?: string, payload?: AnalyticsPayload) {
  trackEvent(event, undefined, payload);
}

export function trackFeatureUse(payload?: AnalyticsPayload | string) {
  trackEvent(typeof payload === 'string' ? payload : 'feature_use', undefined, typeof payload === 'object' ? payload : undefined);
}

export function trackImageAnalysis(count?: number, _prompt?: string, _label?: string, payload?: AnalyticsPayload) {
  trackEvent('image_analysis', undefined, payload || (count === undefined ? undefined : { image_count: count }));
}

export function trackLinkClick(_urlOrEvent: string, label?: string, payload?: AnalyticsPayload | string, meta?: AnalyticsPayload) {
  const event = typeof payload === 'string' ? payload : label || 'link_click';
  trackEvent(event, undefined, meta || (typeof payload === 'object' ? payload : undefined));
}

export function trackUpload(payload?: AnalyticsPayload | string) {
  trackEvent(typeof payload === 'string' ? payload : 'upload', undefined, typeof payload === 'object' ? payload : undefined);
}

export function trackWorkspaceOpen(payload?: AnalyticsPayload | string) {
  trackEvent(typeof payload === 'string' ? payload : 'workspace_open', undefined, typeof payload === 'object' ? payload : undefined);
}

export function trackWorkspacePrompt(payload?: AnalyticsPayload | string) {
  trackEvent(typeof payload === 'string' ? payload : 'workspace_prompt', undefined, typeof payload === 'object' ? payload : undefined);
}

export function trackWorkspaceResponse(payload?: AnalyticsPayload | string) {
  trackEvent(typeof payload === 'string' ? payload : 'workspace_response', undefined, typeof payload === 'object' ? payload : undefined);
}
