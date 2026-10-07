import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, FileText, Lightbulb, Sparkles } from 'lucide-react';
import { getSeoArticle, getSeoPage, SEO_SITE_ORIGIN, seoArticles } from '@/lib/seo';
import { getAnalyticsConsent, isAnalyticsConfigured, setAnalyticsConsent } from '@/lib/analytics';
import { useState } from 'react';

const iconByTopic = [BookOpen, Lightbulb, FileText, BriefcaseBusiness];

function StructuredData({ id, data }: { id: string; data: Record<string, unknown> }) {
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

function HomeSchema() {
  return (
    <StructuredData
      id="facemex-home-schema"
      data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${SEO_SITE_ORIGIN}/#organization`,
            name: 'FaceMeX',
            url: `${SEO_SITE_ORIGIN}/`,
            logo: {
              '@type': 'ImageObject',
              url: `${SEO_SITE_ORIGIN}/facemex-icon-512.png`,
            },
            description: 'An AI workspace with tools for learning, job discovery and career preparation.',
          },
          {
            '@type': 'WebSite',
            '@id': `${SEO_SITE_ORIGIN}/#website`,
            name: 'FaceMeX',
            url: `${SEO_SITE_ORIGIN}/`,
            description: 'An AI workspace with tools for learning, job discovery and career preparation.',
            publisher: { '@id': `${SEO_SITE_ORIGIN}/#organization` },
          },
        ],
      }}
    />
  );
}

function BreadcrumbSchema({ title, path }: { title: string; path: string }) {
  return (
    <StructuredData
      id={`facemex-breadcrumb-${path.replace(/[^a-z0-9]+/gi, '-')}`}
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SEO_SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: title, item: `${SEO_SITE_ORIGIN}${path}` },
        ],
      }}
    />
  );
}

function FaqSchema({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  return (
    <StructuredData
      id="facemex-faq-schema"
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      }}
    />
  );
}

function SeoSiteFrame({ children }: { children: ReactNode }) {
  const [analyticsConsent, setConsentState] = useState(getAnalyticsConsent);
  const chooseAnalyticsConsent = (consent: 'granted' | 'denied') => {
    setAnalyticsConsent(consent);
    setConsentState(consent);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-white p-3 text-slate-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="FaceMeX home" className="inline-flex shrink-0 items-center gap-2 font-semibold tracking-tight">
            <img src="/facemex-icon-64.png" alt="" width="32" height="32" className="h-8 w-8 rounded-lg" />
            <span>FaceMeX</span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-3 text-sm sm:gap-5">
            <Link to="/ai-for-students" className="hidden text-slate-600 hover:text-slate-950 sm:inline">For students</Link>
            <Link to="/ai-career-assistant" className="hidden text-slate-600 hover:text-slate-950 sm:inline">Careers</Link>
            <Link to="/resources" className="hidden text-slate-600 hover:text-slate-950 sm:inline">Resources</Link>
            <Link to="/login" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">Sign in</Link>
            <Link to="/signup" className="rounded-lg bg-slate-900 px-3 py-2 font-medium text-white hover:bg-slate-700">Create account</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>FaceMeX — AI support for learning and career preparation.</p>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
              <Link to="/about" className="hover:text-slate-950">About</Link>
              <Link to="/resources" className="hover:text-slate-950">Resources</Link>
            </nav>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-5">
              {isAnalyticsConfigured()
                ? 'Optional Google Analytics is off unless you choose to allow it. No prompt text or personal identifiers are sent as analytics events.'
                : 'Google Analytics is not configured. No Google Analytics events are sent.'}
            </p>
            {isAnalyticsConfigured() && (
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => chooseAnalyticsConsent('granted')}
                  aria-pressed={analyticsConsent === 'granted'}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  Allow optional analytics
                </button>
                <button
                  type="button"
                  onClick={() => chooseAnalyticsConsent('denied')}
                  aria-pressed={analyticsConsent === 'denied'}
                  className="min-h-10 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  Keep analytics off
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function PageCta({ label }: { label: string }) {
  return (
    <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link to="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2">
        {label}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <Link to="/resources" className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
        Read practical guides
      </Link>
    </div>
  );
}

function FaqSection({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-14 border-t border-slate-200 pt-10">
      <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
      <div className="mt-5 divide-y divide-slate-200">
        {faqs.map((faq) => (
          <details key={faq.question} className="group py-4">
            <summary className="cursor-pointer list-none pr-6 font-medium text-slate-900 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
              {faq.question}
            </summary>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function SeoArticleSchema({ article, path }: { article: NonNullable<ReturnType<typeof getSeoArticle>>; path: string }) {
  return (
    <StructuredData
      id={`facemex-article-${article.slug}`}
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.heading,
        description: article.description,
        dateModified: article.updated,
        author: { '@type': 'Organization', name: 'FaceMeX', url: `${SEO_SITE_ORIGIN}/about` },
        publisher: {
          '@type': 'Organization',
          name: 'FaceMeX',
          url: `${SEO_SITE_ORIGIN}/`,
          logo: { '@type': 'ImageObject', url: `${SEO_SITE_ORIGIN}/facemex-icon-512.png` },
        },
        mainEntityOfPage: `${SEO_SITE_ORIGIN}${path}`,
      }}
    />
  );
}

function ResourceHub() {
  return (
    <SeoSiteFrame>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <BreadcrumbSchema title="Resources" path="/resources" />
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">FaceMeX resources</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Practical guides for learning and career preparation</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Clear, actionable guides on study habits, responsible AI use, CV preparation, interviews, career exploration and job searching. Use them alongside trusted course and employer information.</p>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seoArticles.map((article, index) => {
            const Icon = iconByTopic[index % iconByTopic.length];
            return (
              <Link key={article.slug} to={`/resources/${article.slug}`} className="group rounded-2xl border border-slate-200 p-5 transition hover:border-slate-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
                <Icon className="h-5 w-5 text-slate-500" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold leading-snug group-hover:underline">{article.heading}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{article.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-800">Read guide <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </Link>
            );
          })}
        </div>
      </main>
    </SeoSiteFrame>
  );
}

function ArticlePage({ path }: { path: string }) {
  const article = getSeoArticle(path);
  if (!article) return <NotFoundPage />;

  return (
    <SeoSiteFrame>
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <BreadcrumbSchema title={article.heading} path={path} />
        <SeoArticleSchema article={article} path={path} />
        <article>
          <Link to="/resources" className="text-sm font-medium text-slate-600 hover:text-slate-950">← All resources</Link>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{article.heading}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{article.introduction}</p>
          <p className="mt-4 text-xs text-slate-500">Updated <time dateTime={article.updated}>{article.updated}</time> · FaceMeX</p>
          <div className="mt-9 space-y-8">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold tracking-tight">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-base leading-7 text-slate-700">{paragraph}</p>)}
                {section.bullets && (
                  <ul className="mt-3 list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6" aria-labelledby="related-heading">
            <h2 id="related-heading" className="text-lg font-semibold">Explore related FaceMeX tools</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
              {article.related.map((item) => <li key={item.href}><Link className="underline underline-offset-4 hover:text-slate-600" to={item.href}>{item.label}</Link></li>)}
            </ul>
          </section>
          <PageCta label="Try FaceMeX AI" />
        </article>
      </main>
    </SeoSiteFrame>
  );
}

function NotFoundPage() {
  return (
    <SeoSiteFrame>
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">404 · Not found</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">We couldn’t find that page</h1>
        <p className="mt-4 text-slate-600">The address may be incorrect or the page may have moved. Browse the learning and career guides or return to FaceMeX home.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">FaceMeX home</Link>
          <Link to="/resources" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100">Browse resources</Link>
        </div>
      </main>
    </SeoSiteFrame>
  );
}

export default function PublicSeoPage() {
  const { pathname } = useLocation();
  const page = getSeoPage(pathname);

  if (pathname === '/resources') return <ResourceHub />;
  if (pathname.startsWith('/resources/')) return <ArticlePage path={pathname} />;
  if (!page) return <NotFoundPage />;

  const isHome = page.path === '/';
  const faqs = page.faqs || [];

  return (
    <SeoSiteFrame>
      <main id="main-content">
        {isHome ? (
          <section className="border-b border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
              <div className="max-w-3xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Learning and career workspace</p>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{page.heading}</h1>
                <p className="mt-5 text-lg leading-8 text-slate-600">{page.introduction}</p>
                <PageCta label="Try FaceMeX AI" />
              </div>
            </div>
          </section>
        ) : null}
        <div className={`mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${isHome ? '' : ''}`}>
          {!isHome && (
            <>
              <BreadcrumbSchema title={page.heading} path={page.path} />
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">FaceMeX guide</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{page.heading}</h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">{page.introduction}</p>
              <PageCta label={page.cta} />
            </>
          )}
          {isHome ? <h2 className="sr-only">How FaceMeX supports learning and careers</h2> : null}
          <div className="mt-10 space-y-9">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-base leading-7 text-slate-700">{paragraph}</p>)}
                {section.bullets && (
                  <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}
          </div>
          {faqs.length > 0 && (
            <>
              <FaqSection faqs={faqs} />
              <FaqSchema faqs={faqs} />
            </>
          )}
          {!isHome && <PageCta label={page.cta} />}
          <section className="mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold">Explore more</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
              <li><Link className="underline underline-offset-4" to="/ai-for-students">AI for students</Link></li>
              <li><Link className="underline underline-offset-4" to="/ai-study-assistant">Study assistant</Link></li>
              <li><Link className="underline underline-offset-4" to="/student-career-guidance">Career guidance</Link></li>
              <li><Link className="underline underline-offset-4" to="/online-learning">Online learning</Link></li>
              <li><Link className="underline underline-offset-4" to="/ai-career-assistant">Career assistant</Link></li>
              <li><Link className="underline underline-offset-4" to="/jobs-in-south-africa">Job-search tools</Link></li>
              <li><Link className="underline underline-offset-4" to="/resources">Learning and career guides</Link></li>
            </ul>
          </section>
        </div>
        {isHome ? <HomeSchema /> : null}
      </main>
    </SeoSiteFrame>
  );
}

export function isPublicSeoPath(path: string) {
  return path === '/' || path === '/resources' || Boolean(getSeoPage(path)) || Boolean(getSeoArticle(path));
}
