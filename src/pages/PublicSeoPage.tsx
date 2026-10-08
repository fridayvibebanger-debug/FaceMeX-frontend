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

function WebPageSchema({ title, description, path }: { title: string; description: string; path: string }) {
  return (
    <StructuredData
      id={`facemex-webpage-${path.replace(/[^a-z0-9]+/gi, '-')}`}
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url: `${SEO_SITE_ORIGIN}${path}`,
        isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
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

function StudentLandingPage({ page }: { page: NonNullable<ReturnType<typeof getSeoPage>> }) {
  const faqs = page.faqs || [];
  const tools = [
    {
      title: 'AI learning and career workspace',
      description: 'Ask questions, continue a conversation and find workspace tools such as Watch lessons, Projects and Interview Prep.',
      href: '/ai/job-assistant',
      label: 'Open the AI workspace',
      icon: Sparkles,
    },
    {
      title: 'CV and documents',
      description: 'Use the existing CV and document workspace to draft and improve application materials based on your real details.',
      href: '/ai/resume',
      label: 'Open CV tools',
      icon: FileText,
    },
    {
      title: 'Find jobs',
      description: 'Explore job opportunities, then verify listing details and application destinations with the original source.',
      href: '/jobs',
      label: 'Open Jobs',
      icon: BriefcaseBusiness,
    },
    {
      title: 'Practical Lab',
      description: 'Explore interactive practical activities for topics including biology, chemistry, physics, mathematics and engineering.',
      href: '/practical-lab',
      label: 'Open Practical Lab',
      icon: Lightbulb,
    },
  ];

  return (
    <SeoSiteFrame>
      <main id="main-content">
        <BreadcrumbSchema title={page.heading} path={page.path} />
        <WebPageSchema title={page.heading} description={page.description} path={page.path} />
        <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 pt-6 text-sm text-slate-600 sm:px-6 lg:px-8">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link to="/" className="underline underline-offset-4 hover:text-slate-950">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-slate-900">AI for Students</li>
          </ol>
        </nav>

        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Learning and career tools in one workspace
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{page.heading}</h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">{page.introduction}</p>
              <p className="mt-5 text-sm font-semibold tracking-wide text-slate-700">Learn. Understand. Prepare. Build. Find opportunities.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2">
                  Try FaceMeX <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a href="#student-tools" className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
                  Explore FaceMeX
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <section aria-labelledby="student-challenges-heading">
            <h2 id="student-challenges-heading" className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Support for the work around studying and starting a career
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              A tough topic, a busy exam period or a first job application can each raise different questions. FaceMeX brings together an AI assistant and practical tools; use them alongside your course materials, educators and trusted opportunity sources.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {page.sections.map((section) => (
                <article key={section.heading} className="rounded-2xl border border-slate-200 p-5 sm:p-6">
                  <h3 className="text-lg font-semibold tracking-tight">{section.heading}</h3>
                  {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-6 text-slate-600">{paragraph}</p>)}
                  {section.bullets && (
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                      {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section id="student-tools" aria-labelledby="student-tools-heading" className="mt-14 scroll-mt-6 border-t border-slate-200 pt-10">
            <h2 id="student-tools-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">Explore FaceMeX tools for students</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              These are existing parts of the FaceMeX application, not separate public services. The workspace and its tools require an account and sign-in.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <article key={tool.href} className="flex flex-col rounded-2xl border border-slate-200 p-5 sm:p-6">
                    <Icon className="h-5 w-5 text-slate-600" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-semibold">{tool.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{tool.description}</p>
                    <Link to={tool.href} className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-800 underline underline-offset-4 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
                      {tool.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Watch lessons, Projects and Interview Prep are available from within the AI workspace; they do not have separate public landing pages here.
            </p>
          </section>

          <section aria-labelledby="how-it-works-heading" className="mt-14 border-t border-slate-200 pt-10">
            <h2 id="how-it-works-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">A practical way to get started</h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              <li className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">01 · Ask</p>
                <h3 className="mt-2 text-lg font-semibold">Say what you’re working on</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Name the subject, topic, level and the specific question or step where you need help.</p>
              </li>
              <li className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">02 · Learn</p>
                <h3 className="mt-2 text-lg font-semibold">Work through the explanation</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Ask follow-up questions, compare responses with trusted materials, and practise the idea yourself.</p>
              </li>
              <li className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">03 · Prepare</p>
                <h3 className="mt-2 text-lg font-semibold">Take a useful next step</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use available tools to prepare a document, practise an interview or explore an opportunity.</p>
              </li>
            </ol>
          </section>

          <section aria-labelledby="student-audience-heading" className="mt-14 border-t border-slate-200 pt-10">
            <h2 id="student-audience-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">For students at different stages</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              High school, college and university students can use FaceMeX to explore learning questions and practise study skills. Graduates and students preparing for work can also use existing career tools to draft documents, practise interview responses and explore jobs. FaceMeX is not affiliated with a particular school or university.
            </p>
          </section>

          {faqs.length > 0 && (
            <section aria-labelledby="student-faq-heading" className="mt-14 border-t border-slate-200 pt-10">
              <h2 id="student-faq-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
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
              <FaqSchema faqs={faqs} />
            </section>
          )}

          <section className="mt-14 rounded-2xl bg-slate-50 p-6 sm:p-8" aria-labelledby="student-cta-heading">
            <h2 id="student-cta-heading" className="text-2xl font-semibold tracking-tight">Ready to work on your next question?</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Create an account to use the FaceMeX workspace and its learning and career tools. Check AI responses against trusted sources and your course guidance.</p>
            <Link to="/signup" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2">
              Try FaceMeX <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>

          <nav aria-label="Related FaceMeX pages" className="mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold">Related guides and pages</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
              <li><Link className="underline underline-offset-4" to="/ai-study-assistant">Study assistant guide</Link></li>
              <li><Link className="underline underline-offset-4" to="/student-career-guidance">Career guidance</Link></li>
              <li><Link className="underline underline-offset-4" to="/jobs-in-south-africa">Job-search information</Link></li>
              <li><Link className="underline underline-offset-4" to="/resources">Learning and career resources</Link></li>
            </ul>
          </nav>
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
  if (pathname === '/ai-for-students') return <StudentLandingPage page={page} />;

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
