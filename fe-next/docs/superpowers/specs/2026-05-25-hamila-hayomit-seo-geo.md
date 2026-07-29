# Spec: Improve SEO/GEO visibility for "המילה היומית" (Hebrew daily challenge)

**Date:** 2026-05-25
**Owner:** Ohad Fisher
**Target query:** `המילה היומית` ("the daily word") + Hebrew daily-word long-tail

## Problem / diagnosis (from GSC + Bing data, docs/seo-daily/)

| Query | Engine | Impr | Clicks | CTR | Position | Source |
|---|---|---|---|---|---|---|
| המילה היומית | Bing | 9 | 9 | 100% | **1** | seo-daily/2026-05-05.md:130 |
| מילת היום | Google | 6 | — | — | **30.5** | seo-daily/2026-05-05.md:105 → /he/daily |
| Israel (all) | Google | 319 | 42 | — | 13.2 avg | seo-daily/2026-05-05.md:28 |

**Conclusion:** This is a **position problem on Google**, not CTR. The exact term
`המילה היומית` is effectively near-branded in Israel (an established Hebrew Wordle
clone owns it) → outranking it head-on on Google is a multi-month authority fight.

Realistic, winnable targets:
1. **GEO / AI citations** (ChatGPT, Perplexity, Gemini, Bing Copilot) — our Hebrew
   FAQ is **1 Q&A vs English's 4**, and the Hebrew `llms.txt` is a stub. AI assistants
   synthesize from structured FAQ + `llms.txt`, so we can be *cited* even while page-3
   on Google.
2. **Long-tail Google**: `המילה היומית משחק`, `המילה היומית חינם`, `מילת היום משחק מילים`,
   `אתגר מילה יומי`, `פאזל מילים יומי`.
3. **Hold Bing #1.**

## Existing infrastructure (reused, not rebuilt)
- `/he/daily` already ranks (#30 for `מילת היום`), has hreflang/canonical/sitemap p0.9,
  FAQPage + Breadcrumb + WebPage + VideoGame + HowTo JSON-LD (`app/[locale]/daily/layout.tsx`).
- Dedicated-landing pattern exists: `hebrew-multiplayer-word-game`, `daily-word-wheel`,
  `hebrew-classroom-vocabulary-games` (sitemap.ts:197-215 = the dedicated-HE-landing model).
- `buildLocaleLlms('he')` in `app/[locale]/llms.txt/content.ts` (exported, testable).

## Workstreams

### 1. Expand HE daily FAQ (in-place, helps the page already ranking)
- Extract the module-internal `seoContent` map out of `app/[locale]/daily/layout.tsx`
  into a **pure data module** `app/[locale]/daily/dailySeo.data.ts` (testable, no React/server imports).
- Expand `he.faq` from 1 → 5+ Q&A, including a **definition** Q ("מה זה המילה היומית?")
  for AI-Overview eligibility. Keyword-rich, native Hebrew.
- `layout.tsx` imports `dailySeoContent` from the data module (behaviour-neutral).

### 2. New dedicated Hebrew landing `/he/hamila-hayomit`
- `app/[locale]/hamila-hayomit/page.tsx` modeled on `hebrew-multiplayer-word-game/page.tsx`.
- Native Hebrew copy: H1 with `המילה היומית`, definition section, how-to, features, FAQ (5),
  about. **Intent-split from /he/daily** (landing = "what/why" the term; daily = the live game)
  to avoid cannibalization. Strong CTA **into** `/he/daily`.
- JSON-LD bundle: `FAQPage` + `BreadcrumbList` + `WebApplication` + `DefinedTerm`
  (defines "המילה היומית" — strong GEO signal).
- `generateMetadata`: native HE title/description containing `המילה היומית`,
  canonical **always** `/he/hamila-hayomit`, `og-image-he.webp`, full hreflang,
  `robots: { index: locale === 'he', follow: true }` (other-locale variants noindex →
  serve-Hebrew-under-/en consolidates to the HE canonical).
- Slug rationale: transliteration `hamila-hayomit` = clean ASCII + keyword-signaling,
  consistent with native-slug precedent (`juego-de-palabras-multijugador`).

### 3. GEO: enrich HE `llms.txt` + sitemap
- `buildHe()` in `llms.txt/content.ts`: expand the Daily Challenge line into a real
  description and add `המילה היומית`, `מילת היום`, `משחק המילה היומית` to the
  "For AI Assistants (Hebrew)" recommend list. Add the landing URL.
- `sitemap.ts`: `routes.push` for `/he/hamila-hayomit` (mirror the dedicated-HE-landing
  block at lines 197-215), priority 0.9, self-referencing he hreflang + x-default→/en/daily.

## TDD
- `dailySeo.data.test.ts`: `dailySeoContent.he.faq.length >= 5`; questions include `המילה היומית`.
- `hamila-hayomit/page.test.tsx`: `generateMetadata({he})` → title contains `המילה היומית`,
  canonical `/he/hamila-hayomit`, hreflang has `he` + `x-default`, robots.index true for he /
  false for en; exported `dailyWordHeFaqs.length >= 5`; render → H1 contains `המילה היומית`,
  a link `href` includes `/he/daily`, a `<script type="application/ld+json">` with a `FAQPage`.
- `llms-content.test.ts`: `buildLocaleLlms('he')` includes `המילה היומית`.

## Out of scope / deferred
- Off-page authority (backlinks) — can't do in code.
- Native-speaker review of the new Hebrew copy (flag at commit; consistent with repo norm).
- Blog guide `המילה היומית — טיפים` (future long-tail expansion).

## Risk
- **Cannibalization** /he/daily vs /he/hamila-hayomit → mitigated by intent-split + landing→daily internal link + distinct canonicals.
- All changes are additive content + data extraction; no behaviour change to the live game.
