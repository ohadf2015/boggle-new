# Connections (rosh-zanav / Word Bridge) Landing Page — Design Spec

**Date:** 2026-05-08
**Status:** Draft → ready for plan
**Game route:** `/[locale]/connections/`
**Locales:** EN + HE (game UI only available in these two)

---

## 1. Goal

Convert the bare `/[locale]/connections` route — currently a 20-line shell that mounts `ConnectionsGame` — into a full SEO + acquisition landing page that:

1. Ranks for bridge-word / word-association queries in EN and Hebrew "ראש זנב" / "חידות מילים" / "משחק קישור מילים" in HE.
2. Onboards a new player from cold visit → first puzzle solved without leaving the page.
3. Disambiguates from NYT Connections (different mechanic) without bleeding equity.
4. Reuses the proven landing pattern from `/brain-training-word-games/` (page.tsx + content.ts split).

## 2. Non-goals

- No Swedish / Japanese / Spanish — game UI is not translated; those locales get `noindex` + canonical to EN per existing `META_FALLBACK` locale-gate pattern (see memory `seo-locale-gate-pattern.md`).
- No game-mechanic changes. Bridge-word logic, puzzle DB, lives, hint flow stay as-is.
- No new puzzle authoring pipeline in this scope (sample puzzles for marquee will reuse existing curated puzzles via `getPuzzleForLevel`).
- No A/B test wiring in v1 (can layer on later via existing `lib/experiments.ts`).

## 3. Game inventory (current state)

- `app/[locale]/connections/page.tsx` (20 L) — shell with metadata for HE/EN title.
- `app/[locale]/connections/PageClient.tsx` (25 L) — Suspense + `ConnectionsGame`.
- `components/connections/ConnectionsGame.tsx` — full game (lives, hints, feedback, banned-puzzles).
- `lib/connections/puzzles.ts` — puzzle source (`getPuzzleForLevel`, `getTotalLevels`).
- `lib/connections/types.ts` — `ConnectionPuzzle { word1, word2, bridge, hint?, difficulty }`.
- Translations: existing `connections.*` namespace in `translations/en.js` + `translations/he.js` (game in-play strings; landing strings will extend under `connections.landing.*`).
- Telemetry: `trackGameStart('connections', ...)` already wired.

## 4. Approach

**A: Co-located landing.** Single URL = landing + playable game. Marketing sections render above-the-fold for crawlers / cold visitors. Game mounts below the fold via `ConnectionsGame` (existing). Returning players bookmark hit either way. No URL split, no canonical risk, no equity dilution.

Rejected:
- **B (separate `/word-bridge-game` landing):** splits link equity; URL drift confuses returning players.
- **C (hybrid):** double maintenance; only worth it if launching a content-marketing program.

## 5. Naming and SEO positioning

**Dual-brand approach** to ride both real search demand pools without overclaiming:

| Locale | Primary H1 | Secondary | Title tag |
|---|---|---|---|
| EN | "Word Bridge — Find the Connecting Word" | "(also known as rosh-zanav, the classic Israeli word game)" | "Word Bridge — Find the Connecting Word \| LexiClash" |
| HE | "ראש זנב — מצא את המילה המקשרת" | "(Word Bridge — חידת מילים קלאסית)" | "ראש זנב — מצא את המילה המקשרת \| LexiClash" |

**Disambiguation FAQ entry**: "Is this NYT Connections?" → "No. NYT Connections asks you to sort 16 words into 4 groups. Word Bridge gives you two words and asks you to find one that links them. Different game, both fun."

**Schema**: `VideoGame` (game-level) + `FAQPage` (questions) + `BreadcrumbList`. Skip `LearningResource` for v1 (overclaim — this is entertainment-first).

## 6. Page structure (single URL)

Order top → bottom:

1. **Hero** — H1, 1-line tagline, **interactive sample puzzle widget** (FIRE + __ + ENGINE → reveals TRUCK on tap), primary CTA "Play Free Now" (anchor scroll → game mount).
2. **What is it?** — 2 short paragraphs: bridge-word explainer + the rosh-zanav classic origin (Hebrew block emphasizes nostalgia/road-trip framing).
3. **Sample puzzles strip** — 3 cards: easy / medium / hard, tap to reveal answer. Recycle real puzzles via `getPuzzleForLevel(1)`, `getPuzzleForLevel(15)`, `getPuzzleForLevel(40)` (or hand-pick fixed IDs to avoid spoilers for active players — see open question).
4. **Why play (brain + fun blurb)** — 3 cards: vocabulary, lateral thinking, semantic memory. Light, no pseudo-research overclaim.
5. **HE-only nostalgia block** — rendered only when `locale === 'he'`: "המשחק הקלאסי של נסיעות וטיולים — עכשיו אונליין". Image of the kawaii mascot in a road-trip context (reuse existing mascot asset).
6. **Comparison table** — vs. NYT Connections / Wordle / Crosswords. 4 rows × 4 columns. Disambiguates honestly.
7. **FAQ (FAQPage JSON-LD)** — 6 questions (see §10).
8. **Footer CTA + game mount** — Big "Start Playing" reveals/scrolls to `<ConnectionsGame />` mounted at the bottom of the page (always rendered for crawler/JS-disabled fallback; CSS `scroll-margin-top` handles offset).

## 7. File plan

```
app/[locale]/connections/
  page.tsx              # MODIFIED — adds full metadata, JSON-LD, renders landing + game
  PageClient.tsx        # MODIFIED — wraps Hero..FAQ + ConnectionsGame in single tree
  content.ts            # NEW — typed copy + sample puzzle picks per locale
  __tests__/
    page.test.tsx       # NEW — meta + locale gate + schema presence

components/connections/landing/
  ConnectionsHero.tsx          # NEW — H1 + interactive sample puzzle
  ConnectionsSampleStrip.tsx   # NEW — 3 difficulty reveal cards
  ConnectionsWhyPlay.tsx       # NEW — 3 benefit cards
  ConnectionsHEClassic.tsx     # NEW — HE-only nostalgia block
  ConnectionsCompare.tsx       # NEW — comparison table
  ConnectionsFAQ.tsx           # NEW — 6 Q&A + FAQPage JSON-LD
  __tests__/
    ConnectionsHero.test.tsx
    ConnectionsSampleStrip.test.tsx
    ConnectionsFAQ.test.tsx

translations/
  en.js                 # MODIFIED — add connections.landing.{hero,whatIs,samples,whyPlay,compare,faq,cta}
  he.js                 # MODIFIED — same keys, native HE copy
  sv.js / ja.js / es.js # NO-OP — landing not exposed in these locales
```

All new files <300 L (per CLAUDE.md cap). content.ts may approach 400-500 L; if it exceeds 500, split per-section.

## 8. Locale gate (sv/ja/es)

Reuse `META_FALLBACK` + `isTargetLocale` pattern (memory: `seo-locale-gate-pattern.md`).

In `page.tsx`:
- If `locale ∈ {'sv','ja','es'}`:
  - `metadata.robots = { index: false, follow: true }`
  - `metadata.alternates.canonical = '/en/connections'`
  - PageClient renders the **game only** (no landing sections) — preserves zero-regression for any user who lands there via direct link.
- If `locale ∈ {'en','he'}`:
  - Full landing renders.

## 9. Interactive sample puzzle widget (Hero)

State machine (client component, tiny):
- `idle` → shows `FIRE  [   ]  ENGINE` with 3 pulsing dots in middle.
- User taps the middle slot → switches to `reveal`.
- `reveal` → fades in `TRUCK` with neo-pop animation, shows ✅ chip "That's a bridge word!" + secondary CTA "Play 30 more →" anchoring to game mount.
- Reduced-motion: skip pop, instant fade.

This is a **demo only** (not a real input). It's a teaser — no input field, no validation, no telemetry beyond `landing_sample_revealed` event. Keeps interaction friction near zero.

## 10. FAQ content (drives FAQPage schema)

EN:
1. "What is Word Bridge?" — Bridge-word explainer.
2. "Is this NYT Connections?" — No. Different mechanic. Brief, friendly.
3. "Is it free?" — Yes. Free to play, optional rewarded ads for hints.
4. "What's 'rosh-zanav'?" — Hebrew name "head-tail", classic Israeli word game.
5. "Can I play in Hebrew?" — Yes. Toggle locale; full HE puzzle bank.
6. "How do hints work?" — One free hint per puzzle via rewarded ad / coin spend.

HE: same six, native phrasing (not literal translation — see `ux-writer` skill principle).

## 11. Acquisition tactics (bring new players)

In-scope for v1:
- **Cross-promo from `/daily/word-of-the-day`** — add a small "Try Word Bridge" card to the existing daily-results screen. Existing high-CTR surface (memory: `gsc-2026-04-28.md` shows /he/daily as top mobile entry).
- **OG image** — branded share card; reuse `og-image-ja` style with bridge-puzzle motif.
- **JSON-LD VideoGame + FAQPage** — snippet eligibility for "what is bridge word puzzle" / "ראש זנב מה זה".
- **llms.txt entry** — add landing URL + 1-line description.

Deferred (not in v1, listed for future):
- HE blog post `blog/rosh-zanav-classic-israeli-word-game` (backlink magnet).
- Shareable puzzle results "I solved 5 in a row" deep-link.
- A/B test on Hero CTA copy via `lib/experiments.ts`.
- Daily-puzzle JSON-LD (requires daily-puzzle pipeline; out of scope).

## 12. Telemetry

New PostHog events (small set):
- `landing_view` — props `{ surface: 'connections', locale }`.
- `landing_sample_revealed` — Hero teaser tapped.
- `landing_cta_click` — props `{ position: 'hero' | 'footer' | 'compare' }`.
- Existing `trackGameStart('connections', ...)` continues to fire when ConnectionsGame mounts/starts.

## 13. Tests (TDD per CLAUDE.md)

Per file:
- `ConnectionsHero` — renders H1, sample-puzzle reveal toggles state, CTA fires telemetry, RTL flip on `locale=he`.
- `ConnectionsSampleStrip` — renders 3 cards, reveal-on-click, no spoilers leak before tap.
- `ConnectionsFAQ` — renders 6 questions, JSON-LD `<script>` tag present with valid `FAQPage` shape.
- `page.test.tsx` — `metadata.title` matches per locale, `metadata.robots.index === false` for sv/ja/es, canonical correct.

Aim ≥ 12 new tests across landing components + page metadata.

## 14. Acceptance checklist

- [ ] EN landing at `/en/connections` renders all 8 sections + game mount; Lighthouse SEO ≥ 95.
- [ ] HE landing at `/he/connections` renders RTL; HE-nostalgia block visible; HE-classic image alt set.
- [ ] sv/ja/es get noindex + canonical to /en/connections; game still mounts (no regression).
- [ ] FAQ JSON-LD validates in https://validator.schema.org/.
- [ ] No new translation keys missing in en.js / he.js (lint catches `t()` for unknown keys).
- [ ] All new components <300 L.
- [ ] All new components have a sibling `__tests__` file.
- [ ] `npm run lint && npm run test && npm run build` clean.
- [ ] Existing `connections` PostHog game-start funnel unchanged.

## 15. Open questions

1. **Sample puzzle reuse**: should hero/strip use real puzzles from `lib/connections/puzzles.ts` (risks spoiling them for first-time players) or hand-curated landing-only puzzles in `content.ts`? **Recommendation: hand-curated 4 puzzles in content.ts** (1 hero + 3 strip), separate from gameplay bank. ~30 min author cost, eliminates spoiler risk.
2. **Mascot image**: HE-classic block needs a road-trip mascot image. Reuse existing or commission? **Recommendation: reuse existing kawaii mascot from `/public/mascot/` for v1**; commission later if landing earns traffic.
3. **Sticky CTA**: should we add a sticky-bottom "Play" pill on mobile while user scrolls landing? **Recommendation: yes for mobile only**, hidden once user is within game viewport.

## 16. Out-of-scope follow-ups (track separately)

- Game-mode UI translations into sv/ja/es to unlock 5-locale landing.
- Daily-puzzle pipeline + per-date URL pattern (mirroring `/word-of-the-day/[date]`).
- Referral/share-a-streak deep links.
- Content-marketing blog post in HE.

---

**Spec self-review:**
- Placeholders: none.
- Internal consistency: file plan ↔ section list ↔ test plan all align. Locale gate matches naming/positioning section.
- Scope: single implementation plan-sized. ~12-15 new files, ~12 tests, no infra change.
- Ambiguity: open questions §15 surfaced explicitly with recommendations.
