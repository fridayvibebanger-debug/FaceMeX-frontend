import { supabase } from '@/lib/supabaseClient';

type AnalyticsMetadata = Record<string, any>;

type FeatureUseInput = {
  feature: string;
  action: string;
  page?: string;
  metadata?: AnalyticsMetadata;
};

type UploadTrackInput = {
  uploadType: 'image' | 'video' | 'document' | 'audio' | 'avatar' | 'other';
  count?: number;
  page?: string;
  metadata?: AnalyticsMetadata;
};

type WorkspacePromptInput = {
  prompt: string;
  page?: string;
  intent?: string;
  source?: string;
  metadata?: AnalyticsMetadata;
};

const ANALYTICS_VERSION = '2026-06-07-v1';

const DEFAULT_ADMIN_EMAILS = [
  'luckymawasha72@gmail.com',
  'fridayvibebanger@gmail.com',
];

const DEFAULT_ADMIN_IDS: string[] = [];

function getEnvList(key: string) {
  try {
    const value = String((import.meta as any)?.env?.[key] || '');
    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const ADMIN_EMAILS = Array.from(
  new Set([
    ...DEFAULT_ADMIN_EMAILS.map((email) => email.toLowerCase()),
    ...getEnvList('VITE_ANALYTICS_EXCLUDE_EMAILS'),
  ])
);

const ADMIN_IDS = Array.from(
  new Set([
    ...DEFAULT_ADMIN_IDS.map((id) => id.toLowerCase()),
    ...getEnvList('VITE_ANALYTICS_EXCLUDE_USER_IDS'),
  ])
);

function safeString(value: unknown) {
  return String(value || '').trim();
}

function getCurrentPage() {
  if (typeof window === 'undefined') return '/unknown';
  return window.location.pathname || '/unknown';
}

function getUserAgent() {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent || '';
}

function getReferrer() {
  if (typeof document === 'undefined') return '';
  return document.referrer || '';
}

function getScreenInfo() {
  if (typeof window === 'undefined') {
    return {
      width: null,
      height: null,
      pixelRatio: null,
    };
  }

  return {
    width: window.innerWidth || null,
    height: window.innerHeight || null,
    pixelRatio: window.devicePixelRatio || null,
  };
}

function getSessionId() {
  if (typeof window === 'undefined') return 'server-session';

  try {
    const key = 'facemex_analytics_session_id';
    const existing = sessionStorage.getItem(key);

    if (existing) return existing;

    const next =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    sessionStorage.setItem(key, next);

    return next;
  } catch {
    return `session-${Date.now()}`;
  }
}

function getDeviceId() {
  if (typeof window === 'undefined') return 'server-device';

  try {
    const key = 'facemex_analytics_device_id';
    const existing = localStorage.getItem(key);

    if (existing) return existing;

    const next =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(key, next);

    return next;
  } catch {
    return `device-${Date.now()}`;
  }
}

function isAdminUser(user: any) {
  const email = safeString(user?.email).toLowerCase();
  const id = safeString(user?.id).toLowerCase();

  const appRole = safeString(user?.app_metadata?.role).toLowerCase();
  const userRole = safeString(user?.user_metadata?.role).toLowerCase();

  if (email && ADMIN_EMAILS.includes(email)) return true;
  if (id && ADMIN_IDS.includes(id)) return true;
  if (appRole === 'admin' || userRole === 'admin') return true;

  return false;
}

function redactSensitiveText(text: string) {
  return String(text || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone]')
    .replace(/\b\d{13}\b/g, '[id-number]')
    .replace(/\b\d{8,16}\b/g, '[number]')
    .replace(/(password|passcode|pin|otp|cvv)\s*[:=]\s*\S+/gi, '$1: [redacted]')
    .trim();
}

function createPreview(text: string, max = 160) {
  const cleaned = redactSensitiveText(text)
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
}

function getUrlInfo(url: string) {
  try {
    const u = new URL(url);

    return {
      full_url: u.href,
      domain: u.hostname,
      path: u.pathname,
    };
  } catch {
    return {
      full_url: url,
      domain: '',
      path: '',
    };
  }
}

function detectPromptIntent(text: string) {
  const t = safeString(text).toLowerCase();

  if (!t) return 'empty';

  if (
    /\b(date|today|today's date|current date|what date|what is the date)\b/i.test(t)
  ) {
    return 'date_question';
  }

  if (
    /\b(job|jobs|work|hiring|vacancy|vacancies|career|apply|application|learnership|internship|interview|cv|cover letter|employment)\b/i.test(t)
  ) {
    return 'career_job_search';
  }

  if (
    /\b(scam|fake|legit|legitimate|verify|safe|risky|real or fake|is this real|is this legit)\b/i.test(t)
  ) {
    return 'opportunity_verification';
  }

  if (
    /\b(image|screenshot|photo|picture|document|pdf|analyse this|analyze this|read this)\b/i.test(t)
  ) {
    return 'image_or_document_analysis';
  }

  if (
    /\b(logistics|delivery|courier|transport|driver|parcel|primelink)\b/i.test(t)
  ) {
    return 'logistics_business';
  }

  if (
    /\b(investor|investors|funding|grant|grants|funder|capital|pitch|startup|business plan|partnership)\b/i.test(t)
  ) {
    return 'business_funding';
  }

  if (
    /\b(marketplace|shop|sell|buy|customer|business profile|advertise)\b/i.test(t)
  ) {
    return 'marketplace_business';
  }

  if (
    /\b(code|sql|supabase|netlify|render|bug|error|fix|api|database)\b/i.test(t)
  ) {
    return 'technical_support';
  }

  return 'general_question';
}

function sanitizeMetadata(metadata: AnalyticsMetadata = {}) {
  const safe: AnalyticsMetadata = {};

  Object.entries(metadata || {}).forEach(([key, value]) => {
    if (value === undefined) return;

    const lowerKey = key.toLowerCase();

    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('api_key') ||
      lowerKey.includes('card') ||
      lowerKey.includes('cvv') ||
      lowerKey.includes('bank')
    ) {
      safe[key] = '[redacted]';
      return;
    }

    if (typeof value === 'string') {
      safe[key] = redactSensitiveText(value).slice(0, 500);
      return;
    }

    if (Array.isArray(value)) {
      safe[key] = value.slice(0, 20);
      return;
    }

    if (typeof value === 'object' && value !== null) {
      try {
        safe[key] = JSON.parse(JSON.stringify(value)).safeOnly ?? value;
      } catch {
        safe[key] = '[object]';
      }

      return;
    }

    safe[key] = value;
  });

  return safe;
}

async function getAnalyticsUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

async function updateProfileActivity(userId: string) {
  try {
    await supabase
      .from('profiles')
      .update({
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch {
    // Do not break app if profile update fails.
  }
}

export async function trackEvent(
  eventName: string,
  page?: string,
  metadata: AnalyticsMetadata = {}
) {
  try {
    const user = await getAnalyticsUser();

    if (!user?.id) return;
    if (isAdminUser(user)) return;

    const finalPage = page || getCurrentPage();

    const finalMetadata = sanitizeMetadata({
      ...metadata,
      analytics_version: ANALYTICS_VERSION,
      session_id: getSessionId(),
      device_id: getDeviceId(),
      page: finalPage,
      screen: getScreenInfo(),
      user_agent: getUserAgent(),
      created_client_at: new Date().toISOString(),
    });

    await supabase.from('user_events').insert({
      user_id: user.id,
      event_name: eventName,
      page: finalPage,
      metadata: finalMetadata,
    });

    await updateProfileActivity(user.id);
  } catch (error) {
    console.warn('Analytics tracking failed:', error);
  }
}

export async function trackAppOpen() {
  try {
    const user = await getAnalyticsUser();

    if (!user?.id) return;
    if (isAdminUser(user)) return;

    const sessionId = getSessionId();
    const page = getCurrentPage();

    await supabase.from('user_events').insert({
      user_id: user.id,
      event_name: 'app_open',
      page,
      metadata: sanitizeMetadata({
        analytics_version: ANALYTICS_VERSION,
        session_id: sessionId,
        device_id: getDeviceId(),
        user_agent: getUserAgent(),
        referrer: getReferrer(),
        screen: getScreenInfo(),
        opened_at: new Date().toISOString(),
      }),
    });

    const sessionKey = `facemex_session_counted_${user.id}_${sessionId}`;
    const alreadyCounted =
      typeof window !== 'undefined'
        ? sessionStorage.getItem(sessionKey) === 'yes'
        : false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_seen_at,total_sessions')
      .eq('id', user.id)
      .maybeSingle();

    const nextUpdate: Record<string, any> = {
      first_seen_at: profile?.first_seen_at || new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    };

    if (!alreadyCounted) {
      nextUpdate.total_sessions = Number(profile?.total_sessions || 0) + 1;

      try {
        sessionStorage.setItem(sessionKey, 'yes');
      } catch {}
    }

    await supabase.from('profiles').update(nextUpdate).eq('id', user.id);
  } catch (error) {
    console.warn('App open tracking failed:', error);
  }
}

export async function trackPageView(page?: string, metadata: AnalyticsMetadata = {}) {
  return trackEvent('page_view', page || getCurrentPage(), {
    feature: 'navigation',
    action: 'page_view',
    ...metadata,
  });
}

export async function trackFeatureUse(input: FeatureUseInput) {
  return trackEvent(input.action, input.page || getCurrentPage(), {
    feature: input.feature,
    action: input.action,
    ...input.metadata,
  });
}

export async function trackButtonClick(
  buttonName: string,
  page?: string,
  metadata: AnalyticsMetadata = {}
) {
  return trackEvent('button_click', page || getCurrentPage(), {
    feature: 'ui',
    action: 'button_click',
    button_name: buttonName,
    ...metadata,
  });
}

export async function trackSearch(
  query: string,
  page?: string,
  metadata: AnalyticsMetadata = {}
) {
  const cleanQuery = safeString(query);

  return trackEvent('search_performed', page || getCurrentPage(), {
    feature: 'search',
    action: 'search_performed',
    query_preview: createPreview(cleanQuery, 120),
    query_length: cleanQuery.length,
    ...metadata,
  });
}

export async function trackLinkClick(
  url: string,
  label?: string,
  page?: string,
  metadata: AnalyticsMetadata = {}
) {
  const info = getUrlInfo(url);

  return trackEvent('link_clicked', page || getCurrentPage(), {
    feature: 'links',
    action: 'link_clicked',
    label: label || '',
    url: info.full_url,
    domain: info.domain,
    path: info.path,
    ...metadata,
  });
}

export async function trackWorkspaceOpen(metadata: AnalyticsMetadata = {}) {
  return trackEvent('workspace_opened', getCurrentPage(), {
    feature: 'FaceMeX Career Workspace',
    action: 'workspace_opened',
    ...metadata,
  });
}

export async function trackWorkspacePrompt(input: WorkspacePromptInput | string) {
  const promptText = typeof input === 'string' ? input : input.prompt;
  const page = typeof input === 'string' ? getCurrentPage() : input.page || getCurrentPage();
  const metadata = typeof input === 'string' ? {} : input.metadata || {};
  const intent =
    typeof input === 'string'
      ? detectPromptIntent(promptText)
      : input.intent || detectPromptIntent(promptText);

  return trackEvent('workspace_prompt_sent', page, {
    feature: 'FaceMeX Career Workspace',
    action: 'workspace_prompt_sent',
    intent,
    source: typeof input === 'string' ? 'workspace' : input.source || 'workspace',
    prompt_preview: createPreview(promptText, 180),
    prompt_length: safeString(promptText).length,
    word_count: safeString(promptText).split(/\s+/).filter(Boolean).length,
    ...metadata,
  });
}

export async function trackWorkspaceResponse(metadata: AnalyticsMetadata = {}) {
  return trackEvent('workspace_response_received', getCurrentPage(), {
    feature: 'FaceMeX Career Workspace',
    action: 'workspace_response_received',
    ...metadata,
  });
}

export async function trackImageAnalysis(
  imageCount: number,
  question?: string,
  page?: string,
  metadata: AnalyticsMetadata = {}
) {
  return trackEvent('image_analysis_requested', page || getCurrentPage(), {
    feature: 'FaceMeX Image Analysis',
    action: 'image_analysis_requested',
    image_count: imageCount,
    question_preview: createPreview(question || '', 160),
    question_length: safeString(question).length,
    intent: detectPromptIntent(question || ''),
    ...metadata,
  });
}

export async function trackPostAction(
  action: string,
  metadata: AnalyticsMetadata = {}
) {
  return trackEvent(action, getCurrentPage(), {
    feature: 'feed',
    action,
    ...metadata,
  });
}

export async function trackPostCreated(metadata: AnalyticsMetadata = {}) {
  return trackPostAction('post_created', metadata);
}

export async function trackPostViewed(postId: string, metadata: AnalyticsMetadata = {}) {
  return trackPostAction('post_viewed', {
    post_id: postId,
    ...metadata,
  });
}

export async function trackPostLiked(postId: string, metadata: AnalyticsMetadata = {}) {
  return trackPostAction('post_liked', {
    post_id: postId,
    ...metadata,
  });
}

export async function trackPostCommented(
  postId: string,
  commentText?: string,
  metadata: AnalyticsMetadata = {}
) {
  return trackPostAction('post_commented', {
    post_id: postId,
    comment_preview: createPreview(commentText || '', 100),
    comment_length: safeString(commentText).length,
    ...metadata,
  });
}

export async function trackPostShared(postId: string, metadata: AnalyticsMetadata = {}) {
  return trackPostAction('post_shared', {
    post_id: postId,
    ...metadata,
  });
}

export async function trackPostSaved(postId: string, metadata: AnalyticsMetadata = {}) {
  return trackPostAction('post_saved', {
    post_id: postId,
    ...metadata,
  });
}

export async function trackUpload(input: UploadTrackInput) {
  return trackEvent('media_uploaded', input.page || getCurrentPage(), {
    feature: 'upload',
    action: 'media_uploaded',
    upload_type: input.uploadType,
    upload_count: input.count || 1,
    ...input.metadata,
  });
}

export async function trackDocumentPosted(metadata: AnalyticsMetadata = {}) {
  return trackEvent('document_posted', getCurrentPage(), {
    feature: 'documents',
    action: 'document_posted',
    ...metadata,
  });
}

export async function trackCvBuilder(action = 'cv_builder_used', metadata: AnalyticsMetadata = {}) {
  return trackEvent(action, getCurrentPage(), {
    feature: 'CV Builder',
    action,
    ...metadata,
  });
}

export async function trackJobAssistant(action = 'job_assistant_used', metadata: AnalyticsMetadata = {}) {
  return trackEvent(action, getCurrentPage(), {
    feature: 'Job Assistant',
    action,
    ...metadata,
  });
}

export async function trackOpportunityCheck(metadata: AnalyticsMetadata = {}) {
  return trackEvent('opportunity_checked', getCurrentPage(), {
    feature: 'Opportunity Safety Check',
    action: 'opportunity_checked',
    ...metadata,
  });
}

export async function trackMarketplaceAction(
  action: string,
  metadata: AnalyticsMetadata = {}
) {
  return trackEvent(action, getCurrentPage(), {
    feature: 'marketplace',
    action,
    ...metadata,
  });
}

export async function trackProfileAction(
  action: string,
  metadata: AnalyticsMetadata = {}
) {
  return trackEvent(action, getCurrentPage(), {
    feature: 'profile',
    action,
    ...metadata,
  });
}

export async function trackMessageAction(
  action: string,
  metadata: AnalyticsMetadata = {}
) {
  return trackEvent(action, getCurrentPage(), {
    feature: 'messages',
    action,
    ...metadata,
  });
}

export async function trackNotificationAction(
  action: string,
  metadata: AnalyticsMetadata = {}
) {
  return trackEvent(action, getCurrentPage(), {
    feature: 'notifications',
    action,
    ...metadata,
  });
}

export async function trackError(
  errorName: string,
  errorMessage?: string,
  metadata: AnalyticsMetadata = {}
) {
  return trackEvent('client_error', getCurrentPage(), {
    feature: 'error',
    action: 'client_error',
    error_name: errorName,
    error_message: createPreview(errorMessage || '', 250),
    ...metadata,
  });
}

export async function trackTimeSpent(
  page: string,
  seconds: number,
  metadata: AnalyticsMetadata = {}
) {
  return trackEvent('time_spent', page || getCurrentPage(), {
    feature: 'engagement',
    action: 'time_spent',
    seconds,
    ...metadata,
  });
}
