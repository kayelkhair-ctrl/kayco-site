#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (a.startsWith('--')) args[a.slice(2)] = true;
  }
  return args;
}

function stripTags(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMatch(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9]+/g, ' ').trim();
}

function countOccurrences(text, needle) {
  const haystack = normalize(text);
  const target = normalize(needle);
  if (!target) return 0;
  return haystack.split(target).length - 1;
}

function wordCount(text) {
  return (text.match(/\b[\w']+\b/g) || []).length;
}

function add(checks, name, pass, points, detail) {
  checks.push({ name, pass: Boolean(pass), points: pass ? points : 0, max: points, detail });
}

function audit(file, keyword) {
  const html = fs.readFileSync(file, 'utf8');
  const bodyMatch = html.match(/<div class="article article__body">([\s\S]*?)<\/div>\s*<\/div>\s*<\/article>/i);
  const articleHtml = bodyMatch ? bodyMatch[1] : html;
  const text = stripTags(articleHtml);
  const title = stripTags(getMatch(html, /<title>([\s\S]*?)<\/title>/i));
  const h1 = stripTags(getMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  const desc = getMatch(html, /<meta\s+name="description"\s+content="([^"]+)"/i);
  const canonical = getMatch(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const slug = canonical.split('/').filter(Boolean).pop() || path.basename(file, '.html');
  const headings = [...articleHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripTags(m[1]));
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const altTexts = images.map((img) => getMatch(img, /\salt="([^"]*)"/i));
  const internalLinks = [...html.matchAll(/<a\s+[^>]*href="\/(?!\/)[^"]*"/gi)];
  const externalLinks = [...html.matchAll(/<a\s+[^>]*href="https?:\/\/(?!kayco\.net|www\.kayco\.net)[^"]*"/gi)];
  const paragraphs = [...articleHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripTags(m[1]));
  const firstParagraph = paragraphs[0] || '';
  const words = wordCount(text);
  const keywordUses = countOccurrences(text, keyword);
  const density = words ? (keywordUses / words) * 100 : 0;
  const checks = [];

  add(checks, 'Primary keyword in SEO title', normalize(title).includes(normalize(keyword)), 8, title);
  add(checks, 'Primary keyword in first half of title', normalize(title.slice(0, Math.ceil(title.length / 2))).includes(normalize(keyword)), 7, title);
  add(checks, 'Primary keyword in meta description', normalize(desc).includes(normalize(keyword)), 8, desc);
  add(checks, 'Primary keyword in URL slug', normalize(slug).includes(normalize(keyword)), 7, slug);
  add(checks, 'Primary keyword in H1', normalize(h1).includes(normalize(keyword)), 7, h1);
  add(checks, 'Primary keyword in first paragraph', normalize(firstParagraph).includes(normalize(keyword)), 7, firstParagraph.slice(0, 160));
  add(checks, 'Primary keyword in at least one H2', headings.some((h) => normalize(h).includes(normalize(keyword))), 6, headings.join(' | '));
  add(checks, 'Primary keyword in image alt text', altTexts.some((alt) => normalize(alt).includes(normalize(keyword))), 5, altTexts.join(' | '));
  add(checks, 'Long-form content, 2500+ words', words >= 2500, 10, `${words} words`);
  add(checks, 'Keyword density between 1.0% and 2.5%', density >= 1 && density <= 2.5, 8, `${density.toFixed(2)}%`);
  add(checks, 'Short URL slug', slug.length <= 75, 4, `${slug.length} characters`);
  add(checks, 'Table of contents present', /class="toc"|Table of contents/i.test(html), 5, 'TOC check');
  add(checks, 'At least 4 images or media items', images.length >= 4, 5, `${images.length} images`);
  add(checks, 'Internal links present', internalLinks.length >= 3, 4, `${internalLinks.length} internal links`);
  add(checks, 'External authority links present', externalLinks.length >= 1, 3, `${externalLinks.length} external links`);
  add(checks, 'No paragraph over 120 words', paragraphs.every((p) => wordCount(p) <= 120), 4, 'Paragraph length check');
  add(checks, 'Positive or power word in title', /\b(best|practical|proven|powerful|complete|ultimate|essential|smart|winning|trusted|guide|checklist|framework)\b/i.test(title), 2, title);

  const score = checks.reduce((sum, check) => sum + check.points, 0);
  return { score, keyword, file, checks };
}

const args = parseArgs(process.argv);
if (!args.file || !args.keyword) {
  console.error('Usage: node rankmath-audit.js --file=blog/example.html --keyword="focus keyword"');
  process.exit(1);
}

const result = audit(path.resolve(args.file), args.keyword);
console.log(JSON.stringify(result, null, 2));
if (args.strict && result.score < 100) process.exit(1);
