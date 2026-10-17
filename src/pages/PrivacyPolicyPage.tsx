import { ArrowLeft, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import './PrivacyPolicyPage.css';

const sections = [
  {
    title: 'Information FaceMeX processes',
    paragraphs: [
      'FaceMeX processes information needed to provide the features you use. This can include account identifiers and profile information, content you submit or share, messages, media, and settings associated with your account.',
      'When workspace sync is configured, projects, conversations, messages, and documents may be stored in FaceMeX workspace services. Social posts, messages, and other product features may use separate services and are not all included in the workspace export.',
    ],
  },
  {
    title: 'How information is used',
    paragraphs: [
      'Information is used to operate the requested FaceMeX features, maintain account and workspace settings, deliver communications or social features you use, and protect the service from abuse where those protections apply.',
      'Personalization preferences are stored with your FaceMeX settings. Supported AI workspace requests may include the prompt and saved personalization context so the selected AI feature can respond.',
    ],
  },
  {
    title: 'AI providers',
    paragraphs: [
      'AI features may send the information required for a request to third-party AI providers configured for that feature. The specific provider and its processing or retention terms can vary by feature and configuration.',
      'FaceMeX does not currently offer an account-level, backend-enforced preference for using chats to improve models. Do not include sensitive information in an AI prompt unless it is necessary for your request.',
    ],
  },
  {
    title: 'Storage, access, and security',
    paragraphs: [
      'FaceMeX uses its configured authentication and database services. For supported Supabase-backed settings and workspace records, database access policies are used to scope access to authenticated account data.',
      'No internet service can guarantee absolute security. Keep your sign-in credentials private and use a device you trust when accessing FaceMeX.',
    ],
  },
  {
    title: 'Your available choices',
    paragraphs: [
      'You can review and update profile and personalization settings, manage available notification preferences, and request a JSON export of the profile, settings, and workspace records currently supported by Data Controls.',
      'That export does not currently include all social-feed activity or information held by third-party services. FaceMeX does not currently provide self-service account deletion, an in-app privacy-request submission endpoint, or account-wide model-improvement and audio-retention controls.',
    ],
  },
  {
    title: 'Location and audio',
    paragraphs: [
      'The Privacy Center can display browser location-permission status without requesting coordinates. FaceMeX does not currently use device location in a location-aware feature through that page.',
      'Microphone access is requested by individual features when you choose to use them and your browser permits it. FaceMeX does not currently provide a single account-wide audio-recording retention preference.',
    ],
  },
  {
    title: 'Retention and requests',
    paragraphs: [
      'Retention depends on the feature, storage service, and applicable provider configuration. FaceMeX does not state a single retention period for every category of data on this page.',
      'A supported export is available in Data Controls. Secure self-service deletion and privacy-request submission are not currently implemented. Do not treat opening a guide or downloading an export as submitting a deletion or legal request.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="privacy-policy-page">
      <Navbar />
      <main className="privacy-policy-main">
        <button type="button" className="privacy-policy-back" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft aria-hidden="true" />
          <span>Back</span>
        </button>

        <header className="privacy-policy-hero">
          <span className="privacy-policy-icon"><Shield aria-hidden="true" /></span>
          <p className="privacy-policy-eyebrow">FaceMeX · Privacy</p>
          <h1>Privacy Policy</h1>
          <p className="privacy-policy-summary">
            How FaceMeX handles information when you use the service, and which privacy choices are currently available.
          </p>
          <p className="privacy-policy-updated">Last updated: October 11, 2026</p>
        </header>

        <nav className="privacy-policy-contents" aria-label="Policy sections">
          <h2>On this page</h2>
          <div>
            {sections.map((section, index) => (
              <a key={section.title} href={`#privacy-section-${index + 1}`}>{section.title}</a>
            ))}
          </div>
        </nav>

        <div className="privacy-policy-sections">
          {sections.map((section, index) => (
            <section id={`privacy-section-${index + 1}`} key={section.title}>
              <span className="privacy-policy-section-number">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <footer className="privacy-policy-footer">
          <p>This page describes current application behavior and available controls; it is not a statement that unavailable controls or request processes exist.</p>
          <Link to="/privacy-center">Visit the Privacy Center</Link>
        </footer>
      </main>
    </div>
  );
}
