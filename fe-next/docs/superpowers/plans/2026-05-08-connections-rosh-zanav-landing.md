# Connections (rosh-zanav / Word Bridge) Landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `/[locale]/connections` from a 20-line shell into a full SEO + acquisition landing page (EN + HE) with the game still mounted on the same URL.

**Architecture:** Co-located landing — single URL hosts marketing sections above and the existing `ConnectionsGame` component below. Reuse the proven `page.tsx + content.ts` split from `/brain-training-word-games/`. Locale gate noindexes sv/ja/es and renders only the game (no regression).

**Tech Stack:** Next.js 16 App Router · TypeScript · Tailwind (neo-brutalist tokens) · `next/script` for JSON-LD · existing `LanguageContext` for i18n.

**Spec:** `docs/superpowers/specs/2026-05-08-connections-rosh-zanav-landing-design.md`

---

## File map

```
app/[locale]/connections/
  page.tsx            # MODIFY — full metadata + JSON-LD + locale gate
  PageClient.tsx      # MODIFY — render landing sections + game on EN/HE, game-only on others
  content.ts          # NEW — typed copy + 4 demo puzzles + FAQ
  __tests__/
    page.test.tsx     # NEW

components/connections/landing/
  ConnectionsHero.tsx          # NEW — interactive sample puzzle
  ConnectionsSampleStrip.tsx   # NEW — 3 difficulty reveal cards
  ConnectionsWhyPlay.tsx       # NEW — 3 benefit cards
  ConnectionsHEClassic.tsx     # NEW — HE-only nostalgia
  ConnectionsCompare.tsx       # NEW — comparison table
  ConnectionsFAQ.tsx           # NEW — 6 Q&A
  ConnectionsStickyCTA.tsx     # NEW — mobile-only sticky play pill
  __tests__/
    ConnectionsHero.test.tsx
    ConnectionsSampleStrip.test.tsx
    ConnectionsFAQ.test.tsx

translations/
  en.js               # MODIFY — add connections.landing.*
  he.js               # MODIFY — same keys, native HE

public/llms.txt       # MODIFY — add /en/connections + /he/connections
components/daily/     # MODIFY — add cross-promo card linking to /connections
```

---

### Task 1: Translations — add `connections.landing.*` to en.js + he.js

**Files:**
- Modify: `translations/en.js` (add keys under existing `connections:` namespace)
- Modify: `translations/he.js`

Add full key tree (hero, intro, samples, whyPlay, heClassic, compare, faq, cta, sticky). Skip sv/ja/es — landing not exposed there.

Test: lint clean (`npm run lint` catches duplicate keys per memory `feedback-translation-duplicate-key-class`).

Commit: `feat(connections): add landing i18n keys (en+he)`

### Task 2: content.ts — typed copy module

**Files:**
- Create: `app/[locale]/connections/content.ts`

Export `getConnectionsLandingCopy(locale: string)` returning typed shape: `{ metaTitle, metaDescription, ogTitle, ogDescription, h1Pre, h1Highlight, intro[], demoPuzzles[4], whyPlay[3], heClassic, compare{rows,cols}, faqs[6], ctaPrimary, ctaSecondary, sticky }`.

Demo puzzles hand-curated (NOT from `lib/connections/puzzles.ts` — avoids spoilers):
- Hero: `FIRE` + `ENGINE` → `TRUCK`
- Strip easy: `SUN` + `SHINE` → `LIGHT`
- Strip medium: `BREAK` + `WATER` → `FAST`
- Strip hard: `BLACK` + `STORM` → `THUNDER`

HE demo puzzles:
- Hero: `אש` + `לוחם` → `כיבוי`
- Strip easy: `שמש` + `יום` → `אור`
- Strip medium: `מים` + `רחצה` → `חמים`
- Strip hard: `חשמל` + `סופה` → `רעם`

Test: type-only file, exercised via component tests.

Commit: `feat(connections): typed landing copy module`

### Task 3: ConnectionsHero — interactive demo

**Files:**
- Create: `components/connections/landing/ConnectionsHero.tsx`
- Create: `components/connections/landing/__tests__/ConnectionsHero.test.tsx`

Renders H1, badge, two tile boxes with bridge slot in middle. Tap middle slot → reveals bridge word with neo-pop animation (respects `prefers-reduced-motion`). Primary CTA scrolls to `#connections-game`. Telemetry: `landing_sample_revealed` + `landing_cta_click`.

Tests:
- Renders H1 + word1 + word2.
- Tap middle slot → bridge word visible.
- CTA click fires `trackEvent('landing_cta_click', { position: 'hero' })`.

Commit: `feat(connections): hero with interactive sample puzzle`

### Task 4: ConnectionsSampleStrip — 3 reveal cards

**Files:**
- Create: `components/connections/landing/ConnectionsSampleStrip.tsx`
- Create: `components/connections/landing/__tests__/ConnectionsSampleStrip.test.tsx`

Renders 3 difficulty cards. Each card hides bridge until tapped (button reveals). Difficulty chips use neo-lime/cyan/pink mapping.

Tests:
- Renders 3 cards.
- Bridge text NOT in DOM before reveal.
- After click, bridge text visible.

Commit: `feat(connections): sample puzzles strip`

### Task 5: ConnectionsWhyPlay — 3 benefit cards

**Files:**
- Create: `components/connections/landing/ConnectionsWhyPlay.tsx`

Three cards: vocabulary / lateral thinking / semantic memory. Static, no logic. Use neo-brutalist tokens.

No new test file (smoke covered by page.test).

Commit: `feat(connections): why-play benefit cards`

### Task 6: ConnectionsHEClassic — HE-only nostalgia block

**Files:**
- Create: `components/connections/landing/ConnectionsHEClassic.tsx`

Renders only when `locale === 'he'` (caller responsibility). Mascot image (existing `/public/mascot/`) + nostalgia copy ("המשחק הקלאסי של נסיעות וטיולים").

Commit: `feat(connections): HE classic nostalgia block`

### Task 7: ConnectionsCompare — vs. NYT/Wordle/Crossword table

**Files:**
- Create: `components/connections/landing/ConnectionsCompare.tsx`

4-row × 4-column table. Disambiguates honestly. Mobile: scroll-x.

Commit: `feat(connections): comparison table`

### Task 8: ConnectionsFAQ + FAQPage JSON-LD

**Files:**
- Create: `components/connections/landing/ConnectionsFAQ.tsx`
- Create: `components/connections/landing/__tests__/ConnectionsFAQ.test.tsx`

Render 6 Q&A in `<details>` collapsibles. Receives `faqs` from content. JSON-LD lives in `page.tsx` (server) — component is presentation only.

Tests:
- Renders 6 questions.
- Each Q is keyboard-accessible (`<summary>` is button by default).

Commit: `feat(connections): FAQ component`

### Task 9: ConnectionsStickyCTA — mobile-only play pill

**Files:**
- Create: `components/connections/landing/ConnectionsStickyCTA.tsx`

`position: fixed; bottom: var(--bottom-stack-height, 0)` to respect AdMob banner clearance (memory: `admob-banner-clearance-4019`). Hidden on `md+`. Hidden when game is in viewport (IntersectionObserver on `#connections-game` element).

Commit: `feat(connections): mobile sticky play pill`

### Task 10: page.tsx — metadata + JSON-LD + locale gate

**Files:**
- Modify: `app/[locale]/connections/page.tsx`
- Create: `app/[locale]/connections/__tests__/page.test.tsx`

Pattern: copy from `brain-training-word-games/page.tsx`. Implement:
- `generateMetadata`: full title/description/OG/Twitter/canonical/alternates.
- `robots.index = locale === 'en' || locale === 'he'` (sv/ja/es noindex).
- Render `<Script id="ld-faq-connections">` + `<Script id="ld-videogame-connections">` + `<Script id="ld-breadcrumb-connections">`.
- Pass `locale` + `copy` to PageClient.

Tests:
- `generateMetadata` returns `index: true` for en/he, `index: false` for sv/ja/es.
- Title differs per locale.
- Canonical = `${BASE_URL}/${locale}/connections`.

Commit: `feat(connections): SEO metadata + JSON-LD on landing`

### Task 11: PageClient.tsx — landing + game integration

**Files:**
- Modify: `app/[locale]/connections/PageClient.tsx`

For locale ∈ {en, he}: render Hero → SampleStrip → WhyPlay → (HEClassic if he) → Compare → FAQ → StickyCTA → `<div id="connections-game"><ConnectionsGame /></div>`. For other locales: just `<ConnectionsGame />` (no regression for direct-link visitors).

Fire `landing_view` PostHog event on mount.

Commit: `feat(connections): landing + game co-located on single URL`

### Task 12: Cross-promo card on /daily

**Files:**
- Modify: `components/daily/DailyResultsCard.tsx` (or equivalent — verify path before editing)

Add small "Try Word Bridge" card linking to `/${locale}/connections`. Locale-aware copy via `t('connections.landing.crossPromo.*')`. Track `cross_promo_click` event with `{ from: 'daily', to: 'connections' }`.

Commit: `feat(connections): cross-promo card on daily results`

### Task 13: llms.txt entry

**Files:**
- Modify: `public/llms.txt`

Add line:
```
/en/connections — Word Bridge (rosh-zanav): find the word linking two given words. Free, no signup.
/he/connections — ראש זנב: מצא את המילה המקשרת בין שתי מילים. חינם, ללא הרשמה.
```

Commit: `feat(connections): llms.txt entry for landing`

### Task 14: Verify — lint + tests + build

Run:
```bash
npm run lint
npm run test -- --run components/connections/landing
npm run build
```

Expected: clean across board. Fix any issues.

Final commit (if anything caught): `chore: lint/test/build fixes for connections landing`

---

## Self-review

- **Spec coverage:** §6 sections (Hero, WhatIs, Strip, WhyPlay, HEClassic, Compare, FAQ, FooterCTA+game) all map to Tasks 3-11. Acceptance checklist items map: locale gate (T10), JSON-LD (T10), tests (T3/T4/T8/T10), <300L (enforced per file), telemetry (T3, T11, T12).
- **Placeholders:** none.
- **Type consistency:** `ConnectionsLandingCopy` is the source of truth. All components consume their slice via prop drilling from PageClient. Demo puzzle shape `{ word1, word2, bridge, hint? }` matches existing `ConnectionPuzzle`.
- **Skipped from spec §11 deferred list:** OG image swap (uses default), HE blog post, share-deep-link, A/B test, daily-puzzle JSON-LD — all explicitly deferred in spec.
