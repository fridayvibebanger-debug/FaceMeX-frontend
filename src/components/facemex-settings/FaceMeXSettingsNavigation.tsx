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
import FaceMeXSettingsRow from './FaceMeXSettingsRow';
import FaceMeXSettingsSection from './FaceMeXSettingsSection';
import type { SettingsCategory } from './types';

const groups: Array<{ title: string; items: Array<{ title: SettingsCategory; description: string; icon: LucideIcon }> }> = [
  { title: 'Your account', items: [
    { title: 'Account', description: 'Profile details and sign out', icon: UserRound },
    { title: 'Workspace', description: 'Projects and AI workspace', icon: Briefcase },
  ] },
  { title: 'Preferences', items: [
    { title: 'Personalization', description: 'Help FaceMeX tailor its responses', icon: Settings2 },
    { title: 'General', description: 'Appearance and language', icon: Palette },
  ] },
  { title: 'Controls', items: [
    { title: 'Usage and limits', description: 'Your current FaceMeX plan', icon: Gauge },
    { title: 'Notifications', description: 'Choose which activity to notify you about', icon: Bell },
    { title: 'Safety', description: 'Safety Center and trust tools', icon: ShieldCheck },
    { title: 'Security and login', description: 'Sign-in and account security', icon: LockKeyhole },
  ] },
  { title: 'Data', items: [
    { title: 'Storage', description: 'Files in your workspace', icon: HardDrive },
    { title: 'Privacy center', description: 'FaceMeX privacy information', icon: Shield },
    { title: 'History and data', description: 'Workspace conversation history', icon: History },
  ] },
];

type Props = {
  onSelect: (category: SettingsCategory) => void;
};

export default function FaceMeXSettingsNavigation({ onSelect }: Props) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <FaceMeXSettingsSection key={group.title} title={group.title}>
          {group.items.map(({ title, description, icon: Icon }) => (
            <FaceMeXSettingsRow
              key={title}
              title={title}
              description={description}
              icon={<Icon className="h-[18px] w-[18px]" />}
              onClick={() => onSelect(title)}
            />
          ))}
        </FaceMeXSettingsSection>
      ))}
    </div>
  );
}
