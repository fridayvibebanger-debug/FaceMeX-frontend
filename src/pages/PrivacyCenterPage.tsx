import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock3,
  LockKeyhole,
  MessageCircle,
  Shield,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PrivacyCenterPage.css';

const privacyCards = [
  {
    icon: UserRound,
    title: 'You control your data',
    text: 'Review available settings, manage personalization, and export supported account and workspace data.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Clear choices, honest limits',
    text: 'We show which privacy controls are available and identify features that do not yet have account-level controls.',
  },
  {
    icon: Shield,
    title: 'Privacy is part of the design',
    text: 'FaceMeX uses account authentication and database access controls for supported services. No online service can promise absolute security.',
  },
];

const articles = [
  {
    slug: 'data-handling',
    title: 'How FaceMeX handles your data',
    category: 'Privacy guide',
    minutes: '3 min read',
    artwork: 'pc-art-data',
  },
  {
    slug: 'account-protection',
    title: 'Protecting your account',
    category: 'Account security',
    minutes: '2 min read',
    artwork: 'pc-art-account',
  },
  {
    slug: 'ai-and-privacy',
    title: 'Understanding AI and privacy',
    category: 'AI guide',
    minutes: '3 min read',
    artwork: 'pc-art-ai',
  },
];

type NavigationCardProps = {
  title: string;
  icon: typeof Clock3;
  onClick: () => void;
  last?: boolean;
};

function NavigationRow({ title, icon: Icon, onClick, last = false }: NavigationCardProps) {
  return (
    <button type="button" className={`pc-nav-row${last ? ' pc-nav-row-last' : ''}`} onClick={onClick}>
      <Icon aria-hidden="true" className="pc-nav-icon" />
      <span>{title}</span>
      <ChevronRight aria-hidden="true" className="pc-nav-chevron" />
    </button>
  );
}

export default function PrivacyCenterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;

  const close = () => {
    const validFrom = typeof from === 'string'
      && from.startsWith('/')
      && !from.startsWith('//')
      && !from.startsWith('/privacy-center')
      ? from
      : '/ai/settings';
    navigate(validFrom, { replace: true });
  };

  return (
    <main className="pc-page">
      <button type="button" className="pc-close" onClick={close} aria-label="Close Privacy Center">
        <ArrowLeft aria-hidden="true" />
      </button>

      <div className="pc-content">
        <header className="pc-hero">
          <div className="pc-hero-icon"><Shield aria-hidden="true" /></div>
          <h1>Privacy center</h1>
          <p>Clear answers about privacy. Simple ways to stay in control.</p>
        </header>

        <section className="pc-section" aria-labelledby="pc-options-heading">
          <h2 id="pc-options-heading">Explore your options</h2>
          <div className="pc-nav-card">
            <NavigationRow
              icon={Clock3}
              title="Personalized chats & ads"
              onClick={() => navigate('/privacy-center/personalized-chats-ads')}
            />
            <NavigationRow
              icon={MessageCircle}
              title="Chat privacy"
              onClick={() => navigate('/privacy-center/chat-privacy')}
            />
            <NavigationRow
              icon={LockKeyhole}
              title="Data use & access"
              last
              onClick={() => navigate('/ai/settings/data-controls')}
            />
          </div>
        </section>

        <section className="pc-section" aria-labelledby="pc-approach-heading">
          <h2 id="pc-approach-heading">Our approach to privacy</h2>
          <div className="pc-horizontal-track pc-approach-track" aria-label="Privacy principles">
            {privacyCards.map(({ icon: Icon, title, text }) => (
              <article className="pc-approach-card" key={title}>
                <Icon aria-hidden="true" className="pc-approach-icon" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="pc-divider" />

        <section className="pc-section" aria-labelledby="pc-learn-heading">
          <h2 id="pc-learn-heading">Learn and act</h2>
          <div className="pc-horizontal-track pc-article-track" aria-label="FaceMeX privacy guides">
            {articles.map((article) => (
              <button
                type="button"
                className="pc-article-card"
                key={article.slug}
                onClick={() => navigate(`/privacy-center/guides/${article.slug}`)}
              >
                <span className={`pc-article-art ${article.artwork}`} aria-hidden="true">
                  <span className="pc-art-orbit" />
                  <span className="pc-art-core"><Shield aria-hidden="true" /></span>
                </span>
                <span className="pc-article-meta">{article.category} <span>·</span> {article.minutes}</span>
                <span className="pc-article-title">{article.title}</span>
                <span className="pc-article-link">Read guide <ArrowRight aria-hidden="true" /></span>
              </button>
            ))}
          </div>
        </section>

        <div className="pc-divider" />

        <section className="pc-section pc-resources" aria-labelledby="pc-resources-heading">
          <h2 id="pc-resources-heading">Helpful resources</h2>
          <div className="pc-nav-card">
            <NavigationRow title="Privacy policy" icon={Shield} onClick={() => navigate('/privacy')} />
            <NavigationRow title="Submit a privacy request" icon={UserRound} onClick={() => navigate('/privacy-center/privacy-request')} />
            <NavigationRow title="Help Center" icon={MessageCircle} onClick={() => navigate('/privacy-center/help')} />
            <NavigationRow
              title="How model improvement works"
              icon={SlidersHorizontal}
              last
              onClick={() => navigate('/privacy-center/guides/ai-and-privacy')}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
