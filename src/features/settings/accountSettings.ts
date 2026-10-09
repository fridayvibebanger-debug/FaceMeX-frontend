import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { getPersonalizationProfile, savePersonalizationProfile, type PersonalizationProfile } from '@/lib/personalization';
import { applyAppearanceMode, getAppearanceMode, type AppearanceMode } from '@/lib/appearance';

export type AccountSettings = {
  version: 1;
  appearance: AppearanceMode;
  primaryLanguage: string;
  personalization: PersonalizationProfile;
};

export const defaultAccountSettings: AccountSettings = {
  version: 1,
  appearance: getAppearanceMode(),
  primaryLanguage: getLocalPrimaryLanguage(),
  personalization: {
    audience: 'individual',
    name: '',
    role: '',
    goals: '',
    preferences: '',
  },
};

function getLocalPrimaryLanguage() {
  try {
    return localStorage.getItem('settings:lang:primary') || 'en';
  } catch {
    return 'en';
  }
}

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('FaceMeX account settings require Supabase configuration.');
  }
  return supabase;
}

function normalizeSettings(value: unknown): AccountSettings {
  if (!value || typeof value !== 'object') return { ...defaultAccountSettings };
  const raw = value as Partial<AccountSettings>;
  const profile = raw.personalization as Partial<PersonalizationProfile> | undefined;
  return {
    version: 1,
    appearance: raw.appearance === 'light' || raw.appearance === 'dark'
      ? raw.appearance
      : defaultAccountSettings.appearance,
    primaryLanguage: typeof raw.primaryLanguage === 'string'
      ? raw.primaryLanguage
      : defaultAccountSettings.primaryLanguage,
    personalization: {
      audience: profile?.audience === 'organization' ? 'organization' : 'individual',
      name: typeof profile?.name === 'string' ? profile.name : '',
      role: typeof profile?.role === 'string' ? profile.role : '',
      goals: typeof profile?.goals === 'string' ? profile.goals : '',
      preferences: typeof profile?.preferences === 'string' ? profile.preferences : '',
    },
  };
}

async function requireCurrentUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw new Error(`Unable to load FaceMeX account settings: ${error.message}`);
  if (!data.user) throw new Error('Sign in to load account-synced settings.');
  return { client, user: data.user };
}

export async function loadAccountSettings(): Promise<AccountSettings> {
  const { user } = await requireCurrentUser();
  const metadata = user.user_metadata as Record<string, unknown> | null;
  if (!metadata?.facemex_settings) {
    return {
      ...defaultAccountSettings,
      personalization: getPersonalizationProfile(user.id),
    };
  }
  return normalizeSettings(metadata?.facemex_settings);
}

export async function saveAccountSettings(settings: AccountSettings): Promise<AccountSettings> {
  const { client, user } = await requireCurrentUser();
  const next = normalizeSettings(settings);
  const currentMetadata = (user.user_metadata || {}) as Record<string, unknown>;
  const { data, error } = await client.auth.updateUser({
    data: { ...currentMetadata, facemex_settings: next },
  });
  if (error) throw new Error(`Unable to save FaceMeX account settings: ${error.message}`);
  if (!data.user) throw new Error('Supabase did not return the updated FaceMeX account.');

  applyAccountSettingsLocally(data.user.id, next);
  return next;
}

export function applySyncedPersonalization(userId: string, profile: PersonalizationProfile) {
  savePersonalizationProfile(userId, profile);
}

export function applyAccountSettingsLocally(userId: string, settings: AccountSettings) {
  applyAppearanceMode(settings.appearance);
  try {
    localStorage.setItem('settings:lang:primary', settings.primaryLanguage);
  } catch (error) {
    console.warn('FaceMeX language preference could not be cached in this browser.', error);
  }
  applySyncedPersonalization(userId, settings.personalization);
}
