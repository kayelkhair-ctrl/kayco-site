# Kay & Co., kayco.net

Static website for **Kay & Co.**, a UK SEO and GEO (Generative Engine Optimisation) consultancy. The site is built with vanilla HTML, CSS, and JavaScript. The homepage hero uses a Canvas 2D network-graph animation (no library); GSAP (loaded from a CDN) drives the scroll animations. Design: light, bold, editorial — Barlow Condensed display type over Inter body, with orange used sparingly for emphasis.

## Project Structure

```text
kayco-site/
  index.html
  about.html
  contact.html
  404.html
  services/
    seo.html
    geo-optimization.html
  blog/
    index.html
    *.html
  info/
    *.html
  assets/
    css/style.css
    js/hero.js
    js/main.js
    img/
    og/
  generate-page.js
  deploy.sh
  sitemap.xml
  robots.txt
  package.json
  README.md
```

## Local Preview

No build step is required. Serve the folder with any static server:

```bash
npx serve .
```

or:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Contact Form

The contact page posts to `/api/contact`, which is handled by a Cloudflare Pages Function in `functions/api/contact.js`. Visitors submit the form in the browser and no email app is opened.

Set these Cloudflare Pages environment variables before expecting live submissions to send:

```text
RESEND_API_KEY=re_...
CONTACT_TO_EMAIL=hello@kayco.net
CONTACT_FROM_EMAIL=Kay & Co. <hello@kayco.net>
```

`CONTACT_FROM_EMAIL` must use a sender or domain verified in Resend. Keep the Resend API key in Cloudflare only, never in the repo.

## Setting `ANTHROPIC_API_KEY`

The content pipeline calls the Claude API and reads your key from the environment. Do not commit the key.

macOS or Linux:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Windows PowerShell:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

Persistent Windows user setting:

```powershell
setx ANTHROPIC_API_KEY "sk-ant-..."
```

Restart the terminal after `setx`.

## Generating Pages

Requires Node 18+.

```bash
node generate-page.js --type=blog --topic="How to get cited by ChatGPT"
node generate-page.js --type=info --topic="Technical SEO checklist for 2026"
```

Shortcut npm scripts:

```bash
npm run blog -- --topic="How to get cited by ChatGPT"
npm run info -- --topic="Technical SEO checklist for 2026"
```

The pipeline:

1. Prompts Claude as the Kay & Co. content strategist.
2. Builds a complete HTML page using the same nav, footer, CSS, metadata, and schema.
3. Saves blog pages to `/blog/<slug>.html` and evergreen pages to `/info/<slug>.html`.
4. Adds blog cards to `/blog/index.html`.
5. Adds the new URL to `sitemap.xml`.

Generated pages include optimised titles, meta descriptions, canonical tags, Open Graph tags, JSON-LD, FAQ schema, Speakable schema, and a clean H1/H2 structure.

## Publishing

`deploy.sh` stages, commits, and pushes to `main`:

```bash
./deploy.sh
```

On Windows, run it through Git Bash or run the git commands manually:

```powershell
git add .
git commit -m "Auto-update"
git push origin main
```

Cloudflare Pages rebuilds from `main`.

## SEO And GEO

Every page includes SEO fundamentals and GEO-specific structure: entity-rich copy, UK-focused positioning, internal links, FAQ sections, schema, clean headings, and citation-friendly answer blocks. `robots.txt` points to the sitemap and allows major search and AI crawlers.

(c) Kay & Co., UK SEO and GEO optimisation consultancy.
