# GEO Audit Report: LexiClash

**Audit Date:** 2026-04-18
**URL:** https://www.lexiclash.live
**Business Type:** SaaS / Web Game (B2C gaming platform — hybrid consumer app + publisher via blog/FAQ content)
**Pages Analyzed:** 18 (homepage, 5 locale variants, multiplayer, singleplayer, adventure, party, ranked, blog index + 3 posts, FAQ, about, privacy, terms)

---

## Status re-verified 2026-08-02 (live fetch, no code changed)

The findings below are from **2026-04-18** and are partly stale. Re-checked against
`https://www.lexiclash.live` on 2026-08-02:

**Fixed** — 1 (`/sitemap.xml` → 200 `application/xml`, 456 `<url>` entries with `xhtml:link`
alternates; regression-guarded by `fe-next/app/sitemap.test.ts`) · 3 (homepage has 1 `<h1>`) ·
4 (`hrefLang` links present: 6 locales `en/he/sv/ja/es/ru` + `x-default` + `ru-RU` alias) ·
6 (robots.txt names 24 crawlers; GPTBot / ClaudeBot / PerplexityBot each get
`Allow: /` + `Disallow: /api/`, so the welcome signal is explicit) · 7 (`/en/multiplayer` has
an `<h1>`) · 8 (single viewport meta) · 9 (title 56c, description ~152c) ·
14 (`FAQPage` JSON-LD present on `/en/faq`) · 15 (`BreadcrumbList` present on the nested
`/en/multiplayer`) · 18 (`/llms-full.txt` → 200, 15KB).

**Partial** — 5: `sameAs` now 4 entries (self, Instagram, Play Store, CrazyGames); LinkedIn /
YouTube / Product Hunt still absent.

**Superseded — do not implement:**
- **11 `aggregateRating`** — deliberately omitted. Hardcoded ratings risk a Google manual
  action; see `fe-next/app/[locale]/layout.tsx:307` and the guard test
  `fe-next/lib/seo/__tests__/teacherUpgradeJsonLd.test.ts`. Only real first-party reviews qualify.
- **24 `X-Frame-Options: SAMEORIGIN`** — CSP `frame-ancestors` intentionally allows
  `crazygames.com` and `poki.com`; an XFO header would break portal distribution.

**Still open (verified absent in source):** 12 (`WebSite` + `potentialAction` SearchAction).

**Appendix stale** — `/en/party` and `/en/ranked` now return 404 (those modes were removed);
locale count is 6, not 5 (`ru` added).

**Scores not recomputed** — the 41/100 table below still reflects the 2026-04-18 crawl.
Off-site items (2, 19, 20) were not verifiable from here.

---

## Executive Summary

**Overall GEO Score: 41/100 (Poor — borderline Fair)**

LexiClash has a solid technical foundation (Next.js 16 SSR, clean robots.txt, present `llms.txt`) but is largely invisible to AI systems as a recognized entity. Critical gaps: broken `sitemap.xml` (SPA catchall returns HTML, not XML), no hreflang for 5 locales, near-zero third-party entity signals (no Wikipedia, no LinkedIn company page, thin `sameAs`), and content lacking author attribution or citation-worthy answer blocks. Fix the sitemap + hreflang + schema `sameAs` in week 1 and the score jumps ~15 points with no new content work.

`★ Insight ─────────────────────────────────────`
- GEO weights brand entity recognition at 20% — a technically perfect site with no Wikipedia/LinkedIn presence still caps around 70. LexiClash's tech debt is minor; its authority debt is the blocker.
- `llms.txt` helps discovery but is not a substitute for schema. AI crawlers read both; schema drives entity graph, `llms.txt` drives page selection.
- Next.js 16 App Router's `app/sitemap.ts` generates XML at build — the current 619KB HTML response is the SPA catchall swallowing `/sitemap.xml`. Standard Next.js gotcha.
`─────────────────────────────────────────────────`

### Score Breakdown

| Category | Score | Weight | Weighted |
|---|---|---|---|
| AI Citability | 31/100 | 25% | 7.75 |
| Brand Authority | 18/100 | 20% | 3.60 |
| Content E-E-A-T | 52/100 | 20% | 10.40 |
| Technical GEO | 61/100 | 15% | 9.15 |
| Schema & Structured Data | 58/100 | 10% | 5.80 |
| Platform Optimization | 41/100 | 10% | 4.10 |
| **Overall GEO Score** | | | **40.80 → 41/100** |

---

## Critical Issues (Fix Immediately)

1. **Broken `sitemap.xml`** — `https://www.lexiclash.live/sitemap.xml` returns 619KB HTML (SPA catchall), not XML. AI crawlers and search engines cannot discover pages. **Fix:** create `fe-next/app/sitemap.ts` exporting MetadataRoute.Sitemap with all locale routes.
2. **Brand entity unrecognized** — LexiClash does not appear on Wikipedia, LinkedIn Company, Crunchbase, or Product Hunt. AI models have no canonical entity record. **Fix:** create LinkedIn Company page + Product Hunt launch + submit Wikidata entry within 2 weeks.
3. **Multiple H1 tags on homepage** — structural HTML error confuses AI summarization. **Fix:** single H1 per page, demote duplicates to H2.

## High Priority Issues (Within 1 Week)

4. **No hreflang** — `fe-next/app/[locale]/layout.tsx` missing `alternates.languages` in generateMetadata. 5 locales (en/he/sv/ja/es) invisible as variants; AI picks wrong language for non-English users.
5. **Thin `sameAs` in Organization schema** — only Instagram + self-URL. **Fix:** add LinkedIn, Twitter/X, YouTube, Product Hunt, Crunchbase once live.
6. **No AI-crawler-explicit robots.txt directives** — relies on `User-Agent: *`. **Fix:** add explicit `Allow` blocks for GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Bingbot to signal welcome.
7. **`/en/multiplayer` missing H1** — primary heading is H2.
8. **Duplicate `<meta name="viewport">`** on homepage.
9. **Homepage title 72 chars** (cap 60); **description 213 chars** (cap 160) — truncates in AI citations.
10. **No author byline on blog posts** — E-E-A-T "Experience" signal absent. **Fix:** add `Person` schema + bio page per author.

## Medium Priority Issues (Within 1 Month)

11. **No `aggregateRating` on VideoGame schema** — AI systems skip games without review signals. Add review collection + schema.
12. **No `WebSite` schema with `potentialAction` SearchAction** — missing sitelinks searchbox opportunity.
13. **Blog posts lack `Article` schema** with `datePublished`, `author`, `publisher`.
14. **FAQ page not wrapped in `FAQPage` schema** despite having Q/A content — free citability win.
15. **No `BreadcrumbList` schema** on nested pages.
16. **Game mode pages (`/adventure`, `/party`, `/ranked`) have <300 words** — insufficient for AI extraction.
17. **No citations/sources** on educational blog posts (vocabulary science, word origin posts).
18. **`llms.txt` present but missing `llms-full.txt`** — limits deep-context ingestion.
19. **No Bing Webmaster Tools verification** — Bing Copilot blind to site.
20. **YouTube channel absent** — Gemini/ChatGPT weight video heavily for game entities.

## Low Priority Issues

21. Minor schema validation warnings (missing `priceRange` on Organization).
22. Some blog post images missing descriptive alt text.
23. Open Graph `og:image` dimensions unspecified (LinkedIn prefers 1200x627).
24. Missing `X-Frame-Options: SAMEORIGIN` explicit header in `next.config.ts`.
25. Hebrew (RTL) locale missing `dir="rtl"` confirmation in some nested routes.
26. No `speakable` schema properties on how-to-play content.
27. Footer lacks dedicated "About" sub-nav for crawlers.

---

## Category Deep Dives

### AI Citability (31/100)
Homepage copy is marketing-voice ("Battle friends in 5 languages!") — evocative but non-extractable. AI systems cite declarative, fact-dense sentences. Pages average 2.1 citable blocks vs. target 8+. **Rewrite pattern:** swap "Challenge your friends to epic word battles" → "LexiClash is a free multiplayer word game supporting 5 languages (English, Hebrew, Swedish, Japanese, Spanish) with 4 modes: Multiplayer, Adventure, Party, and Ranked." Add a "Quick Facts" block on each mode page.

### Brand Authority (18/100)
Third-party entity signals effectively zero. Reddit: 3 mentions in r/WordGames (organic, thin). YouTube: 0 channel. Wikipedia: 0. LinkedIn Company: 0. Crunchbase: 0. Product Hunt: 0. G2/Capterra: N/A (consumer). This is the single highest-leverage category — AI models cite entities they recognize, and recognition comes from cross-platform corroboration.

### Content E-E-A-T (52/100)
Blog has 12 posts, decent depth (~800 words avg) but zero author attribution, zero source citations, zero credentials. "About" page exists but is marketing copy, no team/founder bio. Trust signals present: privacy policy, terms, cookie consent (GDPR). Freshness OK — 4 posts in last 90 days.

### Technical GEO (61/100)
Strengths: Next.js 16 SSR (fully rendered HTML), clean robots.txt, HTTPS, HSTS, good Core Web Vitals (LCP 1.8s, INP 140ms, CLS 0.04), `llms.txt` present and well-formed. Weaknesses: broken sitemap, no hreflang, no explicit AI bot rules, duplicate viewport meta, missing X-Frame-Options.

### Schema & Structured Data (58/100)
Present: Organization, VideoGame, WebApplication (homepage JSON-LD). Missing: `aggregateRating`, `sameAs` expansion, `FAQPage`, `Article` on blog, `BreadcrumbList`, `HowTo` for game rules, `WebSite`+SearchAction, `Person` for authors. Schemas that are present validate cleanly via schema.org validator.

### Platform Optimization (41/100)
Per-platform readiness (avg 41): Google AI Overviews 52 (strongest — SSR + schema help), ChatGPT Search 33, Perplexity 38, Gemini 40, Bing Copilot 42. Bing penalty: no Webmaster Tools verification detected. ChatGPT penalty: sparse third-party mentions. Perplexity penalty: no Reddit/YouTube citations.

---

## Quick Wins (This Week)

1. **Create `fe-next/app/sitemap.ts`** — fixes sitemap.xml, ~10 min. Largest single-fix impact on Technical + Platform scores.
2. **Add hreflang to `generateMetadata` in `app/[locale]/layout.tsx`** — `alternates.languages` with all 5 locales, ~15 min.
3. **Expand Organization `sameAs`** in homepage JSON-LD — add all owned social URLs (even if empty profiles, create them first).
4. **Trim homepage title to ≤60 chars, description to ≤160 chars.**
5. **Add explicit AI-bot Allow rules to robots.txt** — GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Bingbot.
6. **Verify Bing Webmaster Tools** — unlocks Bing Copilot visibility.
7. **Fix multi-H1 on homepage; add H1 to `/en/multiplayer`.**

## 30-Day Action Plan

### Week 1: Technical Foundations
- [ ] Ship `app/sitemap.ts` + verify XML response
- [ ] Add hreflang via `alternates.languages`
- [ ] Rewrite homepage `<title>` and `<meta description>` to spec
- [ ] Fix H1 hierarchy on homepage + multiplayer
- [ ] Remove duplicate viewport meta
- [ ] Add explicit AI crawler Allow directives to robots.txt
- [ ] Register Bing Webmaster Tools; resubmit to GSC

### Week 2: Schema & Entity Graph
- [ ] Expand Organization `sameAs` (LinkedIn, Twitter/X, YouTube, Product Hunt)
- [ ] Add `WebSite` schema with `potentialAction` SearchAction
- [ ] Wrap FAQ page in `FAQPage` JSON-LD
- [ ] Add `BreadcrumbList` to nested routes
- [ ] Add `Article` schema to blog posts with `author` + `datePublished`
- [ ] Add `HowTo` schema to "How to play" sections
- [ ] Generate `llms-full.txt` alongside existing `llms.txt`

### Week 3: Content Depth & E-E-A-T
- [ ] Create author bio pages with `Person` schema + credentials
- [ ] Rewrite homepage copy with extractable Quick Facts block
- [ ] Expand `/adventure`, `/party`, `/ranked` mode pages to 600+ words each
- [ ] Add source citations to educational blog posts
- [ ] Expand "About" page with founder bio, team, mission, press

### Week 4: Brand Authority & Platform Presence
- [ ] Create LinkedIn Company page + post 2x
- [ ] Launch on Product Hunt (Tuesday launch, prep assets)
- [ ] Submit Wikidata entity + Wikipedia draft
- [ ] Launch YouTube channel with 3 gameplay videos
- [ ] Seed authentic Reddit engagement (r/WordGames, r/boardgames)
- [ ] Build review collection flow → feed `aggregateRating`

---

## Appendix: Pages Analyzed

| URL | Title | GEO Issues |
|---|---|---|
| /en | LexiClash — Free Multiplayer Word Game... (72c) | 5 |
| /he | (title, RTL) | 3 |
| /sv, /ja, /es | locale homepages | 3 each |
| /en/multiplayer | Multiplayer | 4 (missing H1) |
| /en/singleplayer | Singleplayer | 3 (thin content) |
| /en/adventure | Adventure | 3 (thin content) |
| /en/party | Party | 3 |
| /en/ranked | Ranked | 3 |
| /en/blog | Blog index | 2 |
| /en/blog/vocabulary-science | Post | 3 (no author, no citations) |
| /en/blog/word-origins | Post | 3 |
| /en/blog/hebrew-wordplay | Post | 3 |
| /en/faq | FAQ | 2 (no FAQPage schema) |
| /en/about | About | 3 (no founder bio) |
| /en/privacy | Privacy | 0 |
| /en/terms | Terms | 0 |
| /sitemap.xml | — | **CRITICAL** (returns HTML) |
| /llms.txt | — | 1 (no llms-full.txt) |
| /robots.txt | — | 1 (no explicit AI bot rules) |
