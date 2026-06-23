#!/usr/bin/env node
/* ============================================================
   Kay & Co. — shared chrome applier
   ------------------------------------------------------------
   Keeps the global navigation (header) and footer identical on
   every public page. Replaces the <header class="nav"> and
   <footer class="footer"> blocks with the canonical markup,
   sets the active state from each page's route, and bumps the
   CSS/JS cache token. Run after editing the templates below:

     node apply-chrome.js          # rewrite all pages
     node apply-chrome.js --check  # fail if any page is stale
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ASSET_VERSION = 'resources-hub-20260623';

const SKIP_DIRS = new Set(['.git', '.github', 'assets', 'data', 'functions', 'node_modules']);

/* Routes where the "Services" nav item should be marked active. */
const SERVICE_ROUTES = new Set([
  '/services/',
  '/healthcare-seo-services/',
  '/medical-seo-services/',
  '/ai-seo-for-healthcare/',
  '/seo-for-healthcare-providers/',
  '/seo-for-care-homes/',
  '/healthcare-seo-agency/',
  '/healthcare-seo-company/',
  '/healthcare-seo-consultant/',
  '/medical-seo-specialists/',
]);

function isServiceRoute(route) {
  return route.startsWith('/services/') || route === '/services/seo' ||
    route === '/services/geo-optimization' || SERVICE_ROUTES.has(route);
}

function isResourceRoute(route) {
  return route.startsWith('/resources') || route.startsWith('/info') || route.startsWith('/blog');
}

/* ---------- Canonical markup ---------- */
function navMarkup(route) {
  const servicesActive = isServiceRoute(route) ? ' class="active"' : '';
  const resourcesActive = isResourceRoute(route) ? ' active' : '';
  return `<header class="nav">
    <a class="nav__logo" href="/" aria-label="Kay & Co. home"><span class="logo-mark" aria-hidden="true"><img src="/assets/img/kayco-logo-mark.svg" alt="" width="32" height="32" /></span><span class="logo-wordmark">Kay&nbsp;&amp;&nbsp;Co.</span></a>
    <nav aria-label="Primary">
      <ul class="nav__links" id="menu">
        <li><a href="/services/"${servicesActive}>Services</a></li>
        <li class="nav__item nav__item--dropdown">
          <a href="/resources/" class="nav__drop-link${resourcesActive}" aria-haspopup="true">Resources</a>
          <div class="nav__dropdown nav__dropdown--mini" id="resources-menu">
            <a href="/resources/guides/">Guides</a>
            <a href="/info/">Topics</a>
            <a href="/resources/checklists/">Checklists</a>
            <a href="/blog/">Blog</a>
          </div>
        </li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/contact" class="btn btn-primary nav__cta">Book an Audit <span class="arrow">&rarr;</span></a></li>
      </ul>
    </nav>
    <button class="nav__burger" aria-label="Toggle menu" aria-controls="menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </header>`;
}

const FOOTER_MARKUP = `<footer class="footer">
    <div class="container">
      <div class="footer__strap">
        <span class="dot" aria-hidden="true"></span>
        <span>Healthcare SEO</span><span class="dot" aria-hidden="true"></span>
        <span>Generative Engine Optimisation</span><span class="dot" aria-hidden="true"></span>
        <span>United Kingdom</span>
      </div>
      <div class="footer__grid">
        <div class="footer__brand"><a class="nav__logo" href="/"><span class="logo-mark" aria-hidden="true"><img src="/assets/img/kayco-logo-mark.svg" alt="" width="32" height="32" /></span><span class="logo-wordmark">Kay&nbsp;&amp;&nbsp;Co.</span></a><p>Doctor-led healthcare SEO &amp; GEO. Our content is written by doctors, accurate from the first draft.</p></div>
        <div><h4>Services</h4><ul><li><a href="/healthcare-seo-services/">Healthcare SEO Services</a></li><li><a href="/medical-seo-services/">Medical SEO Services</a></li><li><a href="/ai-seo-for-healthcare/">AI SEO for Healthcare</a></li><li><a href="/services/geo-optimization">GEO Optimisation</a></li><li><a href="/services/">All services</a></li></ul></div>
        <div><h4>Resources</h4><ul><li><a href="/resources/">All resources</a></li><li><a href="/info/">Topics</a></li><li><a href="/resources/checklists/healthcare-seo-checklist/">Healthcare SEO Checklist</a></li><li><a href="/blog/">Blog</a></li></ul></div>
        <div><h4>Company</h4><ul><li><a href="/doctor-led/">Doctor-Led</a></li><li><a href="/case-studies/welcare/">Welcare Case Study</a></li><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li></ul></div>
        <div><h4>Get in touch</h4><ul><li><a href="mailto:hello@kayco.net">hello@kayco.net</a></li><li><a href="/contact">Book a visibility audit</a></li><li><span style="color:var(--grey-dim)">United Kingdom</span></li></ul></div>
      </div>
      <div class="footer__big" aria-hidden="true">Kay <span class="amp">&amp;</span> Co.</div>
      <div class="footer__bottom"><p>&copy; <span data-year>2026</span> Kay &amp; Co. All rights reserved. The Project Hero Ltd.</p><a class="footer__email" href="mailto:hello@kayco.net">hello@kayco.net</a></div>
    </div>
  </footer>`;

/* ---------- File walking + route ---------- */
function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) files.push(path.join(dir, entry.name));
  }
  return files;
}

function toRoute(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel.replace(/\.html$/, '')}`;
}

function applyChrome(html, route) {
  let out = html;
  out = out.replace(/<header class="nav">[\s\S]*?<\/header>/, navMarkup(route));
  out = out.replace(/<footer class="footer">[\s\S]*?<\/footer>/, FOOTER_MARKUP);
  out = out.replace(/\/assets\/css\/style\.css(?:\?v=[^"']*)?/g, `/assets/css/style.css?v=${ASSET_VERSION}`);
  out = out.replace(/\/assets\/js\/main\.js(?:\?v=[^"']*)?/g, `/assets/js/main.js?v=${ASSET_VERSION}`);
  return out;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const files = walk(ROOT);
  let changed = 0;
  const stale = [];
  const missing = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const html = fs.readFileSync(file, 'utf8');
    if (!/<header class="nav">/.test(html) || !/<footer class="footer">/.test(html)) {
      missing.push(rel);
      continue;
    }
    const route = toRoute(file);
    const next = applyChrome(html, route);
    if (next !== html) {
      if (checkOnly) stale.push(rel);
      else { fs.writeFileSync(file, next, 'utf8'); changed++; }
    }
  }

  if (missing.length) {
    console.warn(`Skipped ${missing.length} file(s) without nav/footer: ${missing.join(', ')}`);
  }
  if (checkOnly) {
    if (stale.length) {
      console.error(`Chrome out of date in ${stale.length} file(s):`);
      for (const f of stale) console.error(`- ${f}`);
      process.exit(1);
    }
    console.log(`Checked ${files.length} file(s); chrome is up to date.`);
  } else {
    console.log(`Applied canonical nav + footer to ${changed} file(s) (of ${files.length}).`);
  }
}

main();
