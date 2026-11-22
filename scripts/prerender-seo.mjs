import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.resolve(process.env.FACEMEX_SEO_OUTPUT_DIR || path.join(projectRoot, 'dist'));

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll("'", '&#39;');

const escapeXml = (value) => escapeHtml(value);

const serializeJsonLd = (value) => JSON.stringify(value).replace(/[<>&]/g, (character) => ({
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
})[character]);

const renderJsonLd = (value) => `<script type="application/ld+json">${serializeJsonLd(value)}</script>`;

const renderSections = (sections) => sections.map((section) => `
  <section class="mt-9">
    <h2 class="text-xl font-semibold tracking-tight sm:text-2xl">${escapeHtml(section.heading)}</h2>
    ${section.paragraphs.map((paragraph) => `<p class="mt-3 text-base leading-7 text-slate-700">${escapeHtml(paragraph)}</p>`).join('')}
    ${section.bullets ? `<ul class="mt-4 list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>` : ''}
  </section>
`).join('');

const renderFaqs = (faqs = []) => faqs.length
  ? `<section class="mt-12 border-t border-slate-200 pt-8"><h2 class="text-2xl font-semibold tracking-tight">Frequently asked questions</h2><div class="mt-5 divide-y divide-slate-200">${faqs.map((faq) => `<details class="py-4"><summary class="cursor-pointer font-medium text-slate-900">${escapeHtml(faq.question)}</summary><p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">${escapeHtml(faq.answer)}</p></details>`).join('')}</div></section>`
  : '';

function createBreadcrumbSchema(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function createHomeSchema(origin) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'FaceMeX',
        alternateName: 'FaceMeX AI',
        url: `${origin}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${origin}/facemex-logo.png`,
        },
        description: 'A South African AI-powered learning and career preparation platform for students, graduates and job seekers.',
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: 'FaceMeX',
        alternateName: 'FaceMeX AI',
        url: `${origin}/`,
        description: 'A South African AI-powered platform for learning, career development, job discovery, CV preparation and interview practice.',
        publisher: { '@id': `${origin}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}/#software`,
        name: 'FaceMeX',
        url: `${origin}/`,
        description: 'A South African AI-powered platform for learning, career development, job discovery, CV preparation and interview practice.',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web browser',
        provider: { '@id': `${origin}/#organization` },
        isPartOf: { '@id': `${origin}/#website` },
      },
    ],
  };
}

function renderSiteHeader(origin, canonicalFor) {
  const navLinks = [
    { path: '/ai-for-students', label: 'For students' },
    { path: '/ai-career-assistant', label: 'Careers' },
    { path: '/resources', label: 'Resources' },
  ];

  return `
    <a href="#main-content" class="sr-only z-50 rounded-md bg-white p-3 text-slate-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <header class="seo-header border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href="${escapeHtml(canonicalFor('/') )}" aria-label="FaceMeX home" class="inline-flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span class="seo-logo-mark inline-flex h-9 w-9 items-center justify-center rounded-xl">
            <img src="${escapeHtml(`${origin}/facemex-logo.png`)}" alt="" width="32" height="32" class="h-8 w-8 rounded-lg" />
          </span>
          <span>FaceMeX</span>
        </a>
        <nav aria-label="Main navigation" class="flex items-center gap-3 text-sm sm:gap-5">
          ${navLinks.map((link) => `<a href="${escapeHtml(canonicalFor(link.path))}" class="hidden text-slate-600 hover:text-slate-950 sm:inline">${escapeHtml(link.label)}</a>`).join('')}
          <a href="${escapeHtml(canonicalFor('/login'))}" class="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">Sign in</a>
          <a href="${escapeHtml(canonicalFor('/signup'))}" class="rounded-lg bg-slate-900 px-3 py-2 font-medium text-white hover:bg-slate-700">Create account</a>
        </nav>
      </div>
    </header>
  `;
}

function renderExploreLinks(landingPages, canonicalFor) {
  const links = landingPages
    .filter((page) => page.path !== '/')
    .map((page) => `<li><a class="underline underline-offset-4" href="${escapeHtml(canonicalFor(page.path))}">${escapeHtml(page.heading)}</a></li>`);

  links.push(`<li><a class="underline underline-offset-4" href="${escapeHtml(canonicalFor('/resources'))}">Learning and career guides</a></li>`);

  return `
    <nav aria-label="Explore public FaceMeX pages" class="mt-12 border-t border-slate-200 pt-8">
      <h2 class="text-lg font-semibold">Explore FaceMeX</h2>
      <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">${links.join('')}</ul>
    </nav>
  `;
}

function renderSiteFooter(canonicalFor) {
  return `
    <footer class="border-t border-slate-200 bg-slate-50">
      <div class="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>FaceMeX — AI support for learning and career preparation.</p>
          <nav aria-label="Footer" class="flex flex-wrap gap-x-5 gap-y-2">
            <a href="${escapeHtml(canonicalFor('/about'))}">About</a>
            <a href="${escapeHtml(canonicalFor('/resources'))}">Resources</a>
          </nav>
        </div>
      </div>
    </footer>
  `;
}

function renderStaticPage(route, seoData) {
  const { SEO_SITE_ORIGIN, getSeoCanonicalUrl, getSeoMetadata, getSeoPage, getSeoArticle, seoLandingPages, seoArticles } = seoData;
  const canonicalFor = getSeoCanonicalUrl;
  const metadata = getSeoMetadata(route);
  let main;
  let structuredData;

  if (route === '/') {
    const page = getSeoPage('/');
    main = `
      <main id="main-content" class="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <p class="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Learning and career workspace</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">${escapeHtml(page.heading)}</h1>
        <p class="mt-5 text-lg leading-8 text-slate-600">${escapeHtml(page.introduction)}</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="${escapeHtml(canonicalFor('/signup'))}" class="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Try FaceMeX AI</a>
          <a href="#facemex-tools" class="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-slate-700">Explore the workspace</a>
        </div>
        <p class="mt-3 text-sm text-slate-500">Workspace tools require an account and sign-in.</p>
        <div class="mt-10 space-y-9">${renderSections(page.sections)}</div>
        ${renderFaqs(page.faqs)}
        <section id="facemex-tools" class="mt-12 border-t border-slate-200 pt-8">
          <h2 class="text-2xl font-semibold tracking-tight">Explore FaceMeX tools</h2>
          <ul class="mt-4 list-disc space-y-2 pl-6 text-base leading-7 text-slate-700">
            <li>AI conversations and study support in the learning workspace.</li>
            <li>Practical Lab activities and lesson support.</li>
            <li>Job discovery, CV and document preparation, and interview practice.</li>
          </ul>
        </section>
        ${renderExploreLinks(seoLandingPages, canonicalFor)}
      </main>
    `;
    structuredData = createHomeSchema(SEO_SITE_ORIGIN);
  } else if (route === '/resources') {
    main = `
      <main id="main-content" class="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <h1 class="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Practical guides for learning and career preparation</h1>
        <p class="mt-5 max-w-3xl text-base leading-7 text-slate-600">Clear, actionable guides on study habits, responsible AI use, CV preparation, interviews, career exploration and job searching. Use them alongside trusted course and employer information.</p>
        <ul class="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          ${seoArticles.map((article) => `<li class="rounded-2xl border border-slate-200 p-5"><h2 class="text-lg font-semibold leading-snug"><a href="${escapeHtml(canonicalFor(`/resources/${article.slug}`))}">${escapeHtml(article.heading)}</a></h2><p class="mt-2 text-sm leading-6 text-slate-600">${escapeHtml(article.description)}</p></li>`).join('')}
        </ul>
        ${renderExploreLinks(seoLandingPages, canonicalFor)}
      </main>
    `;
    structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: 'Resources',
          description: metadata.description,
          url: metadata.canonical,
          isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
        },
        createBreadcrumbSchema([
          { name: 'Home', url: canonicalFor('/') },
          { name: 'Resources', url: metadata.canonical },
        ]),
      ],
    };
  } else {
    const page = getSeoPage(route);
    if (page) {
      main = `
        <main id="main-content" class="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <nav aria-label="Breadcrumb" class="text-sm text-slate-600">
            <ol class="flex flex-wrap items-center gap-2"><li><a href="${escapeHtml(canonicalFor('/'))}">Home</a></li><li aria-hidden="true">/</li><li aria-current="page">${escapeHtml(page.heading)}</li></ol>
          </nav>
          <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">${escapeHtml(page.heading)}</h1>
          <p class="mt-5 text-lg leading-8 text-slate-600">${escapeHtml(page.introduction)}</p>
          <p class="mt-5"><a href="${escapeHtml(canonicalFor('/signup'))}" class="font-semibold underline underline-offset-4">${escapeHtml(page.cta)}</a></p>
          <div class="mt-10 space-y-9">${renderSections(page.sections)}</div>
          ${renderFaqs(page.faqs)}
          ${renderExploreLinks(seoLandingPages, canonicalFor)}
        </main>
      `;
      structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            name: page.heading,
            description: page.description,
            url: metadata.canonical,
            isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
          },
          createBreadcrumbSchema([
            { name: 'Home', url: canonicalFor('/') },
            { name: page.heading, url: metadata.canonical },
          ]),
        ],
      };
    } else {
      const article = getSeoArticle(route);
      if (!article) throw new Error(`No public SEO content found for route "${route}".`);
      main = `
        <main id="main-content" class="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <article>
            <nav aria-label="Breadcrumb" class="text-sm text-slate-600">
              <ol class="flex flex-wrap items-center gap-2"><li><a href="${escapeHtml(canonicalFor('/'))}">Home</a></li><li aria-hidden="true">/</li><li><a href="${escapeHtml(canonicalFor('/resources'))}">Resources</a></li><li aria-hidden="true">/</li><li aria-current="page">${escapeHtml(article.heading)}</li></ol>
            </nav>
            <h1 class="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">${escapeHtml(article.heading)}</h1>
            <p class="mt-5 text-lg leading-8 text-slate-600">${escapeHtml(article.introduction)}</p>
            <p class="mt-4 text-xs text-slate-500">Updated <time datetime="${escapeHtml(article.updated)}">${escapeHtml(article.updated)}</time> · FaceMeX</p>
            <div class="mt-9 space-y-8">${renderSections(article.sections)}</div>
            <section class="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <h2 class="text-lg font-semibold">Explore related FaceMeX tools</h2>
              <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
                ${article.related.map((item) => `<li><a class="underline underline-offset-4" href="${escapeHtml(canonicalFor(item.href))}">${escapeHtml(item.label)}</a></li>`).join('')}
              </ul>
            </section>
            ${renderExploreLinks(seoLandingPages, canonicalFor)}
          </article>
        </main>
      `;
      structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: article.heading,
            description: article.description,
            dateModified: article.updated,
            author: { '@type': 'Organization', name: 'FaceMeX', url: canonicalFor('/about') },
            publisher: {
              '@type': 'Organization',
              name: 'FaceMeX',
              url: canonicalFor('/'),
              logo: { '@type': 'ImageObject', url: `${SEO_SITE_ORIGIN}/facemex-logo.png` },
            },
            mainEntityOfPage: metadata.canonical,
          },
          createBreadcrumbSchema([
            { name: 'Home', url: canonicalFor('/') },
            { name: 'Resources', url: canonicalFor('/resources') },
            { name: article.heading, url: metadata.canonical },
          ]),
        ],
      };
    }
  }

  return `
    <div class="facemex-public-seo seo-site-frame">
      ${renderSiteHeader(SEO_SITE_ORIGIN, canonicalFor)}
      ${main}
      ${renderSiteFooter(canonicalFor)}
      ${renderJsonLd(structuredData)}
    </div>
  `;
}

{
  const seoSource = await readFile(path.join(projectRoot, 'src', 'lib', 'seo.ts'), 'utf8');
  const { outputText, diagnostics = [] } = ts.transpileModule(seoSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  const errors = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
      getCurrentDirectory: () => projectRoot,
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => '\n',
    }));
  }
  const metadataModuleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  const seoData = await import(metadataModuleUrl);
  const { getSeoMetadata, seoLandingPages, seoArticles, nonIndexableSeoRoutes } = seoData;
  const baseHtml = await readFile(path.join(outputRoot, 'index.html'), 'utf8');
  const publicRoutes = [
    ...seoLandingPages.map((page) => page.path),
    '/resources',
    ...seoArticles.map((article) => `/resources/${article.slug}`),
  ];

  const replaceMeta = (html, attribute, key, value) => {
    const escaped = escapeHtml(value);
    const selector = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
    const tag = `<meta ${attribute}="${key}" content="${escaped}" />`;
    return selector.test(html) ? html.replace(selector, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
  };

  const writeRouteHtml = async (route, html) => {
    const destination = route === '/'
      ? path.join(outputRoot, 'index.html')
      : path.join(outputRoot, route.slice(1), 'index.html');
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, html, 'utf8');
  };

  for (const route of [...new Set(publicRoutes)]) {
    const metadata = getSeoMetadata(route);
    if (!metadata.indexable || !metadata.canonical) {
      throw new Error(`Public route "${route}" must have an indexable canonical URL.`);
    }

    let html = baseHtml
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`)
      .replace(/<div id="root"><\/div>/, `<div id="root">${renderStaticPage(route, seoData)}</div>`);

    html = replaceMeta(html, 'name', 'description', metadata.description);
    html = replaceMeta(html, 'name', 'robots', 'index, follow');
    html = replaceMeta(html, 'property', 'og:title', metadata.title);
    html = replaceMeta(html, 'property', 'og:description', metadata.description);
    html = replaceMeta(html, 'property', 'og:url', metadata.canonical);
    html = replaceMeta(html, 'property', 'og:type', route.startsWith('/resources/') ? 'article' : 'website');
    html = replaceMeta(html, 'property', 'og:image', 'https://facemexsocial.com/facemex-logo.png');
    html = replaceMeta(html, 'property', 'og:image:alt', 'FaceMeX');
    html = replaceMeta(html, 'name', 'twitter:title', metadata.title);
    html = replaceMeta(html, 'name', 'twitter:description', metadata.description);
    html = replaceMeta(html, 'name', 'twitter:image', 'https://facemexsocial.com/facemex-logo.png');
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`,
    );

    await writeRouteHtml(route, html);
  }

  const noindexRoutes = {
    ...nonIndexableSeoRoutes,
    '/jobs': getSeoMetadata('/jobs'),
  };

  for (const [route, metadata] of Object.entries(noindexRoutes)) {
    let html = baseHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
    html = replaceMeta(html, 'name', 'description', metadata.description);
    html = replaceMeta(html, 'name', 'robots', 'noindex, follow');
    html = replaceMeta(html, 'property', 'og:title', metadata.title);
    html = replaceMeta(html, 'property', 'og:description', metadata.description);
    html = replaceMeta(html, 'property', 'og:type', 'website');
    html = replaceMeta(html, 'name', 'twitter:title', metadata.title);
    html = replaceMeta(html, 'name', 'twitter:description', metadata.description);
    html = html
      .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, '')
      .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, '');

    await writeRouteHtml(route, html);
  }

  const sitemapRoutes = [...new Set(publicRoutes)]
    .filter((route) => getSeoMetadata(route).indexable)
    .map((route) => `  <url><loc>${escapeXml(getSeoMetadata(route).canonical)}</loc></url>`)
    .join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes}\n</urlset>\n`;
  await writeFile(path.join(outputRoot, 'sitemap.xml'), sitemap, 'utf8');

  console.log(`Pre-rendered ${new Set(publicRoutes).size} public SEO routes and ${Object.keys(noindexRoutes).length} noindex routes with sitemap output.`);
}
