export type AppearanceMode = 'light' | 'dark';
export type AppearancePreference = AppearanceMode | 'system';

export const APPEARANCE_CHANGE_EVENT = 'facemex:appearance-change';

const APPEARANCE_STORAGE_KEY = 'facemex:appearance-preference';
const LEGACY_APPEARANCE_STORAGE_KEY = 'facemex:appearance-mode';
let systemPreferenceListenerInitialized = false;

function getSystemAppearanceMode(): AppearanceMode {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function getAppearancePreference(): AppearancePreference {
  try {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored === 'system' || stored === 'light' || stored === 'dark') return stored;

    const legacyStored = localStorage.getItem(LEGACY_APPEARANCE_STORAGE_KEY) || localStorage.getItem('theme');
    if (legacyStored === 'light' || legacyStored === 'dark') return legacyStored;
  } catch {
    return 'system';
  }
  return 'system';
}

export function getAppearanceMode(): AppearanceMode {
  const preference = getAppearancePreference();
  return preference === 'system' ? getSystemAppearanceMode() : preference;
}

function applyResolvedAppearance(mode: AppearanceMode) {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.documentElement.dataset.appearance = mode;
  document.documentElement.style.colorScheme = mode;
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute('content', mode === 'dark' ? '#0d0d0d' : '#ffffff');
  window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGE_EVENT, { detail: mode }));
}

export function applyAppearanceMode(preference: AppearancePreference) {
  const mode = preference === 'system' ? getSystemAppearanceMode() : preference;
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, preference);
    if (preference !== 'system') {
      localStorage.setItem(LEGACY_APPEARANCE_STORAGE_KEY, preference);
      localStorage.setItem('theme', preference);
    } else {
      localStorage.removeItem(LEGACY_APPEARANCE_STORAGE_KEY);
      localStorage.removeItem('theme');
    }
  } catch {
    // The current view still updates if storage is unavailable.
  }

  applyResolvedAppearance(mode);

  if (!systemPreferenceListenerInitialized && typeof window !== 'undefined' && window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
      if (getAppearancePreference() === 'system') applyResolvedAppearance(getSystemAppearanceMode());
    });
    systemPreferenceListenerInitialized = true;
  }
}