import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, FileText, Lightbulb, Play, Sparkles } from 'lucide-react';
import { getSeoArticle, getSeoPage, SEO_SITE_ORIGIN, seoArticles } from '@/lib/seo';

const iconByTopic = [BookOpen, Lightbulb, FileText, BriefcaseBusiness];

const productFeatures = [
  {
    title: 'AI workspace',
    description: 'Ask questions, work through topics and continue a conversation with FaceMeX AI.',
    href: '/ai/job-assistant',
    icon: Sparkles,
  },
  {
    title: 'CV & documents',
    description: 'Create and refine CVs, cover letters and other professional documents.',
    href: '/ai/resume',
    icon: FileText,
  },
  {
    title: 'Video lessons',
    description: 'Open Watch lessons from inside the AI workspace to learn with video.',
    href: '/ai/job-assistant',
    icon: Play,
  },
  {
    title: 'Job discovery',
    description: 'Explore job opportunities and verify application details at the original source.',
    href: '/jobs',
    icon: BriefcaseBusiness,
  },
];

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
              url: `${SEO_SITE_ORIGIN}/facemex-logo.png`,
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

function SeoSiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="facemex-public-seo seo-site-frame">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-white p-3 text-slate-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header className="seo-header border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="FaceMeX home" className="inline-flex shrink-0 items-center gap-2 font-semibold tracking-tight">
            <span className="seo-logo-mark inline-flex h-9 w-9 items-center justify-center rounded-xl">
              <img src="/facemex-logo.png" alt="" width="32" height="32" className="h-8 w-8 rounded-lg" />
            </span>
            <span>FaceMeX</span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-3 text-sm sm:gap-5">
            <Link to="/ai-for-students" className="hidden text-slate-600 hover:text-slate-950 sm:inline">For students</Link>
            <Link to="/ai-career-assistant" className="hidden text-slate-600 hover:text-slate-950 sm:inline">Careers</Link>
            <Link to="/resources" className="hidden text-slate-600 hover:text-slate-950 sm:inline">Resources</Link>
            <a href="#facemex-tools" className="hidden text-slate-600 hover:text-slate-950 md:inline">Explore tools</a>
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

function ProductFeatureShowcase() {
  return (
    <section id="facemex-tools" aria-labelledby="facemex-tools-heading" className="seo-feature-showcase mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">One connected workspace</p>
        <h2 id="facemex-tools-heading" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Tools for learning and your next career step</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">Explore the real FaceMeX tools. Workspace features require an account and sign-in.</p>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {productFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.title} to={feature.href} className="seo-feature-card group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-400 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
              <span className="seo-feature-icon inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 flex items-center gap-2 font-semibold">
                {feature.title}
                <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ProductMockup({ kind }: { kind: 'assistant' | 'documents' | 'jobs' | 'lessons' }) {
  if (kind === 'assistant') {
    return (
      <div className="seo-product-window seo-product-window-chat" role="img" aria-label="Illustration of the FaceMeX AI workspace">
        <div className="seo-product-window-bar">
          <span className="seo-product-brand"><img src="/facemex-logo.png" alt="" /> FaceMeX</span>
          <span className="seo-product-window-label">AI workspace</span>
        </div>
        <div className="seo-product-chat">
          <div className="seo-product-question">Can you explain this step by step?</div>
          <div className="seo-product-answer">
            <span className="seo-product-avatar"><Sparkles aria-hidden="true" /></span>
            <div><strong>Let’s work through it together.</strong><span>Start with the main idea, then break it into smaller steps you can check.</span></div>
          </div>
          <div className="seo-product-input"><span>Ask a follow-up question…</span><span className="seo-product-send"><ArrowRight aria-hidden="true" /></span></div>
        </div>
      </div>
    );
  }

  if (kind === 'documents') {
    return (
      <div className="seo-product-window seo-product-window-document" role="img" aria-label="Illustration of the FaceMeX CV and document editor">
        <div className="seo-product-window-bar">
          <span className="seo-product-brand"><img src="/facemex-logo.png" alt="" /> FaceMeX</span>
          <span className="seo-product-window-label">CV &amp; documents</span>
        </div>
        <div className="seo-product-document">
          <div className="seo-product-document-sheet">
            <span className="seo-document-rule" />
            <strong>YOUR NEXT CHAPTER</strong>
            <span className="seo-document-line seo-document-line-short" />
            <span className="seo-document-subhead">PROFILE</span>
            <span className="seo-document-line" />
            <span className="seo-document-line" />
            <span className="seo-document-subhead">EXPERIENCE</span>
            <span className="seo-document-line" />
            <span className="seo-document-line seo-document-line-short" />
          </div>
          <div className="seo-document-assistant"><Sparkles aria-hidden="true" /><span>Refine your draft with AI</span></div>
        </div>
      </div>
    );
  }

  if (kind === 'lessons') {
    return (
      <div className="seo-product-window seo-product-window-lessons" role="img" aria-label="Illustration of FaceMeX video lessons in the learning workspace">
        <div className="seo-product-window-bar">
          <span className="seo-product-brand"><img src="/facemex-logo.png" alt="" /> FaceMeX</span>
          <span className="seo-product-window-label">Watch lessons</span>
        </div>
        <div className="seo-product-lesson">
          <div className="seo-lesson-screen">
            <span className="seo-lesson-halo" aria-hidden="true" />
            <span className="seo-lesson-play"><Play aria-hidden="true" fill="currentColor" /></span>
            <span className="seo-lesson-caption">Learn at your pace</span>
          </div>
          <div className="seo-lesson-copy">
            <span>LEARNING WORKSPACE</span>
            <strong>Explore a lesson, then ask a follow-up.</strong>
            <small>Keep the video and your questions together.</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="seo-product-window seo-product-window-jobs" role="img" aria-label="Illustration of FaceMeX job discovery">
      <div className="seo-product-window-bar">
        <span className="seo-product-brand"><img src="/facemex-logo.png" alt="" /> FaceMeX</span>
        <span className="seo-product-window-label">Job discovery</span>
      </div>
      <div className="seo-product-jobs">
        <div className="seo-jobs-heading"><strong>Find your next opportunity</strong><span>Explore listings and check details at the original source.</span></div>
        {['New opportunities', 'Early career roles', 'Skills to highlight'].map((label, index) => (
          <div className="seo-job-row" key={label}>
            <span className={`seo-job-mark seo-job-mark-${index + 1}`} aria-hidden="true" />
            <span><strong>{label}</strong><span>{['Explore available roles', 'Find a place to start', 'Prepare your application'][index]}</span></span>
            <ArrowRight aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeProductShowcase() {
  const stories = [
    {
      id: 'assistant',
      eyebrow: 'Ask, learn, continue',
      title: 'A workspace for the questions you’re working through.',
      description: 'Explore a topic with FaceMeX AI, ask follow-up questions and take the conversation at your own pace.',
      href: '/ai/job-assistant',
      link: 'Explore the AI workspace',
      kind: 'assistant' as const,
    },
    {
      id: 'documents',
      eyebrow: 'Make your next step tangible',
      title: 'Bring your ideas into a document you can shape.',
      description: 'Draft and refine a CV, cover letter or other professional document using your own details.',
      href: '/ai/resume',
      link: 'Explore CV & documents',
      kind: 'documents' as const,
    },
    {
      id: 'jobs',
      eyebrow: 'Explore opportunities',
      title: 'Move from looking to taking a practical next step.',
      description: 'Discover job opportunities and verify listing details and application destinations with their original sources.',
      href: '/jobs',
      link: 'Explore job discovery',
      kind: 'jobs' as const,
    },
    {
      id: 'lessons',
      eyebrow: 'Learn with more context',
      title: 'Pair a lesson with the questions it brings up.',
      description: 'Open Watch lessons from the FaceMeX workspace and continue exploring a topic through follow-up questions.',
      href: '/ai/job-assistant',
      link: 'Explore Watch lessons',
      kind: 'lessons' as const,
    },
  ];

  return (
    <section id="facemex-tools" className="seo-home-showcase mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8" aria-label="Explore FaceMeX">
      {stories.map((story, index) => (
        <article className={`seo-home-story ${index % 2 ? 'seo-home-story-reverse' : ''}`} key={story.id}>
          <div className="seo-home-story-copy">
            <p className="seo-home-eyebrow"><Sparkles aria-hidden="true" /> {story.eyebrow}</p>
            <h2>{story.title}</h2>
            <p className="seo-home-story-description">{story.description}</p>
            <Link to={story.href}>{story.link}<ArrowRight aria-hidden="true" /></Link>
          </div>
          <div className={`seo-home-visual seo-home-visual-${story.kind}`}>
            <span className="seo-home-glow" aria-hidden="true" />
            <ProductMockup kind={story.kind} />
          </div>
        </article>
      ))}
    </section>
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
          logo: { '@type': 'ImageObject', url: `${SEO_SITE_ORIGIN}/facemex-logo.png` },
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
        <div className="seo-student-page">
          <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 pt-6 text-sm text-slate-600 sm:px-6 lg:px-8">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link to="/" className="underline underline-offset-4 hover:text-slate-950">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-slate-900">AI for Students</li>
            </ol>
          </nav>

          <section className="seo-hero seo-student-hero border-b border-slate-200 bg-slate-50">
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.8fr)] lg:px-8 lg:py-20">
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
              <aside className="seo-student-quickstart rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6" aria-labelledby="student-quickstart-heading">
                <div className="flex items-start gap-3">
                  <span className="seo-feature-icon inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="student-quickstart-heading" className="text-base font-semibold">One workspace, useful next steps</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Learn with AI, then continue with practical tools for your goals.</p>
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-200">
                  {tools.slice(0, 3).map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <Link key={tool.href} to={tool.href} className="seo-student-quickstart-link flex items-center gap-3 border-b border-slate-200 py-3 last:border-0">
                        <Icon className="h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                        <span className="flex-1 text-sm font-medium">{tool.title}</span>
                        <ArrowRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">Workspace tools require an account and sign-in.</p>
              </aside>
            </div>
          </section>

          <ProductFeatureShowcase />

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
        </div>
      </main>
    </SeoSiteFrame>
  );
}

export default function PublicSeoPage() {
  const { pathname } = useLocation();
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
  const page = getSeoPage(normalizedPathname);

  if (normalizedPathname === '/resources') return <ResourceHub />;
  if (normalizedPathname.startsWith('/resources/')) return <ArticlePage path={normalizedPathname} />;
  if (!page) return <NotFoundPage />;
  if (normalizedPathname === '/ai-for-students') return <StudentLandingPage page={page} />;

  const isHome = page.path === '/';
  const faqs = page.faqs || [];

  return (
    <SeoSiteFrame>
      <main id="main-content">
        {isHome ? (
          <section className="seo-hero seo-home-hero">
            <div className="seo-home-hero-inner mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="seo-home-hero-copy">
                <p className="seo-home-eyebrow"><Sparkles aria-hidden="true" /> Learning and career workspace</p>
                <h1>{page.heading}</h1>
                <p className="seo-home-hero-description">{page.introduction}</p>
                <div className="seo-home-hero-actions">
                  <Link to="/signup" className="seo-primary-action">Try FaceMeX AI <ArrowRight aria-hidden="true" /></Link>
                  <a href="#facemex-tools" className="seo-secondary-action">Explore the workspace</a>
                </div>
                <p className="seo-home-note">Workspace tools require an account and sign-in.</p>
              </div>
              <div className="seo-home-hero-visual">
                <span className="seo-home-orb seo-home-orb-blue" aria-hidden="true" />
                <span className="seo-home-orb seo-home-orb-pink" aria-hidden="true" />
                <ProductMockup kind="assistant" />
                <div className="seo-home-float-note"><span><FileText aria-hidden="true" /></span> From questions to next steps</div>
              </div>
            </div>
          </section>
        ) : null}
        {isHome ? <HomeProductShowcase /> : null}
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
            <FaqSection faqs={faqs} />
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
  const normalizedPath = path.replace(/\/+$/, '') || '/';
  return normalizedPath === '/' ||
    normalizedPath === '/resources' ||
    Boolean(getSeoPage(normalizedPath)) ||
    Boolean(getSeoArticle(normalizedPath));
}
