import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'dist');

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
  const { getSeoMetadata, seoLandingPages, seoArticles, nonIndexableSeoRoutes } = await import(metadataModuleUrl);
  const baseHtml = await readFile(path.join(outputRoot, 'index.html'), 'utf8');
  const routes = [
    ...seoLandingPages.map((page) => page.path),
    '/resources',
    ...seoArticles.map((article) => `/resources/${article.slug}`),
  ];

  const escapeHtml = (value) => value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

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

  for (const route of [...new Set(routes)]) {
    const metadata = getSeoMetadata(route);
    let html = baseHtml
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`)
      .replace(/<div id="root"><\/div>/, '<div id="root"></div>');

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

    const canonical = `<link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`;
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, canonical);

    await writeRouteHtml(route, html);
  }

  for (const [route, metadata] of Object.entries(nonIndexableSeoRoutes)) {
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

  console.log(`Pre-rendered ${new Set(routes).size} public SEO routes and ${Object.keys(nonIndexableSeoRoutes).length} noindex routes.`);
}
