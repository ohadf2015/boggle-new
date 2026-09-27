# Android Install-Intent SEO Landing Page — Design

**Date:** 2026-05-21
**Status:** Approved (autonomous mode — no review gate)
**Author:** Claude (Opus 4.7)

## Problem

LexiClash has a published Android app (`live.lexiclash.app`) but **zero landing pages targeting install/download search intent**. The ~30 existing keyword pages all chase *"online word game"* (web-play intent). Searches like *"word game android app"*, *"free word puzzle app download"*, *"multiplayer word game android"* hit no dedicated page — the highest-converting query class (rank → Play Store install) is unserved.

## Goal

Capture organic search traffic with **install intent** and route it to the Play Store, with **attributable** install tracking so we can measure whether SEO drove installs.

## Scope (this spec)

Ship **one flagship page** done well, plus reusable infrastructure so future install-intent pages are cheap:

- New route: `app/[locale]/download-word-game-android/` (`page.tsx` + `content.ts`)
- Reusable `components/PlayStoreCTA.tsx` — official-style Google Play badge (inline SVG), neo-brutalist frame, links to Play Store **with install referrer**
- Helper `playStoreUrlWithReferrer(campaign, locale?)` in `utils/androidApp.ts`
- Generated hero image → `public/images/landing/`
- Sitemap registration (`addForAllLocales`)
- Full 5-locale copy (en, he-RTL, sv, ja, es) — HE/SV/JA/ES flagged for native review

**Explicitly out of scope:** additional install pages (`free-word-game-app`, etc.) — deferred until this page shows conversion in PostHog + Play Console referrer (7–14 day window). No cannibalization with existing `multiplayer-word-game-online`: that page targets web-play intent; this targets install intent.

## Approach

Mirror the proven `brain-training-word-games` pattern exactly:
- All copy in `content.ts`, keyed by locale, `getDownloadLandingCopy(locale): DownloadLandingCopy` with `?? en` fallback.
- `page.tsx` is pure presentation (server component), neo-brutalist design system (navy bg, hard shadows, lime/pink/cyan/purple accents, Fredoka/Rubik).
- Hand-built JSON-LD via `next/script`.

### Page structure (above → below fold)
1. Marquee badge strip (reused pattern)
2. **Hero**: H1 (install intent) + 2 intro paragraphs + **`PlayStoreCTA` (primary, above fold)** + secondary "Play free in browser" link to `/{locale}` + generated hero image
3. **Why the app** — feature grid (offline-capable, push reminders, home-screen icon, faster, ad-light) — 4-6 cards
4. **App vs browser** comparison table (honest: browser = no install, app = offline + reminders)
5. **How to install** — 3-4 numbered steps (→ HowTo JSON-LD)
6. **FAQ** — 6-8 Q&A (→ FAQPage JSON-LD)
7. Related internal links (multiplayer, daily, brain, blog)
8. **Final CTA** — repeat `PlayStoreCTA` + browser link

### JSON-LD (per `feedback-no-fake-ratings`: NO aggregateRating)
- `SoftwareApplication` (`@type: ['MobileApplication','SoftwareApplication']`, `operatingSystem: 'ANDROID'`, `applicationCategory: 'GameApplication'`, `installUrl`/`downloadUrl` = PLAY_STORE_URL, free Offer)
- `FAQPage`, `BreadcrumbList` (Home → this page), `HowTo` (install steps)

### Install attribution (must-have, day one)
`PlayStoreCTA` href = `playStoreUrlWithReferrer(campaign)`:
```
https://play.google.com/store/apps/details?id=live.lexiclash.app&referrer=utm_source%3Dseo%26utm_medium%3Dlanding%26utm_campaign%3D<campaign>
```
Google Play Install Referrer surfaces this in Play Console → install attribution. `campaign` defaults to the page slug.

### Play badge
Google deprecated the static badge CDN (404). Render the official-style badge as **inline SVG** inside `PlayStoreCTA` (4-color Play triangle + localizable "GET IT ON" eyebrow + "Google Play" wordmark), wrapped in a neo-brutalist `border-3 border-neo-black shadow-hard` frame. No external asset → no broken-image risk, fully testable.

### Image
Generate one hero (kawaii marshmallow-cube mascot beside an Android phone showing the LexiClash grid; dark-navy neo-brutalist; per `feedback-image-style`). Save `public/images/landing/download-word-game-android-hero.webp`. OG/Twitter image reuses existing `og-image-{locale}.webp` (proven 1200×630). Existing `output/android-release-hero.jpg` is the fallback if generation underwhelms.

## Components & boundaries

| Unit | Purpose | Depends on |
|---|---|---|
| `utils/androidApp.ts` → `playStoreUrlWithReferrer` | Pure: build attributed Play URL | `PLAY_STORE_URL`, `ANDROID_PACKAGE` |
| `components/PlayStoreCTA.tsx` | Render official-style Play badge `<a>` w/ referrer href | `playStoreUrlWithReferrer` |
| `download-word-game-android/content.ts` | Locale-keyed copy + getter | none |
| `download-word-game-android/page.tsx` | Presentation + JSON-LD | content, PlayStoreCTA, next/image |
| `app/sitemap.ts` | Register route (all locales) | existing helper |

## Testing (TDD — RED first)

1. `utils/androidApp.test.ts` (extend): `playStoreUrlWithReferrer('foo')` → exact URL w/ encoded `referrer=utm_source%3Dseo%26utm_medium%3Dlanding%26utm_campaign%3Dfoo`; preserves base `id=live.lexiclash.app`; campaign is URL-encoded.
2. `components/__tests__/PlayStoreCTA.test.tsx`: renders an `<a>`; `href` === `playStoreUrlWithReferrer(campaign)`; `target="_blank"`, `rel` contains `noopener`; renders localized eyebrow label + "Google Play" text; renders an SVG.
3. `download-word-game-android/content.test.ts`: all 5 locales present; every required scalar field non-empty for every locale; arrays have expected lengths (features 4-6, faqs ≥6, installSteps 3-4, comparison rows ≥4); faqs each have non-empty `q`+`a`; no `TODO`/`TBD`/`lorem`; getter falls back to `en` on unknown locale.
4. `app/sitemap.test.ts` (create or extend): generated sitemap includes `/download-word-game-android` for all 5 locales with hreflang.

## Risks / mitigations
- **Doorway/thin content** → single rich, genuinely distinct page (install angle, not duplicate of web pages).
- **Hebrew quality** → include he-IL, flag "needs native review" in commit + memory (per `feedback-ai-hebrew-translation`).
- **Badge trademark** → linking to own app w/ official-style badge is within Google brand use; SVG approximates official layout.
- **No fake stats** → no ratings/download counts; positive framing only ("free", "ad-light", "offline").

## Success signal (post-ship, operator-watched)
PostHog landing→outbound funnel + Play Console install-referrer `utm_campaign=download-word-game-android` over 7–14 days. If it converts, clone for 1-2 more install-intent slugs.
