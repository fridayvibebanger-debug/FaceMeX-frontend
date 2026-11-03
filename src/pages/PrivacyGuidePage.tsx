import { ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FaceMeXSettingsPageShell from '@/components/facemex-settings/FaceMeXSettingsPageShell';
import './PrivacyCenterPage.css';

type Guide = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; text: string }>;
  links: Array<{ label: string; to: string }>;
};

const guides: Record<string, Guide> = {
  'data-handling': {
    eyebrow: 'Privacy guide',
    title: 'How FaceMeX handles your data',
    intro: 'A practical overview of the account, settings, and workspace information used by FaceMeX features.',
    sections: [
      {
        title: 'Account and preferences',
        text: 'Your settings and personalization preferences are associated with your FaceMeX account and protected by account access controls.',
      },
      {
        title: 'Workspace content',
        text: 'When workspace sync is available, saved projects, conversations, messages, and documents can be included in a Data Controls export. The export does not include social-feed activity or information held by other services.',
      },
      {
        title: 'Choices and current limits',
        text: 'You can manage supported profile, notification, and personalization preferences. FaceMeX does not currently offer self-service account deletion or a complete export of every social feature.',
      },
    ],
    links: [{ label: 'Open Data Controls', to: '/ai/settings/data-controls' }, { label: 'Read the Privacy Policy', to: '/privacy' }],
  },
  'account-protection': {
    eyebrow: 'Account security',
    title: 'Protecting your account',
    intro: 'A few practical steps can help protect access to your FaceMeX account.',
    sections: [
      {
        title: 'Keep your sign-in details private',
        text: 'Use a unique password for your account. Do not share passwords, one-time codes, or sign-in links.',
      },
      {
        title: 'Check your account details',
        text: 'Visit Account settings to see the email associated with the signed-in account. If you see activity you do not recognize, secure the email account used to sign in and contact FaceMeX through an official support channel available to you.',
      },
      {
        title: 'Understand current security controls',
        text: 'FaceMeX uses account sign-in and access controls to help protect your information. An active-session dashboard and self-service account deletion are not currently available. No control can guarantee absolute security.',
      },
    ],
    links: [{ label: 'Account settings', to: '/ai/settings/account' }, { label: 'Security and login settings', to: '/ai/settings/security-and-login' }],
  },
  'ai-and-privacy': {
    eyebrow: 'AI guide',
    title: 'Understanding AI and privacy',
    intro: 'FaceMeX AI features process information needed to respond to the request you make.',
    sections: [
      {
        title: 'What an AI request can include',
        text: 'A supported AI workspace request can include your prompt and saved personalization context. Other tools may send additional task-specific content. Avoid including sensitive information unless it is needed for the task.',
      },
      {
        title: 'Provider processing',
        text: 'Some AI features may send your request to an external AI service. The services involved can vary by feature, so review their privacy information when deciding what to share.',
      },
      {
        title: 'Model improvement',
        text: 'FaceMeX does not currently offer an account-level setting for whether chats are used to improve AI models. Data practices may vary between external AI services.',
      },
      {
        title: 'Personalization controls',
        text: 'Response style, formatting, emoji use, and custom instructions can be managed in Personalization. Supported workspace requests may use those preferences as context.',
      },
    ],
    links: [{ label: 'Manage personalization', to: '/ai/settings/personalization' }, { label: 'Read the Privacy Policy', to: '/privacy' }, { label: 'Data Controls', to: '/ai/settings/data-controls' }],
  },
};

export default function PrivacyGuidePage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? guides[slug] : undefined;

  return (
    <FaceMeXSettingsPageShell title={guide?.eyebrow || 'Privacy guide'} onBack={() => navigate('/privacy-center')}>
      {guide ? (
        <article className="pc-detail-content">
          <header className="privacy-guide-hero">
            <span className="privacy-guide-icon"><Shield aria-hidden="true" /></span>
            <p className="privacy-guide-eyebrow">{guide.eyebrow}</p>
            <h2>{guide.title}</h2>
            <p className="privacy-guide-intro">{guide.intro}</p>
          </header>
          {guide.sections.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.text}</p>
            </section>
          ))}
          <nav className="privacy-guide-links" aria-label="Related settings and policy">
            {guide.links.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </article>
      ) : (
        <section className="pc-detail-content">
          <h2>Guide not found</h2>
          <p>This FaceMeX guide is not available.</p>
          <Link to="/privacy-center">Return to Privacy Center</Link>
        </section>
      )}
    </FaceMeXSettingsPageShell>
  );
}
