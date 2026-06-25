# Working notes

Shared scratchpad for whoever picks this repo up next (Claude, Codex, or you). Not a changelog — git already has that. This is for things that aren't finished yet, or that aren't obvious from a diff. Trim entries once they're resolved/shipped; don't let this grow into a log.

## Current focus
- Content expansion pass: new guides, checklists, topics and blog work should stay grounded in Semrush UK keyword evidence and avoid fake "best/top agency" ranking energy.
- Resource schema rule: blog posts should use `NewsArticle`; guides, checklists and topics should use `Article`.
- Resource date display rule: show visible dates on blog cards only. Do not show visible dates for guides, checklists or topics.
- Mobile PageSpeed pass (self-hosted fonts, image compression, removed hero.js/GSAP) — just landed, watch for regressions on real mobile devices.

## Open threads / known issues
- Fix images that look off. Prefer abstract/graphic assets that match the Kayco visual system; avoid awkward cropped/generated images, people, animals or decorative visuals that do not explain the page.

## Decisions to not re-litigate
- Hero is a static navy gradient, not animated — Codex removed the Canvas/GSAP hero for mobile speed, user confirmed keep it static.
- No topbar — tried and removed at user's request.
- No fabricated stats/citation-share numbers in copy.
- Homepage hero copy + meta keywords are user-owned — don't change without asking.
