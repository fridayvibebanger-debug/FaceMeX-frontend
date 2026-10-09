import {
  Bell,
  Briefcase,
  Gauge,
  HardDrive,
  History,
  LockKeyhole,
  Palette,
  Settings2,
  Shield,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type SettingsCategory =
  | 'Account'
  | 'Workspace'
  | 'Personalization'
  | 'General'
  | 'Usage and limits'
  | 'Notifications'
  | 'Safety'
  | 'Security and login'
  | 'Storage'
  | 'Privacy center'
  | 'History and data';

export type SettingsCategoryItem = {
  title: SettingsCategory;
  description: string;
  icon: LucideIcon;
};

export const settingsCategoryGroups: Array<{ heading: string; categories: SettingsCategoryItem[] }> = [
  {
    heading: 'Your account',
    categories: [
      { title: 'Account', description: 'Profile details and sign out', icon: UserRound },
      { title: 'Workspace', description: 'Projects and AI workspace', icon: Briefcase },
    ],
  },
  {
    heading: 'Preferences',
    categories: [
      { title: 'Personalization', description: 'Help FaceMeX tailor its responses', icon: Settings2 },
      { title: 'General', description: 'Appearance and language', icon: Palette },
    ],
  },
  {
    heading: 'Controls',
    categories: [
      { title: 'Usage and limits', description: 'Your current FaceMeX plan', icon: Gauge },
      { title: 'Notifications', description: 'View FaceMeX notifications', icon: Bell },
      { title: 'Safety', description: 'Safety Center and trust tools', icon: ShieldCheck },
      { title: 'Security and login', description: 'Sign-in and account security', icon: LockKeyhole },
    ],
  },
  {
    heading: 'Data',
    categories: [
      { title: 'Storage', description: 'Files in your workspace', icon: HardDrive },
      { title: 'Privacy center', description: 'FaceMeX privacy information', icon: Shield },
      { title: 'History and data', description: 'Workspace conversation history', icon: History },
    ],
  },
];
