import { supabase } from '@/lib/supabaseClient';

type AnalyticsPayload = Record<string, unknown>;
type AnalyticsEvent = {
  event_id: string;
  event_name: string;
  feature: string | null;
  button_id: string | null;
  action: string | null;
  route: string;
  device_category: 'mobile' | 'tablet' | 'desktop';
  properties: AnalyticsPayload;
};

const CONSENT_KEY = 'facemex_analytics_consent';
const CONSENT_CHANGED_EVENT = 'facemex:analytics-consent-changed';
const ALLOWED_PROPERTIES = new Set([
  'intent',
  'image_count',
  'has_images',
  'tier',
  'auto_job_search',
  'batch_size',
  'total_jobs',
  'category',
  'source',
  'answer_length',
  'duration_ms',
]);
const VALUE_PATTERN = /^[\w:/ -]{0,64}$/;

declare global {
  interface Window {
    facemexProductAnalyticsConfigured?: boolean;
  }
}

export function isAnalyticsConfigured() {
  return true;
}

export function getAnalyticsConsent(): 'granted' | 'denied' {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export function initializeAnalytics() {
  if (typeof window !== 'undefined') window.facemexProductAnalyticsConfigured = true;
}

export function setAnalyticsConsent(consent: 'granted' | 'denied') {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch (error) {
    console.warn('FaceMeX analytics preference could not be saved.', error);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  }
}

function safeValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return VALUE_PATTERN.test(trimmed) ? trimmed : undefined;
}

function getDeviceCategory(): AnalyticsEvent['device_category'] {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/android|iphone|ipod|mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getSafeRoute() {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname
    .replace(/\/projects\/[^/]+/g, '/projects/:id')
    .replace(/\/profile\/[^/]+/g, '/profile/:id')
    .replace(/\/messages\/[^/]+/g, '/messages/:id')
    .replace(/\/watch\/[^/]+/g, '/watch/:id')
    .replace(/\/world\/event\/[^/]+/g, '/world/event/:id')
    .slice(0, 180);
}

function safeProperties(payload?: AnalyticsPayload) {
  const properties: AnalyticsPayload = {};
  if (!payload) return properties;
  for (const [key, value] of Object.entries(payload)) {
    if (!ALLOWED_PROPERTIES.has(key)) continue;
    const safe = safeValue(value);
    if (safe !== undefined) properties[key] = safe;
  }
  return properties;
}

function resolveFeature(payload: AnalyticsPayload | undefined, eventName: string) {
  const explicit = safeValue(payload?.feature);
  if (typeof explicit === 'string' && explicit) return explicit.slice(0, 48);
  if (eventName.startsWith('workspace_') || eventName.startsWith('ai_request_')) return 'ai_workspace';
  if (eventName.startsWith('document_')) return 'documents';
  if (eventName.startsWith('job_')) return 'job_search';
  if (eventName.startsWith('screen_share_')) return 'screen_sharing';
  return null;
}

function deriveOutcome(eventName: string): 'started' | 'success' | 'failure' | undefined {
  if (/(?:_started)$/.test(eventName)) return 'started';
  if (/(?:_failed|_failure|_error)$/.test(eventName)) return 'failure';
  if (/(?:_succeeded|_success|_generated|_exported|_completed)$/.test(eventName)) return 'success';
  return undefined;
}

export async function trackEvent(
  event: string,
  label?: string,
  payload?: AnalyticsPayload,
): Promise<void> {
  if (typeof window === 'undefined' || getAnalyticsConsent() !== 'granted') return;
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(event)) return;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) return;
    const eventPayload: AnalyticsEvent & { outcome?: string } = {
      event_id: crypto.randomUUID(),
      event_name: event,
      feature: resolveFeature(payload, event),
      button_id: typeof payload?.button_id === 'string'
        ? String(safeValue(payload.button_id) || '').slice(0, 64) || null
        : null,
      action: typeof payload?.action === 'string'
        ? String(safeValue(payload.action) || '').slice(0, 64) || null
        : label ? String(safeValue(label) || '').slice(0, 64) || null : null,
      route: getSafeRoute(),
      device_category: getDeviceCategory(),
      properties: safeProperties(payload),
    };
    const outcome = deriveOutcome(event);
    if (outcome) eventPayload.outcome = outcome;

    const response = await fetch('/.netlify/functions/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ action: 'track', event: eventPayload }),
      keepalive: true,
    });
    if (!response.ok) {
      console.warn('FaceMeX analytics event was not accepted.', { status: response.status, event });
    }
  } catch (error) {
    console.warn('FaceMeX analytics could not record an event.', error);
  }
}

export function trackAppOpen() {
  void trackEvent('app_open');
}

export function trackButtonClick(event: string, label?: string, payload?: AnalyticsPayload) {
  void trackEvent(event, label, { ...payload, button_id: payload?.button_id || event });
}

export function trackError(event: string, _message?: string, payload?: AnalyticsPayload) {
  void trackEvent(event, undefined, payload);
}

export function trackFeatureUse(payload?: AnalyticsPayload | string) {
  void trackEvent(typeof payload === 'string' ? payload : 'feature_use', undefined, typeof payload === 'object' ? payload : undefined);
}

export function trackImageAnalysis(count?: number, _prompt?: string, _label?: string, payload?: AnalyticsPayload) {
  void trackEvent('image_analysis', undefined, { ...payload, ...(count === undefined ? {} : { image_count: count }) });
}

export function trackLinkClick(_urlOrEvent: string, label?: string, payload?: AnalyticsPayload | string, meta?: AnalyticsPayload) {
  const event = typeof payload === 'string' ? payload : label || 'link_click';
  void trackEvent(event, undefined, meta || (typeof payload === 'object' ? payload : undefined));
}

export function trackUpload(payload?: AnalyticsPayload | string) {
  void trackEvent(typeof payload === 'string' ? payload : 'upload', undefined, typeof payload === 'object' ? payload : undefined);
}

export function trackWorkspaceOpen(payload?: AnalyticsPayload | string) {
  void trackEvent(typeof payload === 'string' ? payload : 'workspace_open', undefined, typeof payload === 'object' ? payload : undefined);
}

export function trackWorkspacePrompt(payload?: AnalyticsPayload | string) {
  void trackEvent('ai_request_started', undefined, typeof payload === 'object' ? payload : undefined);
}

export function trackWorkspaceResponse(payload?: AnalyticsPayload | string) {
  void trackEvent('ai_request_succeeded', undefined, typeof payload === 'object' ? payload : undefined);
}
