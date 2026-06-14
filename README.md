# Kay & Co. — kayco.net

The website for **Kay & Co.**, a UK-based **SEO and GEO (Generative Engine Optimization)** consultancy. We get UK brands ranked on Google and cited by AI answer engines such as **ChatGPT, Perplexity, and Google Gemini**.

Built as a **zero-build static site**: vanilla HTML, CSS, and JavaScript, with **Three.js** (interactive particle hero) and **GSAP** (scroll animations) loaded from a CDN. It includes an **automated, AI-powered content pipeline** that generates new on-brand pages with the Claude API.

---

## 📁 Project structure

```
kayco-site/
├── index.html                      # Homepage (Three.js hero, services, GEO, stats, FAQ)
├── about.html                      # About Kay & Co.
├── contact.html                    # Contact page + form
├── 404.html                        # Custom not-found page
├── services/
│   ├── seo.html                    # SEO service page
│   └── geo-optimization.html       # GEO service page (flagship)
├── blog/
│   ├── index.html                  # Blog listing (auto-updated by the pipeline)
│   └── *.html                      # Individual articles
├── info/                           # Evergreen info pages (created by the pipeline)
├── assets/
│   ├── css/style.css               # Full design system
│   └── js/
│       ├── hero.js                 # Three.js interactive particle field
│       └── main.js                 # Nav, GSAP reveals, counters, tilt, FAQ, form
├── generate-page.js                # AI content pipeline (Claude API)
├── deploy.sh                       # Commit + push (triggers Cloudflare Pages)
├── sitemap.xml                     # Auto-updated by the pipeline
├── robots.txt                      # Points to sitemap; welcomes AI crawlers
├── package.json
└── README.md
```

---

## 🚀 Local preview

No build step is required. Serve the folder with any static server:

```bash
# Option A — Node (no install)
npx serve .

# Option B — Python
python -m http.server 8000
```

Then open `http://localhost:8000` (or the port shown). Opening `index.html` directly via `file://` mostly works, but a local server is recommended so the root-absolute paths (`/assets/...`) resolve correctly.

---

## 🔑 Setting the `ANTHROPIC_API_KEY`

The content pipeline calls the Claude API and reads your key from the environment. **Never commit the key** — `.env` and `*.local` are git-ignored.

**macOS / Linux (bash/zsh):**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

**Windows — PowerShell (current session):**
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

**Windows — PowerShell (persist for your user):**
```powershell
setx ANTHROPIC_API_KEY "sk-ant-..."   # restart the terminal after running
```

Get a key from the [Anthropic Console](https://console.anthropic.com/).

---

## 🤖 Generating pages with `generate-page.js`

Requires **Node 18+** (uses built-in `fetch`; no npm dependencies). The script uses the **`claude-sonnet-4-6`** model.

```bash
# A blog article  → saved to /blog/<slug>.html
node generate-page.js --type=blog --topic="How to get cited by ChatGPT"

# An evergreen info page → saved to /info/<slug>.html
node generate-page.js --type=info --topic="Technical SEO checklist for 2026"
```

Shortcut npm scripts are also available:
```bash
npm run blog -- --topic="How to get cited by ChatGPT"
npm run info -- --topic="Technical SEO checklist for 2026"
```

### What the pipeline does

1. **Prompts Claude** as the Kay & Co. content strategist to write expert-level, citation-friendly, entity-rich SEO/GEO content, returned as structured JSON.
2. **Assembles a full HTML page** from the site template — identical CSS, nav, and footer — so design stays consistent. Every generated page includes:
   - optimised `<title>` and meta description
   - canonical + Open Graph + Twitter tags
   - `BlogPosting`/`Article` JSON-LD schema
   - an FAQ section with `FAQPage` schema
   - `Speakable` schema on key content
   - clean H1 → H2 hierarchy
3. **Saves** the page to `/blog/<slug>.html` (blog) or `/info/<slug>.html` (info).
4. **Updates `/blog/index.html`** — inserts a new post card at the `<!-- POSTS:START -->` marker (blog type only).
5. **Updates `sitemap.xml`** — adds the new URL.

Review the generated page, then publish.

---

## 📤 Publishing with `deploy.sh`

`deploy.sh` stages everything, commits with a timestamp, and pushes to `main`:

```bash
./deploy.sh
```

> First time on macOS/Linux: `chmod +x deploy.sh`.
> On Windows, run it via Git Bash, or run the three git commands manually:
> ```powershell
> git add .
> git commit -m "Auto-update"
> git push origin main
> ```

**Cloudflare Pages** is connected to this repository and rebuilds automatically on every push to `main` (typically live in ~60 seconds).

---

## 🔄 End-to-end auto-publishing flow

```
node generate-page.js --type=blog --topic="..."
        │
        ├─ Claude API writes on-brand content (claude-sonnet-4-6)
        ├─ Full HTML page written to /blog/<slug>.html
        ├─ Post card inserted into /blog/index.html
        └─ URL added to sitemap.xml
        │
./deploy.sh
        │
        ├─ git add / commit / push origin main
        └─ Cloudflare Pages rebuilds → live on kayco.net (~60s)
```

So a new, fully optimised, indexable page goes from a single topic string to live on the web in two commands.

---

## 🎨 Design notes

- **Palette:** near-black `#050508`, electric blue `#2D6CFF`, deep orange `#FF5C1A`, white `#F0F0F0`, grey `#8A8A9A`.
- **Font:** Inter (Google Fonts).
- **Hero:** full-viewport Three.js particle field (2,000+ particles) that drifts toward the cursor, repels on click, forms a constellation network, carries floating 3D "Kay & Co." text, and disperses on scroll.
- **Motion:** GSAP ScrollTrigger reveals, animated stat counters, and 3D tilt on cards. Everything degrades gracefully if a CDN fails or `prefers-reduced-motion` is set.

---

## 🔍 SEO & GEO built in

Every page ships with optimised titles and meta descriptions, canonical tags, Open Graph/Twitter cards, JSON-LD schema (`Organization`, `Service`, `Blog`/`BlogPosting`, `FAQPage`, `Speakable`, `BreadcrumbList`), a clean heading hierarchy, and entity-rich, citation-friendly copy. `robots.txt` explicitly welcomes AI answer-engine crawlers (GPTBot, PerplexityBot, Google-Extended, ClaudeBot, and others) — because being cited by AI is the whole point.

---

© Kay & Co. — UK SEO & GEO optimization consultancy.
