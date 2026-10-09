import type { FaceMeXSettings } from '@/types/facemexSettings';

export type FaceMeXSettingsCategoryProps = {
  settings: FaceMeXSettings;
  onSave: (settings: FaceMeXSettings) => Promise<boolean>;
  saving: boolean;
  saved: boolean;
  user: { name?: string; email?: string } | null;
  plan: string;
  onSignOut: () => void;
};
