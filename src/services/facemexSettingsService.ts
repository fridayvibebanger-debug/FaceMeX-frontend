import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { getPersonalizationProfile, savePersonalizationProfile } from '@/lib/personalization';
import { applyAppearanceMode } from '@/lib/appearance';
import type {
  FaceMeXNotificationSettings,
  FaceMeXNotificationType,
  FaceMeXPersonalizationSettings,
  FaceMeXSettings,
} from '@/types/facemexSettings';

export const FACEMEX_SETTINGS_CHANGED_EVENT = 'facemex:settings-changed';
export const FACEMEX_SETTINGS_DEFAULTS: FaceMeXSettings = {
  version: 1,
  general: {
    appearance: 'system',
    primaryLanguage: 'en',
    accentColor: 'blue',
  },
  personalization: {
    audience: 'individual',
    name: '',
    role: '',
    goals: '',
    preferences: '',
    responseStyle: 'default',
    warmth: 'balanced',
    enthusiasm: 'balanced',
    formatting: 'standard',
    emojiUsage: 'sometimes',
  },
  notifications: {
    like: true,
    comment: true,
    follow: true,
    message: true,
    event: true,
    circle: true,
    endorsement: true,
  },
  memory: {
    enabled: false,
  },
};

const validLanguages = new Set(['en', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'sw', 'zu']);

function normalizePersonalization(value: unknown): FaceMeXPersonalizationSettings {
  const raw = value && typeof value === 'object'
    ? value as Partial<FaceMeXPersonalizationSettings>
    : {};
  return {
    audience: raw.audience === 'organization' ? 'organization' : 'individual',
    name: typeof raw.name === 'string' ? raw.name : '',
    role: typeof raw.role === 'string' ? raw.role : '',
    goals: typeof raw.goals === 'string' ? raw.goals : '',
    preferences: typeof raw.preferences === 'string' ? raw.preferences : '',
    responseStyle: raw.responseStyle === 'professional' || raw.responseStyle === 'friendly'
      || raw.responseStyle === 'concise' || raw.responseStyle === 'detailed'
      ? raw.responseStyle
      : 'default',
    warmth: raw.warmth === 'low' || raw.warmth === 'high' ? raw.warmth : 'balanced',
    enthusiasm: raw.enthusiasm === 'low' || raw.enthusiasm === 'high' ? raw.enthusiasm : 'balanced',
    formatting: raw.formatting === 'headers-and-lists' || raw.formatting === 'minimal'
      ? raw.formatting
      : 'standard',
    emojiUsage: raw.emojiUsage === 'never' || raw.emojiUsage === 'often' ? raw.emojiUsage : 'sometimes',
  };
}

function normalizeNotifications(value: unknown): FaceMeXNotificationSettings {
  const raw = value && typeof value === 'object'
    ? value as Partial<FaceMeXNotificationSettings>
    : {};
  return {
    like: raw.like !== false,
    comment: raw.comment !== false,
    follow: raw.follow !== false,
    message: raw.message !== false,
    event: raw.event !== false,
    circle: raw.circle !== false,
    endorsement: raw.endorsement !== false,
  };
}

export function normalizeFaceMeXSettings(value: unknown): FaceMeXSettings {
  const raw = value && typeof value === 'object' ? value as Partial<FaceMeXSettings> : {};
  const general = raw.general && typeof raw.general === 'object'
    ? raw.general as Partial<FaceMeXSettings['general']>
    : {};
  const appearance = general.appearance;
  const language = general.primaryLanguage;
  const memory = raw.memory && typeof raw.memory === 'object'
    ? raw.memory as Partial<FaceMeXSettings['memory']>
    : {};
  return {
    version: 1,
    general: {
      appearance: appearance === 'system' || appearance === 'light' || appearance === 'dark'
        ? appearance
        : FACEMEX_SETTINGS_DEFAULTS.general.appearance,
      primaryLanguage: typeof language === 'string' && validLanguages.has(language)
        ? language
        : FACEMEX_SETTINGS_DEFAULTS.general.primaryLanguage,
      accentColor: general.accentColor === 'violet' || general.accentColor === 'green' || general.accentColor === 'amber'
        ? general.accentColor
        : 'blue',
    },
    personalization: normalizePersonalization(raw.personalization),
    notifications: normalizeNotifications(raw.notifications),
    memory: { enabled: memory.enabled === true },
  };
}

export function validateFaceMeXSettings(value: FaceMeXSettings): void {
  const limits: Array<[string, string, number]> = [
    ['Name', value.personalization.name, 80],
    ['Role', value.personalization.role, 120],
    ['Goals', value.personalization.goals, 1000],
    ['Custom instructions', value.personalization.preferences, 2000],
  ];
  for (const [label, text, limit] of limits) {
    if (text.length > limit) throw new Error(`${label} must be ${limit} characters or fewer.`);
  }
}

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('FaceMeX settings need an active Supabase connection. Please try again later.');
  }
  return supabase;
}

async function requireSignedInUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw new Error(`Could not verify your FaceMeX account: ${error.message}`);
  if (!data.user) throw new Error('Please sign in to manage your FaceMeX settings.');
  return { client, user: data.user };
}

export function cacheFaceMeXAccountSettings(userId: string, settings: FaceMeXSettings) {
  applyAppearanceMode(settings.general.appearance);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.accent = settings.general.accentColor;
  }
  try {
    localStorage.setItem('settings:lang:primary', settings.general.primaryLanguage);
    localStorage.setItem(`facemex:settings:notifications:${userId}`, JSON.stringify(settings.notifications));
  } catch (error) {
    console.warn('FaceMeX settings cache could not be updated; cloud settings are still saved.', error);
  }
  savePersonalizationProfile(userId, settings.personalization);
  window.dispatchEvent(new CustomEvent(FACEMEX_SETTINGS_CHANGED_EVENT, { detail: { userId, settings } }));
}

function getLegacyDefaults(userId: string, userMetadata: Record<string, unknown> | null): FaceMeXSettings {
  const legacy = userMetadata?.facemex_settings;
  if (legacy && typeof legacy === 'object') {
    const oldSettings = legacy as {
      appearance?: unknown;
      primaryLanguage?: unknown;
      personalization?: unknown;
    };
    return normalizeFaceMeXSettings({
      general: {
        appearance: oldSettings.appearance,
        primaryLanguage: oldSettings.primaryLanguage,
      },
      personalization: oldSettings.personalization ?? getPersonalizationProfile(userId),
    });
  }
  const profile = getPersonalizationProfile(userId);
  return normalizeFaceMeXSettings({
    ...FACEMEX_SETTINGS_DEFAULTS,
    personalization: profile,
  });
}

export async function loadFaceMeXSettings(): Promise<FaceMeXSettings> {
  const { client, user } = await requireSignedInUser();
  const { data, error } = await client
    .from('facemex_user_settings')
    .select('settings')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load your FaceMeX settings: ${error.message}`);

  if (data?.settings) {
    const settings = normalizeFaceMeXSettings(data.settings);
    cacheFaceMeXAccountSettings(user.id, settings);
    return settings;
  }

  const settings = getLegacyDefaults(user.id, user.user_metadata as Record<string, unknown> | null);
  const { error: insertError } = await client
    .from('facemex_user_settings')
    .upsert({ user_id: user.id, settings }, { onConflict: 'user_id' });
  if (insertError) throw new Error(`Could not initialize your FaceMeX settings: ${insertError.message}`);
  cacheFaceMeXAccountSettings(user.id, settings);
  return settings;
}

export async function saveFaceMeXSettings(settingsValue: FaceMeXSettings): Promise<FaceMeXSettings> {
  const { client, user } = await requireSignedInUser();
  const settings = normalizeFaceMeXSettings(settingsValue);
  validateFaceMeXSettings(settings);
  const { error } = await client
    .from('facemex_user_settings')
    .upsert(
      { user_id: user.id, settings, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw new Error(`Could not save your FaceMeX settings: ${error.message}`);
  cacheFaceMeXAccountSettings(user.id, settings);
  return settings;
}

export function getCachedFaceMeXNotificationPreference(
  userId: string | null | undefined,
  notificationType: FaceMeXNotificationType,
): boolean {
  if (!userId) return true;
  try {
    const raw = localStorage.getItem(`facemex:settings:notifications:${userId}`);
    if (!raw) return true;
    const preferences = JSON.parse(raw) as Partial<FaceMeXNotificationSettings>;
    return preferences[notificationType] !== false;
  } catch (error) {
    console.warn('FaceMeX notification preference cache could not be read.', error);
    return true;
  }
}
