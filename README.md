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

## Semrush And Rank Math Automation

Semrush keyword opportunities are stored in `data/semrush-keywords.json`. The first pull checked `kayco.net` in the UK organic database, found no current ranking keyword rows, then used Semrush keyword discovery around Kay & Co.'s SEO, GEO, and AI-search themes.

Run the automated content queue:

```bash
npm run content:auto
```

Or force a specific keyword and topic:

```bash
npm run content:auto -- --keyword="generative engine optimisation" --topic="Generative engine optimisation for UK businesses"
```

The automation:

1. Picks the best unused Semrush keyword opportunity.
2. Generates a blog page with the primary focus keyword passed into the prompt.
3. Applies Rank Math-style requirements: focus keyword in title, meta description, slug, H1, first paragraph, H2, image alt text, plus long-form copy, table of contents, internal links, external links, short paragraphs, FAQ schema, and at least four media items.
4. Runs `rankmath-audit.js` and stores the result in `data/content-automation-state.json`.

Audit any generated page manually:

```bash
npm run rankmath:audit -- --file=blog/example.html --keyword="focus keyword"
```

GitHub Actions workflow `.github/workflows/semrush-rankmath-content.yml` runs the queue every day at 08:00 GMT/UTC and can also be triggered manually. Add `ANTHROPIC_API_KEY` as a repository secret before enabling it.

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
