#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

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

async function main() {
  const args = parseArgs(process.argv);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Add it as a GitHub Actions repository secret to generate blog images.');
  }

  const topic = args.topic || args.keyword || 'SEO and GEO strategy';
  const keyword = args.keyword || topic;
  const slug = slugify(args.slug || topic);
  const outDir = path.join(ROOT, 'assets', 'img', 'blog', 'generated');
  const outFile = path.join(outDir, `${slug}.jpg`);
  fs.mkdirSync(outDir, { recursive: true });

  const prompt = `Use case: ads-marketing
Asset type: editorial blog hero image for Kay & Co., a UK SEO and GEO consultancy
Primary request: Create a premium editorial image for a blog article about "${topic}".
Subject: abstract AI search visibility, search rankings, content architecture, and brand citations, expressed through realistic screens, search surfaces, data layers, and connected knowledge graph elements.
Style/medium: polished photorealistic editorial technology image, sophisticated consultancy website asset, not cartoon, not generic stock.
Composition/framing: landscape 3:2 composition, strong central visual focus, enough clean edges for responsive cropping.
Lighting/mood: bright, confident, modern, high-trust, commercially polished.
Color palette: neutral light workspace tones with controlled black, white, lime, and warm orange accents that suit Kay & Co.'s brand.
Text: no readable text, no logos, no UI brand names.
Constraints: must feel specific to SEO, GEO, AI search, and UK business visibility; no people; no hands; no watermarks; no garbled text. Focus keyword context: "${keyword}".`;

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      size: '1536x1024',
      quality: 'medium',
      output_format: 'jpeg',
      output_compression: 86
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI image generation failed ${res.status}: ${body}`);
  }

  const data = await res.json();
  const imageBase64 = data.data && data.data[0] && data.data[0].b64_json;
  if (!imageBase64) throw new Error('OpenAI image generation returned no b64_json image data.');
  fs.writeFileSync(outFile, Buffer.from(imageBase64, 'base64'));

  console.log(JSON.stringify({
    path: `/assets/img/blog/generated/${slug}.jpg`,
    file: path.relative(ROOT, outFile).replace(/\\/g, '/'),
    prompt
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
