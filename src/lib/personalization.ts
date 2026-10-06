export type PersonalizationProfile = {
  audience: 'individual' | 'organization';
  name: string;
  role: string;
  goals: string;
  preferences: string;
};

export const PERSONALIZATION_CHANGE_EVENT = 'facemex:personalization-change';

const emptyProfile: PersonalizationProfile = {
  audience: 'individual',
  name: '',
  role: '',
  goals: '',
  preferences: '',
};

function storageKey(userId?: string | null) {
  return `facemex:personalization:${userId || 'local'}`;
}

export function getPersonalizationProfile(userId?: string | null): PersonalizationProfile {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...emptyProfile };
    const value = JSON.parse(raw) as Partial<PersonalizationProfile>;
    return {
      audience: value.audience === 'organization' ? 'organization' : 'individual',
      name: typeof value.name === 'string' ? value.name : '',
      role: typeof value.role === 'string' ? value.role : '',
      goals: typeof value.goals === 'string' ? value.goals : '',
      preferences: typeof value.preferences === 'string' ? value.preferences : '',
    };
  } catch {
    return { ...emptyProfile };
  }
}

export function savePersonalizationProfile(userId: string | null | undefined, profile: PersonalizationProfile) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(profile));
  } catch {
    // The current session can still use the in-memory profile.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PERSONALIZATION_CHANGE_EVENT, { detail: { userId, profile } }));
  }
}

export function buildPersonalizationContext(profile: PersonalizationProfile) {
  const details = [
    `Context type: ${profile.audience === 'organization' ? 'organization or company' : 'individual'}`,
    profile.name && `Name: ${profile.name}`,
    profile.role && `Role: ${profile.role}`,
    profile.goals && `Goals: ${profile.goals}`,
    profile.preferences && `Response preferences: ${profile.preferences}`,
  ].filter(Boolean);

  return details.length > 1 ? `Personalization profile (use when relevant):\n${details.join('\n')}` : '';
}