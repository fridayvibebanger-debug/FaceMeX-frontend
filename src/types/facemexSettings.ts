import type { AppearancePreference } from '@/lib/appearance';

export const FACEMEX_NOTIFICATION_TYPES = [
  'like',
  'comment',
  'follow',
  'message',
  'event',
  'circle',
  'endorsement',
] as const;

export type FaceMeXNotificationType = (typeof FACEMEX_NOTIFICATION_TYPES)[number];

export type FaceMeXPersonalizationSettings = {
  audience: 'individual' | 'organization';
  name: string;
  role: string;
  goals: string;
  preferences: string;
  responseStyle: 'default' | 'professional' | 'friendly' | 'concise' | 'detailed';
  warmth: 'low' | 'balanced' | 'high';
  enthusiasm: 'low' | 'balanced' | 'high';
  formatting: 'standard' | 'headers-and-lists' | 'minimal';
  emojiUsage: 'never' | 'sometimes' | 'often';
};

export type FaceMeXNotificationSettings = Record<FaceMeXNotificationType, boolean>;

export type FaceMeXSettings = {
  version: 1;
  general: {
    appearance: AppearancePreference;
    primaryLanguage: string;
    accentColor: 'blue' | 'violet' | 'green' | 'amber';
  };
  personalization: FaceMeXPersonalizationSettings;
  notifications: FaceMeXNotificationSettings;
  memory: {
    enabled: boolean;
  };
};
