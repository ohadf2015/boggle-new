# HE SEO Sprint — 2026-05-01

**Goal:** capture HE word-game SERP from clones (bulmila/milotayim/wordle.global) and lift `/he/daily` (pos 15.68) + `מילת היום` (pos 47) into top-10 by combining (a) WOTD inventory expansion and (b) long-tail HE landings + GEO citability.

**Source signal:** GSC 2026-04-28 — Israel = 82% of clicks; mobile CTR 21.8%; HE the highest-value locale.

---

## Track A — HE WOTD Inventory 14→365 [P0, blocker]

**Why first:** per-date route + sitemap loop already emit `/word-of-the-day/YYYY-MM-DD` URLs. 14 HE entries means 14 indexable HE per-date pages; the rest fall back to seeded rotation from a 14-word pool (Google sees duplicate content). Expanding to 365 unlocks 351 net-new unique HE landings overnight.

### Files
- `fe-next/app/[locale]/word-of-the-day/content.ts` — extend `heWords` array
- `fe-next/app/[locale]/word-of-the-day/[date]/page.tsx` — already consumes via rotation, no change
- `fe-next/app/sitemap.ts` — already emits per-date loop, no change

### Tasks
1. Source 365 HE words. Buckets:
   - Tier 1 (~120): everyday vocabulary that searchers Google ("אגביות", "אדישות"...)
   - Tier 2 (~150): mid-rare with cultural pull ("חידלון", "פלאי"...)
   - Tier 3 (~95): rare/literary that drive "what does X mean" queries
2. For each entry: `{ dateKey: 'YYYY-MM-DD', word: '...', definition: '...' }`. Definition = 1 sentence, native HE, not literal English translation (per `feedback-ai-hebrew-translation`).
3. Validate against existing HE dictionary in `fe-next/backend/dictionary/he*.txt` (or wherever `validateWord` reads) so puzzles + WOTD stay coherent.
4. Profanity/political filter — pass through the moderation pipeline (`word-moderation-pipeline` memory).
5. Date assignment: span 2026-01-01 → 2026-12-31 contiguously; rotation epoch already 2026-01-01.

### Acceptance
- 365 `heWords` entries, 0 duplicates, 0 dictionary-misses
- `npm run build:fast` clean (per `feedback-build-fast`)
- Spot-check 5 random `/he/word-of-the-day/2026-MM-DD` URLs — title/desc/word visible without JS, `Article` schema present
- `app/sitemap.ts` output emits 365 HE per-date URLs (curl + grep)

### TDD
- Write a vitest spec under `fe-next/app/[locale]/word-of-the-day/__tests__/` asserting:
  - `heWords.length === 365`
  - all `dateKey` unique
  - all `word` unique
  - every `dateKey` parseable as ISO date in 2026 calendar year
- RED first (currently 14, fails) → GREEN (after extending) → REFACTOR if needed.

### Risk
- HE word inventory bloat → keep entries inline OR split to `content.he.ts` if `content.ts` exceeds 500 lines (`max 500 lines per file` rule).

---

## Track B — Long-Tail HE Landings [P1]

**Why:** clones own `/וורדל`, `/wordle-עברית`. We don't compete on those head terms cheaply. Instead capture **adjacent empty SERP** where LexiClash is structurally unique.

### New routes
| Slug | Target keyword(s) | Hook |
|---|---|---|
| `app/[locale]/hebrew-wordle-alternative/` | "וורדל בעברית", "מילת היום אונליין", "wordle עברי" | Position as "5 modes vs single-mode clones" — cite by name (Bul Mila / Milotayim) for comparison snippets |
| `app/[locale]/hebrew-boggle/` | "בוגל בעברית", "משחק קוביות מילים" | Empty SERP — own it. Lead with `/daily/word-hunt` deep link |
| `app/[locale]/hebrew-connections/` | "חיבורים עברית", "משחק קבוצות מילים" | NYT Connections has zero HE port. Own it via `/connections` |

(Existing precedent: `app/[locale]/hebrew-multiplayer-word-game/`. Use same scaffold.)

### Per-page anatomy (each new route)
- `page.tsx`:
  - `generateMetadata` w/ `META_FALLBACK` per `seo-locale-gate-pattern`
  - HE-only `robots: { index: true }`; other locales `noindex`
  - `<h1>` = HE keyword phrase verbatim
  - 5+ atomic-fact sentences (GEO citability) — see Track C
  - Internal links: `/daily/word-of-the-day`, `/daily/word-hunt`, `/connections`, `/multiplayer`
  - Schema: `VideoGameJsonLd` + `FAQPageJsonLd` (HE Q&A) + `BreadcrumbJsonLd`
- `PageClient.tsx`: small interactive teaser (mini-board / wheel preview) — reuse existing components
- Add to `app/sitemap.ts` locale-gated emission

### Acceptance
- 3 new routes pass `npm run build`
- Each emits `og:locale=he_IL`, `inLanguage=he` JSON-LD, valid breadcrumb
- All copy via `t('...')` keys (per CLAUDE.md `t('key')` rule)
- 5 locales translated (he native + en/sv/ja/es noindex stubs)

### TDD
- Snapshot test on `generateMetadata` output for each locale
- E2E (Playwright): visit `/he/hebrew-wordle-alternative` → assert h1 contains `וורדל`, FAQ schema valid

---

## Track C — GEO Atomic-Fact Pass [P1]

**Why:** GEO ≠ SEO. AI engines (ChatGPT/Perplexity/Gemini/AI Overviews) extract crisp factual sentences and citable lists. Current landings are conversion-focused ("Play now!"); they lack the kind of declarative facts AI engines quote.

### Pages to upgrade
1. `app/[locale]/page.tsx` (home)
2. `app/[locale]/word-of-the-day/page.tsx`
3. `app/[locale]/connections/page.tsx`
4. `app/[locale]/multiplayer/page.tsx`
5. `app/[locale]/hebrew-multiplayer-word-game/page.tsx`

### Insert a `<section>` per page (above-fold, after hero) with 5–8 atomic facts. Format examples (HE):

> - LexiClash תומך ב-5 שפות, כולל עברית עם RTL מלא
> - 10 מצבי משחק שונים באפליקציה אחת: בוגל, וורדל, חיבורים, גלגל מילים, ועוד
> - מילת היום מתעדכנת מדי יום בחצות (שעון ישראל)
> - מולטיפלייר בזמן אמת מול שחקנים אמיתיים
> - חינמי, ללא הרשמה, אפליקציה זמינה ב-Google Play

### Plus per page
- Add `FAQPageJsonLd` w/ 4–6 HE Q&A specific to the mode
- Add `aggregateRating` to `VideoGameJsonLd` if real Play Store reviews exist (verify before claiming)

### Acceptance
- All 5 pages render the atomic-fact block in HE with no `t()` fallback warning
- Lighthouse SEO ≥ 95
- Curl `/he/*` → grep for `application/ld+json` blocks containing `FAQPage` and `VideoGame`

### TDD
- Vitest unit test on each FAQ schema generator: 4+ Q&A, all answers ≥ 30 chars, no `t()` missing-keys

---

## Track D — Programmatic Anagram-Style HE Pages [P2]

**Why:** memory shows `/anagram` programmatic route + hub already shipped (SEO sprint 2026-04-26). HE never got a sister.

### Plan
- Mirror `app/anagram/[word]/page.tsx` structure for HE under `app/[locale]/anagram/[word]/page.tsx` (or extend existing route to gate by locale)
- Seed list: 200 high-volume HE base-words (top searched on Hebrew Wiktionary / Academy)
- Each page: list valid HE anagrams + sub-anagrams + link to `/daily/word-hunt`

### Acceptance
- 200 HE programmatic URLs in sitemap (gated `inLanguage: he`)
- Build time impact < 30s (per `feedback-build-fast`)

### Defer to Sprint 2 if Track A/B/C run long.

---

## Track E — PR / Backlinks (parallel, non-code) [P2]

Pitch list (per Israeli press that covered Wordle clones — see Ynet/ToI references):

- **Times of Israel** (timesofisrael.com) — covered HE/Yiddish Wordle in 2022. Angle: "Israeli startup launches 10-mode Hebrew word app w/ real-time multiplayer"
- **Ynet Digital** (ynet.co.il/digital) — covered Wordle going viral. Angle: same.
- **Calcalist** — startup angle.
- **Ice.co.il** — covered teen-built Israeli Wordle. Angle: founder + product story.

Ship after Track A live so `/he/daily` + 365 per-date URLs are crawlable when journalists check.

---

## Sprint Sequencing

```
Day 1–3:  Track A (WOTD inventory) — single contributor, content-heavy
Day 2–4:  Track C (atomic facts) — parallel, edits existing pages
Day 4–7:  Track B (3 new landings) — after C lands its FAQ helpers
Day 7–10: Track D + Track E (if capacity)
```

Sequencing rule per `feedback-parallel-agents-overlap`: Track A and Track C touch disjoint files (content.ts vs page.tsx) — safe to parallelize. Track B depends on FAQ helper from C — sequential.

---

## Success Metrics (re-check 2026-06-01)

| Metric | Baseline | Target |
|---|---|---|
| `/he/daily` GSC position | 15.68 | top 10 |
| `מילת היום` GSC position | 47 | top 20 |
| HE indexed URLs (GSC) | ~1,625 | 2,000+ |
| HE clicks/day | (current) | +30% |
| AI Overview citations (manual probe: 5 HE word-game queries) | 0 | 2+ |

---

## Out of Scope

- Paid acquisition (TikTok/creator) — separate brief
- Play Store ASO — separate mobile sprint
- News PR pitches drafted but not sent until Track A ships
- English-locale GEO push — separate sprint after HE proves out
