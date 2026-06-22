# Kay & Co., kayco.net

Static website for **Kay & Co.**, a UK SEO and GEO (Generative Engine Optimisation) consultancy. The site is built with vanilla HTML, CSS, and JavaScript. The homepage hero uses a Canvas 2D network-graph animation (no library); GSAP (loaded from a CDN) drives the scroll animations. Design: light, bold, editorial, with Barlow Condensed display type over Inter body and orange used sparingly for emphasis.

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

## Sitemap And Indexing

The sitemap is generated automatically from public, indexable HTML pages:

```bash
npm run sitemap
npm run sitemap:check
```

After publishing new pages, deploy the site, check `https://www.kayco.net/sitemap.xml`, then submit the sitemap once in Google Search Console. For important new pages, use URL Inspection and click Request indexing.

Google does not have a general instant-indexing API for normal blog or service pages. Do not use the Google Indexing API unless the page is eligible content such as `JobPosting` or livestream `BroadcastEvent` pages.

## SEO And GEO

Every page includes SEO fundamentals and GEO-specific structure: entity-rich copy, UK-focused positioning, internal links, FAQ sections, schema, clean headings, and citation-friendly answer blocks. `robots.txt` points to the sitemap and allows major search and AI crawlers.

(c) Kay & Co., UK SEO and GEO optimisation consultancy.
