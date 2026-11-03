import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import FaceMeXSettingsPageShell from '@/components/facemex-settings/FaceMeXSettingsPageShell';
import './PrivacyCenterPage.css';

type Detail = {
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
  links?: Array<{ label: string; to: string }>;
};

const details: Record<string, Detail> = {
  'chat-privacy': {
    title: 'Chat privacy',
    intro: 'Learn how saved FaceMeX workspace chats are handled and which controls are available.',
    sections: [
      { title: 'Saved workspace chats', body: 'Saved conversations are associated with your FaceMeX account. Chats that have not synced may remain in your browser.' },
      { title: 'Retention and providers', body: 'How long information is kept can vary by feature. If an AI request is handled by an external provider, removing it from FaceMeX may not remove copies already processed by that provider.' },
      { title: 'Available actions', body: 'You can export saved workspace conversations through Data Controls. Individual synced AI conversations cannot currently be deleted from this page.' },
    ],
    links: [{ label: 'Open AI workspace', to: '/ai/job-assistant' }, { label: 'Export available data', to: '/ai/settings/data-controls' }],
  },
  'personalized-chats-ads': {
    title: 'Personalized chats & ads',
    intro: 'Choose how FaceMeX responds to you. An account-level advertising personalization setting is not currently available.',
    sections: [
      { title: 'Personalized chats', body: 'You can choose response style, formatting, emoji use, and custom instructions in Personalization settings.' },
      { title: 'Advertising preferences', body: 'FaceMeX does not currently offer an account-level setting for personalized advertising.' },
    ],
    links: [{ label: 'Manage chat personalization', to: '/ai/settings/personalization' }, { label: 'Privacy policy', to: '/privacy' }],
  },
  'privacy-request': {
    title: 'Submit a privacy request',
    intro: 'A privacy request form is not currently available in FaceMeX.',
    sections: [
      { title: 'Export supported data', body: 'You can download the profile, settings, and supported workspace records currently available to your signed-in account from Data Controls.' },
      { title: 'Other requests', body: 'The current Privacy Policy does not publish a dedicated privacy-request form or contact address. We cannot confirm receipt or completion of an access, correction, or deletion request through this page. Please use an official FaceMeX support channel if one has been provided to you.' },
    ],
    links: [{ label: 'Open Data Controls', to: '/ai/settings/data-controls' }, { label: 'Read Privacy Policy', to: '/privacy' }],
  },
  help: {
    title: 'FaceMeX Help Center',
    intro: 'Quick guidance for account, privacy, and AI workspace settings.',
    sections: [
      { title: 'Account and sign-in', body: 'Review your signed-in email and sign out from Account settings. Keep your password and sign-in codes private.' },
      { title: 'AI workspace', body: 'Use the workspace for AI assistance and review your saved personalization preferences. Some AI features may use external AI services to respond.' },
      { title: 'Data and privacy', body: 'Use Data Controls to export available account and workspace data. Model-improvement preferences, account deletion, and complete social-data export are not currently available as self-service controls.' },
    ],
    links: [{ label: 'Account settings', to: '/ai/settings/account' }, { label: 'Data Controls', to: '/ai/settings/data-controls' }, { label: 'AI workspace', to: '/ai/job-assistant' }],
  },
};

function getSafeReturn(from: unknown, currentPath: string) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && from !== currentPath
    ? from
    : '/privacy-center';
}

export default function PrivacyCenterDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { section } = useParams<{ section?: string }>();
  const detail = details[section || ''];

  if (!detail) {
    return (
      <FaceMeXSettingsPageShell title="Privacy center" onBack={() => navigate('/privacy-center', { replace: true })}>
        <section className="pc-detail-content">
          <h2>Page not found</h2>
          <p>This Privacy Center page is not available.</p>
          <Link to="/privacy-center">Return to Privacy Center</Link>
        </section>
      </FaceMeXSettingsPageShell>
    );
  }

  return (
    <FaceMeXSettingsPageShell
      title={detail.title}
      onBack={() => navigate(getSafeReturn((location.state as { from?: unknown } | null)?.from, location.pathname))}
    >
      <article className="pc-detail-content">
        <p className="pc-detail-intro">{detail.intro}</p>
        {detail.sections.map((item) => (
          <section key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </section>
        ))}
        {detail.links && (
          <nav className="pc-detail-links" aria-label="Related pages">
            {detail.links.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
                <ExternalLink aria-hidden="true" />
              </Link>
            ))}
          </nav>
        )}
        <button type="button" className="pc-detail-back" onClick={() => navigate('/privacy-center')}>
          <ArrowLeft aria-hidden="true" />
          Privacy Center
        </button>
      </article>
    </FaceMeXSettingsPageShell>
  );
}
