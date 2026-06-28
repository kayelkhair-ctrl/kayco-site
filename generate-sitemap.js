#!/usr/bin/env node
/* ============================================================
   Kay & Co. sitemap and robots generator
   ------------------------------------------------------------
   Scans public HTML files, validates indexability/canonicals,
   writes sitemap.xml, and keeps robots.txt pointed at it.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const SITE = 'https://www.kayco.net';
const TODAY = new Date().toISOString().slice(0, 10);

const CORE_ROUTE_ORDER = [
  '/',
  '/services/',
  '/healthcare-seo-agency/',
  '/healthcare-seo-consultant/',
  '/medical-seo-specialists/',
  '/healthcare-seo-company/',
  '/healthcare-seo-services/',
  '/seo-for-healthcare-providers/',
  '/medical-seo-services/',
  '/seo-for-care-homes/',
  '/ai-seo-for-healthcare/',
  '/resources/',
  '/resources/guides/',
  '/resources/checklists/',
  '/resources/guides/what-is-healthcare-seo/',
  '/resources/guides/what-is-medical-seo/',
  '/resources/guides/healthcare-seo-vs-normal-seo/',
  '/resources/guides/eeat-healthcare-seo/',
  '/resources/guides/ymyl-healthcare-seo/',
  '/resources/guides/medical-copywriter-vs-doctor-written-content/',
  '/resources/guides/how-to-choose-a-healthcare-seo-agency/',
  '/resources/checklists/healthcare-seo-checklist/',
  '/resources/guides/ai-search-for-healthcare-websites/',
  '/resources/guides/why-is-my-clinic-not-ranking-on-google/',
  '/resources/guides/healthcare-seo-pricing/',
  '/case-studies/welcare/',
  '/about',
  '/contact',
  '/blog/',
  '/info/',
  '/services/seo',
  '/services/geo-optimization',
];

const SKIP_DIRS = new Set([
  '.git',
  '.github',
  'assets',
  'data',
  'functions',
  'node_modules',
]);

const BLOCKED_SEGMENT = /(^|[\\/])(?:admin|draft|drafts|private|test|tests)([\\/]|$)/i;

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function toRoute(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (rel === '404.html') return null;
  if (BLOCKED_SEGMENT.test(rel)) return null;
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel.replace(/\.html$/, '')}`;
}

function getMeta(content, name) {
  const match = content.match(new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`, 'i'));
  if (!match) return '';
  const contentMatch = match[0].match(/\scontent=["']([^"']*)["']/i);
  return contentMatch ? contentMatch[1].trim() : '';
}

function getCanonical(content) {
  const match = content.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i);
  if (!match) return '';
  const hrefMatch = match[0].match(/\shref=["']([^"']*)["']/i);
  return hrefMatch ? hrefMatch[1].trim() : '';
}

function routePriority(route) {
  if (route === '/') return '1.0';
  if ([
    '/healthcare-seo-agency/',
    '/healthcare-seo-consultant/',
    '/medical-seo-specialists/',
    '/healthcare-seo-company/',
    '/services/',
    '/healthcare-seo-services/',
    '/seo-for-healthcare-providers/',
    '/medical-seo-services/',
    '/seo-for-care-homes/',
    '/ai-seo-for-healthcare/',
    '/services/seo',
    '/services/geo-optimization',
    '/dental-seo-services/',
  ].includes(route)) return '0.9';
  if (route === '/resources/' || route.startsWith('/resources/')) return '0.8';
  if (route === '/blog/' || route === '/info/' || route.startsWith('/info/')) return '0.8';
  if (route.startsWith('/case-studies/')) return '0.8';
  if (route.startsWith('/blog/')) return '0.7';
  if (route === '/about' || route === '/contact') return '0.7';
  return '0.6';
}

function routeChangefreq(route) {
  if (route === '/' || route === '/blog/' || route === '/info/' || route === '/resources/') return 'weekly';
  return 'monthly';
}

function gitLastModified(file) {
  const rel = path.relative(ROOT, file);
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', rel], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (dirty) return TODAY;

    const last = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (last) return last;
  } catch {
    // Fall back to filesystem mtime when git is unavailable.
  }
  return fs.statSync(file).mtime.toISOString().slice(0, 10);
}

function localHtmlExistsForRoute(route) {
  if (route === '/') return fs.existsSync(path.join(ROOT, 'index.html'));
  if (route.endsWith('/')) return fs.existsSync(path.join(ROOT, route, 'index.html'));
  return fs.existsSync(path.join(ROOT, `${route}.html`));
}

function routeSort(a, b) {
  const ai = CORE_ROUTE_ORDER.indexOf(a.route);
  const bi = CORE_ROUTE_ORDER.indexOf(b.route);
  if (ai !== -1 || bi !== -1) {
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }
  return a.route.localeCompare(b.route);
}

function buildEntries() {
  const entries = [];
  const errors = [];
  const skipped = [];

  for (const file of walk(ROOT)) {
    const route = toRoute(file);
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (!route) {
      skipped.push(rel);
      continue;
    }

    const html = fs.readFileSync(file, 'utf8');
    const robots = getMeta(html, 'robots');
    if (!robots) {
      errors.push(`${rel}: missing meta robots`);
      continue;
    }
    if (/\bnoindex\b/i.test(robots)) {
      skipped.push(`${rel} (noindex)`);
      continue;
    }

    const expectedCanonical = `${SITE}${route}`;
    const canonical = getCanonical(html);
    if (!canonical) errors.push(`${rel}: missing canonical URL`);
    if (canonical && canonical !== expectedCanonical) {
      errors.push(`${rel}: canonical is ${canonical}, expected ${expectedCanonical}`);
    }
    if (!localHtmlExistsForRoute(route)) {
      errors.push(`${rel}: local route check failed for ${route}`);
    }

    entries.push({
      route,
      loc: expectedCanonical,
      lastmod: gitLastModified(file),
      changefreq: routeChangefreq(route),
      priority: routePriority(route),
    });
  }

  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.loc)) errors.push(`Duplicate sitemap URL: ${entry.loc}`);
    seen.add(entry.loc);
  }

  return { entries: entries.sort(routeSort), errors, skipped };
}

function renderSitemap(entries) {
  const urls = entries.map((entry) => `  <url>
    <loc>${xmlEscape(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function renderRobots() {
  return `# Kay & Co., robots.txt
# Static search crawler policy for kayco.net

User-agent: *
Allow: /
Disallow: /cdn-cgi/

Sitemap: ${SITE}/sitemap.xml
`;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const { entries, errors, skipped } = buildEntries();
  const sitemap = renderSitemap(entries);
  const robots = renderRobots();

  if (errors.length) {
    console.error('Sitemap generation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  const robotsPath = path.join(ROOT, 'robots.txt');

  if (checkOnly) {
    const currentSitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';
    const currentRobots = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, 'utf8') : '';
    if (currentSitemap !== sitemap || currentRobots !== robots) {
      console.error('sitemap.xml or robots.txt is out of date. Run npm run sitemap.');
      process.exit(1);
    }
  } else {
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
    fs.writeFileSync(robotsPath, robots, 'utf8');
  }

  console.log(`${checkOnly ? 'Checked' : 'Generated'} sitemap.xml with ${entries.length} public URLs.`);
  if (skipped.length) console.log(`Skipped ${skipped.length} non-public/noindex HTML file(s).`);
}

main();
