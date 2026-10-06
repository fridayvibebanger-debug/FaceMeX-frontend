export type AppearanceMode = 'light' | 'dark';

export const APPEARANCE_CHANGE_EVENT = 'facemex:appearance-change';

const APPEARANCE_STORAGE_KEY = 'facemex:appearance-mode';

export function getAppearanceMode(): AppearanceMode {
  try {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Use the platform default when storage is unavailable.
  }

  return typeof window !== 'undefined' && window.innerWidth < 768 ? 'dark' : 'light';
}

export function applyAppearanceMode(mode: AppearanceMode) {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.documentElement.dataset.appearance = mode;

  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
  } catch {
    // The current view still updates if storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGE_EVENT, { detail: mode }));
}