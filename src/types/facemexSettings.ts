import type { AppearanceMode } from '@/lib/appearance';

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
};

export type FaceMeXNotificationSettings = Record<FaceMeXNotificationType, boolean>;

export type FaceMeXSettings = {
  version: 1;
  general: {
    appearance: AppearanceMode;
    primaryLanguage: string;
  };
  personalization: FaceMeXPersonalizationSettings;
  notifications: FaceMeXNotificationSettings;
};
