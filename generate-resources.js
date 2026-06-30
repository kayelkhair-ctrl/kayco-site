#!/usr/bin/env node
/* ============================================================
   Kay & Co. resources feed generator
   ------------------------------------------------------------
   Scans blog posts and informational topics, derives a
   title/blurb/date/type for each, sorts newest-first, and
   injects feed rows between <!-- RESFEED:START/END --> markers:
     /resources/index.html            -> all resources

     node generate-resources.js          # write feeds
     node generate-resources.js --check  # fail if out of date
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Where each resource type lives and how it is labelled. */
const SOURCES = [
  { type: 'Blog', label: 'Blog', dir: 'blog', mode: 'flat' },
  { type: 'Topic', label: 'Topic', dir: 'info', mode: 'flat' },
];

/* Feed targets: file to write -> which types to include (null = all). */
const TARGETS = [
  { file: 'resources/index.html', types: null },
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function firstMatch(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function getTitle(html) {
  const h1 = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1);
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripTags(title).replace(/\s*[|]\s*Kay\s*(?:&amp;|&)\s*Co\.?\s*$/i, '').replace(/\s*[|]\s*KayCo\s*$/i, '').trim();
}

function getBlurb(html) {
  const desc = firstMatch(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  if (!desc) return 'Read this Kay &amp; Co. resource.';
  if (desc.length <= 160) return desc;
  const cut = desc.slice(0, 157);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim() + '...';
}

function getDate(html, file) {
  const iso = firstMatch(html, /"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/) ||
    firstMatch(html, /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso;
  try {
    const rel = path.relative(ROOT, file);
    const last = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(last)) return last;
  } catch { /* fall through */ }
  return fs.statSync(file).mtime.toISOString().slice(0, 10);
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function routeFor(rel, mode) {
  const p = rel.replace(/\\/g, '/');
  if (mode === 'nested') return `/${p.replace(/index\.html$/, '')}`; // .../slug/
  return `/${p.replace(/\.html$/, '')}`;                            // /blog/slug
}

function collect() {
  const items = [];
  for (const src of SOURCES) {
    const base = path.join(ROOT, src.dir);
    if (!fs.existsSync(base)) continue;
    if (src.mode === 'flat') {
      for (const name of fs.readdirSync(base)) {
        if (!name.endsWith('.html') || name === 'index.html') continue;
        const file = path.join(base, name);
        items.push(makeItem(file, src));
      }
    } else {
      for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const file = path.join(base, entry.name, 'index.html');
        if (fs.existsSync(file)) items.push(makeItem(file, src));
      }
    }
  }
  // Newest first; stable tiebreak by title.
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
  return items;
}

function makeItem(file, src) {
  const html = read(file);
  const rel = path.relative(ROOT, file);
  return {
    type: src.type,
    label: src.label,
    route: routeFor(rel, src.mode),
    title: getTitle(html),
    blurb: getBlurb(html),
    date: getDate(html, file),
  };
}

function renderRows(items) {
  return items.map((it) => {
    const date = it.type === 'Blog' ? `<span class="res-date">${fmtDate(it.date)}</span>` : '';
    return `        <a class="res-item reveal" href="${it.route}"><span class="res-kicker">${it.label}</span>${date}<h3>${it.title}</h3><p>${it.blurb}</p></a>`;
  }).join('\n');
}

function applyToFile(relFile, rows, checkOnly, results) {
  const file = path.join(ROOT, relFile);
  if (!fs.existsSync(file)) { results.errors.push(`${relFile}: missing target file`); return; }
  const html = read(file);
  const re = /(<!-- RESFEED:START -->)[\s\S]*?(<!-- RESFEED:END -->)/;
  if (!re.test(html)) { results.errors.push(`${relFile}: RESFEED markers not found`); return; }
  const next = html.replace(re, `$1\n${rows}\n        $2`);
  if (next === html) { results.unchanged++; return; }
  if (checkOnly) results.stale.push(relFile);
  else { fs.writeFileSync(file, next, 'utf8'); results.written++; }
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const items = collect();
  const results = { written: 0, unchanged: 0, stale: [], errors: [] };

  for (const t of TARGETS) {
    const subset = t.types ? items.filter((i) => t.types.includes(i.type)) : items;
    applyToFile(t.file, renderRows(subset), checkOnly, results);
  }

  if (results.errors.length) {
    console.error('Resource feed generation failed:');
    for (const e of results.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  if (checkOnly) {
    if (results.stale.length) {
      console.error(`Resource feeds out of date in: ${results.stale.join(', ')}. Run npm run resources.`);
      process.exit(1);
    }
    console.log(`Checked resource feeds (${items.length} items); up to date.`);
  } else {
    console.log(`Wrote resource feeds to ${results.written} file(s) from ${items.length} items.`);
  }
}

main();
