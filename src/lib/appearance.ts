export type AppearanceMode = 'light' | 'dark';
export type AppearancePreference = AppearanceMode | 'system';

export const APPEARANCE_CHANGE_EVENT = 'facemex:appearance-change';

const APPEARANCE_STORAGE_KEY = 'facemex:appearance-preference';
const LEGACY_APPEARANCE_STORAGE_KEY = 'facemex:appearance-mode';

export function getAppearancePreference(): AppearancePreference {
  return 'dark';
}

export function getAppearanceMode(): AppearanceMode {
  return 'dark';
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

export function applyAppearanceMode(_preference: AppearancePreference) {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'dark');
    localStorage.setItem(LEGACY_APPEARANCE_STORAGE_KEY, 'dark');
    localStorage.setItem('theme', 'dark');
  } catch {
    // The current view still updates if storage is unavailable.
  }

  applyResolvedAppearance('dark');
}