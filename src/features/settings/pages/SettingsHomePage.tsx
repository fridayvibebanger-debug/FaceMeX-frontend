import {
  ArrowLeft,
  Bell,
  Brain,
  BriefcaseBusiness,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Database,
  LockKeyhole,
  Mic,
  Palette,
  Settings2,
  Shield,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './SettingsHomePage.css';

type SettingsItem = {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
};

const groups: Array<{ title: string; items: SettingsItem[] }> = [
  {
    title: 'Account',
    items: [
      { title: 'Account', description: 'Email, plan, and sign-out', to: '/ai/settings/account', icon: UserRound },
      { title: 'Subscription and billing', description: 'Manage FaceMeX Plus and plans', to: '/facemex-plus', icon: CreditCard },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { title: 'Personalization', description: 'Set response style and instructions', to: '/ai/settings/personalization', icon: Settings2 },
      { title: 'General', description: 'Appearance and language', to: '/ai/settings/general', icon: Palette },
      { title: 'Notifications', description: 'Choose which activity to hear about', to: '/ai/settings/notifications', icon: Bell },
      { title: 'Memory', description: 'Manage saved memory preferences', to: '/ai/settings/memory', icon: Brain },
      { title: 'Voice', description: 'Voice input and speech options', to: '/ai/settings/voice', icon: Mic },
    ],
  },
  {
    title: 'Privacy and security',
    items: [
      { title: 'Privacy center', description: 'Understand available privacy choices', to: '/privacy-center', icon: Shield },
      { title: 'Chat privacy', description: 'Learn about saved conversations', to: '/privacy-center/chat-privacy', icon: LockKeyhole },
      { title: 'Data controls', description: 'Export supported account data', to: '/ai/settings/data-controls', icon: Database },
      { title: 'Security and login', description: 'Manage sign-in and account access', to: '/ai/settings/security-and-login', icon: ShieldCheck },
      { title: 'Personalized chats & ads', description: 'Review supported personalization settings', to: '/privacy-center/personalized-chats-ads', icon: Settings2 },
    ],
  },
  {
    title: 'Workspace and support',
    items: [
      { title: 'Workspace', description: 'Projects and AI workspace options', to: '/ai/settings/workspace', icon: BriefcaseBusiness },
      { title: 'Usage and limits', description: 'Review your current plan limits', to: '/ai/settings/usage-and-limits', icon: CreditCard },
      { title: 'Storage', description: 'Manage workspace files', to: '/ai/settings/storage', icon: Database },
      { title: 'Help and support', description: 'Account, privacy, and AI guidance', to: '/privacy-center/help', icon: CircleHelp },
    ],
  },
];

function getReturnPath(from: unknown) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/ai/settings')
    ? from
    : '/ai/job-assistant';
}

export default function SettingsHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;

  return (
    <main className="settings-home">
      <div className="settings-home-content">
        <header className="settings-home-header">
          <button
            type="button"
            className="settings-home-back"
            aria-label="Back to previous page"
            onClick={() => navigate(getReturnPath(from), { replace: true })}
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <h1>Settings</h1>
          <span className="settings-home-header-spacer" aria-hidden="true" />
        </header>

        <p className="settings-home-intro">Manage your FaceMeX account, preferences, privacy, and workspace.</p>

        <div className="settings-home-groups">
          {groups.map((group) => (
            <section className="settings-home-group" key={group.title} aria-labelledby={`settings-group-${group.title.replace(/ /g, '-')}`}>
              <h2 id={`settings-group-${group.title.replace(/ /g, '-')}`}>{group.title}</h2>
              <div className="settings-home-card">
                {group.items.map(({ title, description, to, icon: Icon }, index) => (
                  <Link
                    className={`settings-home-row${index === group.items.length - 1 ? ' settings-home-row-last' : ''}`}
                    key={to}
                    to={to}
                    state={{ from: location.pathname }}
                  >
                    <Icon className="settings-home-icon" aria-hidden="true" />
                    <span className="settings-home-row-copy">
                      <span className="settings-home-row-title">{title}</span>
                      <span className="settings-home-row-description">{description}</span>
                    </span>
                    <ChevronRight className="settings-home-chevron" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
