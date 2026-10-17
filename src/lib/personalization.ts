export type PersonalizationProfile = {
  audience: 'individual' | 'organization';
  name: string;
  role: string;
  goals: string;
  preferences: string;
  responseStyle?: 'default' | 'professional' | 'friendly' | 'concise' | 'detailed';
  warmth?: 'low' | 'balanced' | 'high';
  enthusiasm?: 'low' | 'balanced' | 'high';
  formatting?: 'standard' | 'headers-and-lists' | 'minimal';
  emojiUsage?: 'never' | 'sometimes' | 'often';
};

export const PERSONALIZATION_CHANGE_EVENT = 'facemex:personalization-change';

const emptyProfile: PersonalizationProfile = {
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
      responseStyle: value.responseStyle ?? 'default',
      warmth: value.warmth ?? 'balanced',
      enthusiasm: value.enthusiasm ?? 'balanced',
      formatting: value.formatting ?? 'standard',
      emojiUsage: value.emojiUsage ?? 'sometimes',
    };
  } catch {
    return { ...emptyProfile };
  }
}

export function savePersonalizationProfile(userId: string | null | undefined, profile: PersonalizationProfile) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(profile));
  } catch (error) {
    console.warn('FaceMeX personalization could not be cached in this browser.', error);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PERSONALIZATION_CHANGE_EVENT, { detail: { userId, profile } }));
  }
}

export function buildPersonalizationContext(profile: PersonalizationProfile) {
  const responseGuidance = [
    profile.responseStyle && profile.responseStyle !== 'default' && `Base response style: ${profile.responseStyle}.`,
    profile.warmth && `Warmth: ${profile.warmth}.`,
    profile.enthusiasm && `Enthusiasm: ${profile.enthusiasm}.`,
    profile.formatting && `Formatting: ${profile.formatting === 'headers-and-lists' ? 'use helpful headers and lists' : profile.formatting}.`,
    profile.emojiUsage && `Emoji usage: ${profile.emojiUsage}.`,
  ].filter(Boolean);
  const details = [
    `Context type: ${profile.audience === 'organization' ? 'organization or company' : 'individual'}`,
    profile.name && `Name: ${profile.name}`,
    profile.role && `Role: ${profile.role}`,
    profile.goals && `Goals: ${profile.goals}`,
    profile.preferences && `Response preferences: ${profile.preferences}`,
  ].filter(Boolean);

  if (responseGuidance.length) details.push(...responseGuidance);
  return details.length > 1 ? `Personalization profile (use when relevant):\n${details.join('\n')}` : '';
}