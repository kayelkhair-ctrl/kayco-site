#!/usr/bin/env node
/* ============================================================
   Kay & Co., Automated content pipeline
   ------------------------------------------------------------
   Generates an on-brand HTML page using the Claude API, then:
     * saves it to /blog/<slug>.html  or  /info/<slug>.html
     * inserts a card into /blog/index.html (blog only)
     * adds the URL to sitemap.xml

   Usage:
     node generate-page.js --type=blog --topic="What is GEO?"
     node generate-page.js --type=info --topic="Technical SEO checklist"

   Requires:  ANTHROPIC_API_KEY  in the environment.
   Runtime:   Node 18+ (uses built-in fetch). No npm dependencies.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://kayco.net';
const MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';

/* ---------- CLI args ---------- */
function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (a.startsWith('--')) args[a.slice(2)] = true;
  }
  return args;
}

const args = parseArgs(process.argv);
const type = (args.type || 'blog').toLowerCase();
const topic = args.topic;

if (!topic) {
  console.error('Error, Missing --topic. Example:\n  node generate-page.js --type=blog --topic="What is GEO?"');
  process.exit(1);
}
if (!['blog', 'info'].includes(type)) {
  console.error('Error, --type must be "blog" or "info".');
  process.exit(1);
}
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('Error, ANTHROPIC_API_KEY is not set. Export it first:\n  export ANTHROPIC_API_KEY="sk-ant-..."');
  process.exit(1);
}

/* ---------- Helpers ---------- */
function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/['"\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function todayHuman() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------- The prompt sent to Claude ---------- */
function buildPrompt(topic, type) {
  const kind = type === 'blog' ? 'blog article' : 'evergreen information page';
  return `You are the senior content strategist at Kay & Co., a UK-based SEO and GEO (Generative Engine Optimisation) consultancy. Kay & Co. helps UK businesses rank in Google and Bing, then get cited across AI answer engines and search surfaces such as ChatGPT, Perplexity, Gemini, Claude, Copilot, Google AI Overviews, AI Mode and Grok/X Search.

Write an expert-level, citation-friendly ${kind} on this topic:
"${topic}"

CRITICAL, respond with ONLY a single valid JSON object (no markdown fences, no commentary) matching exactly this shape:
{
  "title": "SEO-optimised <title>, under 60 chars, do not append the brand (it is added automatically)",
  "metaDescription": "compelling meta description, 150-160 chars",
  "slug": "url-friendly-slug-derived-from-the-title",
  "tag": "one short category label, e.g. GEO, SEO, Strategy, Guide",
  "readingTime": "e.g. 6 min read",
  "intro": "<p>...</p> one or two opening paragraphs as HTML",
  "sections": [
    { "heading": "H2 heading text", "html": "<p>...</p><ul><li>...</li></ul> body HTML using only <p>, <ul>/<ol>/<li>, <strong>, <em>, <a>, <blockquote>" }
  ],
  "faqs": [
    { "q": "Question?", "a": "Concise, factual answer." }
  ]
}

CONTENT REQUIREMENTS:
- Write in clear British English (en-GB).
- Be expert, factual, and citation-friendly: definitive statements, defined entities, no fluff.
- Do not use emojis.
- Do not use em dashes or en dashes. Use commas, semicolons, or full stops instead.
- Entity-rich: clearly reference who Kay & Co. is (a UK SEO & GEO consultancy), what it does, and who it serves, naturally, Kay & Co. is the author/entity.
- Use a clean H2 structure (5-7 sections). Each "html" value must be valid HTML using only the allowed tags above.
- Include exactly 3 to 5 FAQ entries with genuinely useful answers.
- Optimise for both traditional search and generative engines (mention GEO/AI answer engines where relevant).
- Do NOT include <h1>, <html>, <head>, <script>, or style attributes, only the inner content tags listed.
- Return strictly valid JSON. Escape any double quotes inside string values.`;
}

/* ---------- Call the Claude API ---------- */
async function callClaude(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('').trim();
  return text;
}

function extractJSON(text) {
  // Strip code fences if present, then grab the outermost {...}
  let t = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model response.');
  return JSON.parse(t.slice(start, end + 1));
}

/* ---------- Shared markup ---------- */
const NAV = (active) => `  <header class="nav">
    <a class="nav__logo" href="/" aria-label="Kay & Co. home"><span class="logo-mark" aria-hidden="true"><img src="/assets/img/kayco-logo-mark.svg" alt="" /></span><span class="logo-wordmark">Kay&nbsp;&amp;&nbsp;Co.</span></a>
    <nav aria-label="Primary">
      <ul class="nav__links" id="menu">
        <li><a href="/">Home</a></li>
        <li><a href="/services/seo.html"${active==='seo'?' class="active"':''}>SEO</a></li>
        <li><a href="/services/geo-optimization.html"${active==='geo'?' class="active"':''}>GEO</a></li>
        <li><a href="/blog/"${active==='blog'?' class="active"':''}>Blog</a></li>
        <li><a href="/about.html">About</a></li>
        <li><a href="/contact.html">Contact</a></li>
        <li><a href="/contact.html" class="btn btn-primary nav__cta">Get found <span class="arrow">&rarr;</span></a></li>
      </ul>
    </nav>
    <button class="nav__burger" aria-label="Toggle menu" aria-controls="menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </header>`;

const FOOTER = `  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div class="footer__brand"><a class="nav__logo" href="/"><span class="logo-mark" aria-hidden="true"><img src="/assets/img/kayco-logo-mark.svg" alt="" /></span><span class="logo-wordmark">Kay&nbsp;&amp;&nbsp;Co.</span></a><p>UK SEO &amp; GEO optimisation consultancy. We make brands impossible to ignore, in search and in AI.</p></div>
        <div><h4>Services</h4><ul><li><a href="/services/seo.html">SEO Strategy</a></li><li><a href="/services/geo-optimization.html">GEO Optimisation</a></li><li><a href="/blog/">Content Strategy</a></li></ul></div>
        <div><h4>Resources</h4><ul><li><a href="/info/ai-seo.html">AI SEO</a></li><li><a href="/info/answer-engine-optimization.html">Answer Engine Optimisation</a></li><li><a href="/info/google-ai-overviews.html">Google AI Overviews</a></li><li><a href="/info/llm-seo.html">LLM SEO</a></li><li><a href="/info/ai-visibility.html">AI Visibility</a></li></ul></div>
        <div><h4>Company</h4><ul><li><a href="/about.html">About</a></li><li><a href="/blog/">Blog</a></li><li><a href="/contact.html">Contact</a></li></ul></div>
        <div><h4>Get in touch</h4><ul><li><a href="mailto:hello@kayco.net">hello@kayco.net</a></li><li><a href="/contact.html">Book an audit</a></li><li><span style="color:var(--grey-dim)">United Kingdom</span></li></ul></div>
      </div>
      <div class="footer__bottom">
        <p>&copy; <span data-year>2026</span> Kay &amp; Co. All rights reserved. UK SEO &amp; GEO consultancy.</p>
        <a class="footer__email" href="mailto:hello@kayco.net">hello@kayco.net</a>
      </div>
    </div>
  </footer>`;

const SCRIPTS = `  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
  <script src="/assets/js/main.js" defer></script>`;

/* ---------- Build full HTML page from model JSON ---------- */
function buildPage(data, { type, slug }) {
  const dir = type === 'blog' ? 'blog' : 'info';
  const url = `${SITE}/${dir}/${slug}.html`;
  const title = esc(data.title);
  const desc = escAttr(data.metaDescription);
  const tag = esc(data.tag || (type === 'blog' ? 'Article' : 'Guide'));
  const reading = esc(data.readingTime || '5 min read');
  const ogType = type === 'blog' ? 'article' : 'website';
  const schemaType = type === 'blog' ? 'BlogPosting' : 'Article';

  const sectionsHTML = (data.sections || []).map((s) =>
    `        <h2 class="reveal">${esc(s.heading)}</h2>\n        <div class="reveal">${s.html}</div>`
  ).join('\n');

  const faqItems = (data.faqs || []).map((f) =>
    `            <div class="faq__item reveal"><button class="faq__q" aria-expanded="false">${esc(f.q)}<span class="ico">+</span></button><div class="faq__a"><p>${esc(f.a)}</p></div></div>`
  ).join('\n');

  const faqSchema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: (data.faqs || []).map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };

  const articleSchema = {
    '@context': 'https://schema.org', '@type': schemaType,
    headline: data.title, description: data.metaDescription,
    datePublished: todayISO(), dateModified: todayISO(), inLanguage: 'en-GB',
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Kay & Co.', url: `${SITE}/` },
    publisher: { '@type': 'Organization', name: 'Kay & Co.', logo: { '@type': 'ImageObject', url: `${SITE}/assets/img/kayco-logo.svg` } }
  };

  const speakableSchema = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.article__header', '.article__body'] },
    url
  };
  const graphic = graphicForTopic(`${data.title || ''} ${data.tag || ''} ${topic || ''}`);

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

  <title>${title} | Kay &amp; Co.</title>
  <meta name="description" content="${desc}" />
  <meta name="author" content="Kay & Co." />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="Kay & Co." />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:locale" content="en_GB" />
  <meta property="og:image" content="${SITE}/assets/og/kayco-og.svg" />
  <meta name="twitter:card" content="summary_large_image" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/css/style.css" />

  <script type="application/ld+json">
${JSON.stringify(articleSchema, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(speakableSchema, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
  </script>
</head>
<body>

${NAV(type === 'blog' ? 'blog' : '')}

  <article>
    <header class="article__header" data-speakable>
      <div class="container">
        <span class="tag-pill reveal">${tag}</span>
        <h1 class="reveal">${title}</h1>
        <p class="article__meta reveal">By Kay &amp; Co.  /  ${todayHuman()}  /  ${reading}</p>
      </div>
    </header>

    <div class="article-visual reveal" aria-hidden="true">
      <img src="${graphic}" alt="" loading="eager" />
    </div>

    <div class="container">
      <div class="article article__body">
        <div class="reveal">${data.intro || ''}</div>
${sectionsHTML}

        <section data-speakable style="margin-top:3rem">
          <h2 class="reveal">Frequently asked questions</h2>
          <div class="faq" style="margin-top:1.5rem">
${faqItems}
          </div>
        </section>
      </div>
    </div>
  </article>

  <section>
    <div class="container">
      <div class="cta reveal">
        <h2>Ready to be <span class="gradient-text">found everywhere?</span></h2>
        <p>Kay &amp; Co. gets UK brands ranked on Google and cited by AI. Start with a visibility audit.</p>
        <div class="cta__actions"><a href="/contact.html" class="btn btn-primary">Book a visibility audit <span class="arrow">&rarr;</span></a><a href="/services/geo-optimization.html" class="btn btn-ghost">Explore GEO</a></div>
      </div>
    </div>
  </section>

${FOOTER}

${SCRIPTS}
</body>
</html>
`;
}

function graphicForTopic(text) {
  const haystack = String(text).toLowerCase();
  if (/(content|cluster|architecture|pillar|agency|strategy)/.test(haystack)) return '/assets/img/graphic-content-architecture.svg';
  if (/(perplexity|overview|future|visibility|ai search|console|gemini)/.test(haystack)) return '/assets/img/graphic-ai-search-console.svg';
  if (/(geo|chatgpt|llm|generative|citation|answer engine)/.test(haystack)) return '/assets/img/graphic-geo-network.svg';
  return '/assets/img/graphic-seo-system.svg';
}

/* ---------- Insert a card into /blog/index.html ---------- */
function updateBlogIndex(data, slug) {
  const file = path.join(ROOT, 'blog', 'index.html');
  if (!fs.existsSync(file)) { console.warn('! blog/index.html not found, skipping card insertion.'); return; }
  let html = fs.readFileSync(file, 'utf8');
  const marker = '<!-- POSTS:START -->';
  if (!html.includes(marker)) { console.warn('! POSTS:START marker not found in blog/index.html, skipping.'); return; }

  const card = `        <article class="post reveal" data-reveal-group="posts">
          <a href="/blog/${slug}.html" class="post__thumb" aria-label="${escAttr(data.title)}"><img src="${graphicForTopic(`${data.title || ''} ${data.tag || ''}`)}" alt="" loading="lazy" /><span class="tag">${esc(data.tag || 'Article')}</span></a>
          <div class="post__body">
            <div class="post__meta">Kay &amp; Co.  /  ${todayHuman()}</div>
            <h3><a href="/blog/${slug}.html">${esc(data.title)}</a></h3>
            <p>${esc(data.metaDescription)}</p>
            <a class="card__link" href="/blog/${slug}.html">Read article <span class="arrow">&rarr;</span></a>
          </div>
        </article>`;

  html = html.replace(marker, `${marker}\n${card}`);
  fs.writeFileSync(file, html, 'utf8');
  console.log(' Added post card to blog/index.html');
}

/* ---------- Add URL to sitemap.xml ---------- */
function updateSitemap(url) {
  const file = path.join(ROOT, 'sitemap.xml');
  const today = todayISO();
  const entry = `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`;

  if (!fs.existsSync(file)) { console.warn('! sitemap.xml not found, skipping.'); return; }
  let xml = fs.readFileSync(file, 'utf8');
  if (xml.includes(`<loc>${url}</loc>`)) { console.log('* URL already in sitemap, skipped.'); return; }
  xml = xml.replace('</urlset>', `${entry}\n</urlset>`);
  fs.writeFileSync(file, xml, 'utf8');
  console.log(' Added URL to sitemap.xml');
}

/* ---------- Main ---------- */
(async function main() {
  console.log(`\nKay & Co. content pipeline`);
  console.log(`   type:  ${type}`);
  console.log(`   topic: ${topic}\n`);

  console.log('Calling Claude (' + MODEL + ')...');
  const raw = await callClaude(buildPrompt(topic, type));
  const data = extractJSON(raw);

  const slug = slugify(data.slug || data.title || topic);
  data.slug = slug;

  const dir = type === 'blog' ? 'blog' : 'info';
  const outDir = path.join(ROOT, dir);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${slug}.html`);
  const pageHTML = buildPage(data, { type, slug });
  fs.writeFileSync(outFile, pageHTML, 'utf8');
  console.log(` Wrote ${dir}/${slug}.html`);

  if (type === 'blog') updateBlogIndex(data, slug);
  updateSitemap(`${SITE}/${dir}/${slug}.html`);

  console.log(`\nDone. Review the page, then run ./deploy.sh to publish.\n`);
})().catch((err) => {
  console.error('\nError, Generation failed:\n' + err.message + '\n');
  process.exit(1);
});
