#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const KEYWORDS_FILE = path.join(ROOT, 'data', 'semrush-keywords.json');
const STATE_FILE = path.join(ROOT, 'data', 'content-automation-state.json');

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (a.startsWith('--')) args[a.slice(2)] = true;
  }
  return args;
}

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/['"\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function htmlFiles(type) {
  const dir = path.join(ROOT, type === 'info' ? 'info' : 'blog');
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(dir, name));
}

function pageText(file) {
  return fs.readFileSync(file, 'utf8').toLowerCase();
}

function expectedSlugs(item) {
  return new Set([
    slugify(item.topic || ''),
    slugify(item.primaryKeyword || ''),
    slugify(String(item.topic || '').replace(/\bin the\b/gi, '')),
    slugify(String(item.topic || '').replace(/\buk\b/gi, '')),
    slugify(`${item.primaryKeyword || ''} uk`)
  ].filter(Boolean));
}

function existingContentFile(item, type) {
  const slugs = expectedSlugs(item);
  for (const file of htmlFiles(type)) {
    if (path.basename(file) === 'index.html') continue;
    const slug = path.basename(file, '.html');
    if (slugs.has(slug)) return file;
  }
  const keyword = String(item.primaryKeyword || '').toLowerCase();
  if (!keyword) return null;
  return htmlFiles(type).find((file) => {
    if (path.basename(file) === 'index.html') return false;
    const html = pageText(file);
    return html.includes(`<link rel="canonical" href="https://www.kayco.net/${type === 'info' ? 'info' : 'blog'}/`) &&
      html.includes(keyword);
  }) || null;
}

function pickKeyword(queue, state, args) {
  if (args.keyword) {
    return queue.find((item) => item.primaryKeyword === args.keyword) || {
      primaryKeyword: args.keyword,
      topic: args.topic || args.keyword,
      cluster: 'Manual',
      intent: 'manual'
    };
  }
  const used = new Set(state.usedKeywords || []);
  const type = args.type || 'blog';
  const candidates = queue.filter((item) => !used.has(item.primaryKeyword) && !existingContentFile(item, type));
  if (!candidates.length) return null;
  return candidates
    .slice()
    .sort((a, b) => {
      const aScore = (a.searchVolume || 0) / Math.max(1, a.keywordDifficulty || 1);
      const bScore = (b.searchVolume || 0) / Math.max(1, b.keywordDifficulty || 1);
      return bScore - aScore;
    })[0];
}

function generateImage(item, args) {
  if (args['skip-image']) return null;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing. Add it as a GitHub Actions repository secret so gpt-image-2 can create a fresh blog image.');
  }
  const image = spawnSync(process.execPath, [
    'generate-blog-image.js',
    `--topic=${args.topic || item.topic}`,
    `--keyword=${item.primaryKeyword}`
  ], { cwd: ROOT, encoding: 'utf8', env: process.env });
  process.stdout.write(image.stdout || '');
  process.stderr.write(image.stderr || '');
  if (image.status !== 0) process.exit(image.status || 1);
  return JSON.parse(image.stdout);
}

function main() {
  const args = parseArgs(process.argv);
  const keywordData = readJSON(KEYWORDS_FILE, { keywords: [] });
  const state = readJSON(STATE_FILE, { usedKeywords: [], runs: [] });
  const item = pickKeyword(keywordData.keywords || [], state, args);

  if (!item) {
    throw new Error('No keyword candidates found in data/semrush-keywords.json');
  }

  const secondary = (args.secondary || [
    item.cluster,
    'Kay & Co.',
    'UK SEO and GEO consultancy'
  ].filter(Boolean).join(','));
  const generatedImage = generateImage(item, args);
  const type = args.type || 'blog';
  const beforeFiles = new Map(htmlFiles(type).map((file) => [file, fs.statSync(file).mtimeMs]));

  const generateArgs = [
    'generate-page.js',
    `--type=${type}`,
    `--topic=${args.topic || item.topic}`,
    `--primary-keyword=${item.primaryKeyword}`,
    `--secondary-keywords=${secondary}`,
    ...(generatedImage ? [`--image=${generatedImage.path}`, `--image-alt=${item.primaryKeyword}`] : []),
    '--rankmath'
  ];

  console.log(`Generating Rank Math-targeted page for "${item.primaryKeyword}"`);
  const generated = spawnSync(process.execPath, generateArgs, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (generated.status !== 0) process.exit(generated.status || 1);

  const changedFiles = htmlFiles(type)
    .filter((file) => path.basename(file) !== 'index.html')
    .filter((file) => !beforeFiles.has(file) || fs.statSync(file).mtimeMs !== beforeFiles.get(file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const outFile = changedFiles[0] || existingContentFile(item, type);
  if (!outFile) throw new Error(`Could not identify generated page for "${item.primaryKeyword}".`);

  const audit = spawnSync(process.execPath, [
    'rankmath-audit.js',
    `--file=${path.relative(ROOT, outFile)}`,
    `--keyword=${item.primaryKeyword}`
  ], { cwd: ROOT, encoding: 'utf8' });
  process.stdout.write(audit.stdout);
  process.stderr.write(audit.stderr);
  if (audit.status !== 0) process.exit(audit.status || 1);

  const result = JSON.parse(audit.stdout);
  state.usedKeywords = Array.from(new Set([...(state.usedKeywords || []), item.primaryKeyword]));
  state.runs = [
    {
      date: new Date().toISOString(),
      keyword: item.primaryKeyword,
      topic: args.topic || item.topic,
      file: path.relative(ROOT, outFile).replace(/\\/g, '/'),
      image: generatedImage ? generatedImage.file : null,
      rankMathScore: result.score
    },
    ...(state.runs || [])
  ].slice(0, 50);
  writeJSON(STATE_FILE, state);

  if (result.score < 100) {
    console.warn(`Rank Math audit scored ${result.score}/100. Review failed checks above before publishing.`);
    process.exit(args.strict ? 1 : 0);
  }
}

main();
