# RU discoverability + Connections landing pages — spec

Date: 2026-08-09
Goal: (a) make Russian-speaking players able to find us in search, (b) give Connections
mode real landing pages the way every other mode already has.

## Measured state (not assumed)

| Check | Result |
|---|---|
| `ru` in `lib/i18n.js` `locales` | ✅ present — `/ru/*` routes, no redirect to `/en` |
| `translations/ru.js` | ✅ 894 KB — the **largest** bundle (en is 599 KB). Connections keys translated. |
| 6 RU keyword landings live in prod | ✅ all `200`, `index,follow`, self-canonical, ~3400 crawlable words each |
| Same 6 in live `sitemap.xml` | ✅ present |
| **Google index status (URL Inspection API)** | ❌ **`URL is unknown to Google`, `lastCrawlTime: never`** for all 4 sampled |
| GSC RU-country queries, 90 d | 21 rows total, **4 of them Cyrillic**, 2 clicks |
| Yandex references anywhere in repo | ❌ **zero** — no `YandexBot` rule, no `yandex-verification` |
| Connections puzzle pools | en 349 · he 407 · ja 194 · sv 118 · **ru 100** · es 53 |
| `/ru/connections`, `/sv/`, `/ja/`, `/es/` | ❌ serve **English** copy, `noindex`, canonical → `/en/connections` |

### Reading of the evidence

The RU landing cluster is **not broken — it is uncrawled**. Pages shipped ~2026-08-02;
Google has simply not fetched them yet. So "add more RU pages" is not by itself the fix.
Two things actually move the needle:

1. **Discovery push** — IndexNow already exists (`app/api/indexnow/route.ts`). IndexNow
   feeds **Bing *and* Yandex**. Pinging the live RU URLs is the fastest lever we have.
2. **Yandex** — ~65 % of Russian search. We have *zero* Yandex signal: no explicit
   crawler allow, no Webmaster verification (so we cannot submit a sitemap to Yandex or
   read RU search data). This is the single biggest RU gap and it is not a content gap.

Meanwhile Connections is the one mode with a real landing that is **locked to en+he**,
while four locales each carry a healthy puzzle pool. `/ru/connections` is where both
halves of the goal intersect.

## Root cause of the Connections lock: three sources of truth

"Which locales have Connections landing copy" is currently answered in three places that
can (and do) disagree — Class 3, asymmetric paths:

| Place | Value |
|---|---|
| `app/[locale]/connections/content.ts:353` `SUPPORTED_LANDING_LOCALES` | `['en','he']` — the real gate |
| `app/[locale]/connections/page.tsx:9` local `SUPPORTED_LOCALES` | `['en','he','sv','ja','es']` — hreflang advertises 3 noindexed pages |
| `app/sitemap.ts:123` | `['en','he']` hardcoded inline |

`page.tsx` already emits `hreflang` for sv/ja/es pointing at URLs that are `noindex` and
canonicalise elsewhere — a contradictory signal shipped today. Fix = one exported list,
all three consumers derive from it.

## Deliverables

### A. Connections landing → sv, ja, es, ru

- Split `content.ts` (358 lines, would blow the 500-line rule with 4 more locales) into
  `app/[locale]/connections/content/{types,en,he,sv,ja,es,ru,index}.ts`. Import path
  `./content` is unchanged (directory `index.ts`).
- Native copy per locale — **not** translated EN. Hebrew already models this (it is
  "ראש זנב", a different cultural framing, not a translation of "Word Bridge").
- `SUPPORTED_LANDING_LOCALES = ['en','he','sv','ja','es','ru']`.
- `page.tsx` and `app/sitemap.ts` both import that list. Delete both hardcodes.
- Sample puzzles per locale come from the real generated pools so the page is honest.

### B. RU keyword landing for Connections — `/ru/igra-v-assotsiatsii-onlayn`

Slug follows the established RU transliteration convention (`filvordy-onlayn`,
`balda-onlayn`, `erudit-onlayn`). «Игра в ассоциации» is the standard Russian name for
the association word game and is the closest real-demand term to our bridge mechanic.

> **Assumption, stated:** keyword volume was *not* verified against Ahrefs (OAuth is an
> interactive flow) or GSC (RU is greenfield — 4 Cyrillic queries in 90 days, so GSC has
> nothing to rank). Chosen on convention + mechanic match. Cheap to revisit; a slug change
> later costs one 301.

Body copy must match the existing RU pages' volume (~3000+ crawlable words). The sitemap
comments are a scar record: `/blast`, `/word-craft`, `/brain/drills/*` were all noindexed
after the AdSense "low value content" rejection at 30–282 words. **No thin shells.**

Also register it in `components/landing/RuLandingLinks.tsx` so the RU cluster stays
internally linked (that is what gets a new page crawled once any sibling is crawled).

### C. Yandex

- `app/robots.ts` — add `YandexBot` / `Yandex` to the explicit-allow crawler list.
- `yandex-verification` meta, driven by `NEXT_PUBLIC_YANDEX_VERIFICATION`, omitted when
  unset (so nothing changes until the user pastes a token from Yandex Webmaster).
  Applied in both `app/layout.tsx` and `app/[locale]/layout.tsx` — they already carry
  `google-site-verification` in parallel, so the same two sites.

### D. IndexNow push (ops, post-deploy)

Submit the 6 existing RU URLs + the new one via the existing endpoint. Reaches Bing and
Yandex immediately; Google ignores IndexNow, so Google stays a waiting game.

## Explicitly out of scope

- `blogLocalesNoRu` (`app/sitemap.ts:464`) stays. Blog posts are not translated to RU;
  "fixing" it would publish English blog bodies under `/ru`.
- `es` Connections pool is 53 puzzles (thin, and memory records es as the worst daily).
  It still gets a landing — the landing is content, not puzzle inventory — but no attempt
  is made to grow the pool here.

## Discovered during implementation: Japanese is walled off

`app/[locale]/connections/PageClient.tsx:46` short-circuits `locale === 'ja'` to a
"This game mode is not available" screen. It was added in `7161c59ac` (2026-05-12) with no
stated reason — **three months before the Japanese puzzle pool existed** (194 active
puzzles), so the gate is very likely stale.

Indexing `/ja/connections` would have pointed Google at a dead end, so `ja` is **excluded**
from `SUPPORTED_LANDING_LOCALES`. `JA_COPY` is written and wired into `COPY_BY_LOCALE`
anyway (leading with 和同開珎, the established Japanese name for exactly this puzzle format
— a better keyword than any translation of "Word Bridge"). Enabling Japanese is now a
two-line change: delete the `locale === 'ja'` branch, add `'ja'` to the list. A test fails
loudly if one is done without the other.

Lifting a deliberate product gate is a product call, not an SEO one — hence flagged, not
flipped.

## Shipped

| # | Change | Files |
|---|---|---|
| A | Connections landing in sv, es, ru (+ ja copy parked) | `content.{types,sv,ja,es,ru}.ts`, `content.ts` |
| A | One source of truth for landing locales | `content.ts` → `page.tsx`, `app/sitemap.ts` |
| A | `alternateName` JSON-LD lists all localized game names | `connections/page.tsx` |
| B | `/ru/igra-v-assotsiatsii-onlayn` (~2200 words, FAQ + VideoGame + Breadcrumb JSON-LD) | new route |
| B | Registered in the RU internal-link cluster + sitemap | `RuLandingLinks.tsx`, `app/sitemap.ts` |
| C | `YandexBot` / `YandexImages` explicitly allowed | `app/robots.ts` |
| C | `yandex-verification` meta, env-gated | `app/layout.tsx`, `app/[locale]/layout.tsx` |
| D | IndexNow ping — 7 live RU URLs, `{"status":200,"submitted":7}` | ops, done 2026-08-09 |

### Owner action required (one item)

Set `NEXT_PUBLIC_YANDEX_VERIFICATION` to the token from
[webmaster.yandex.com](https://webmaster.yandex.com) → Add site → Meta tag. Until then the
tag is **absent** (not blank — a placeholder value fails verification silently), and Yandex
Webmaster cannot be used to submit the sitemap or read RU search data.

### Noted, not fixed (out of scope)

`app/api/indexnow/route.ts` has **no authentication** and falls back to a hardcoded key, so
any caller can burn our IndexNow submission quota. Not exploited for anything worse than
that, but it should get an admin guard.

### Verification (by state, not by reported status)

| Gate | Result |
|---|---|
| `tsc --noEmit` | rc=0, **0** `error TS` (first run had a real `TS2353`; a piped `\| head` had masked it as rc=0) |
| `eslint --max-warnings=0`, 16 changed files | rc=0 |
| `vitest` — sitemap ×2, robots, connections content, thin-shell | rc=0, **56/56** |
| `next build --webpack` | `BUILD_RC=0`, 0 compile errors, `BUILD_ID` written |
| `npm run check:translations` (ratchet gate) | rc=0 — "No new missing translations vs baseline" |

Two checks the advisor pushed for, both of which came back clean:
- **All `t()` keys PageClient reads (`connections.pyramid.cta`, `.tagline`, `daily.cta`,
  `community.cta`, `noAccess`) resolve in every locale, es included.** This mattered because
  ru/sv/es now execute the `renderLanding=true` path for the first time, and client `t()`
  has no en-fallback — a missing key would have put an English string on an indexed page.
- **The ja guard test genuinely fails** when `'ja'` is added to the list while the wall
  stands (verified by temporarily adding it: 2 red, then reverted).

Note: the new route builds as `ƒ` (dynamic), so `revalidate = 86400` is decorative — but
**all six existing RU landings are `ƒ` too**. Consistent with the established pattern, not a
regression introduced here. Making the RU cluster static would need `generateStaticParams`
at the `[locale]` level and is a separate change.

## Checks (project rule: TDD, one runnable check per non-trivial change)

1. `app/sitemap.test.ts` — replace the "en, he only" Connections assertion with one that
   derives from `SUPPORTED_LANDING_LOCALES`, and assert the new RU landing is emitted
   ru-only.
2. New `app/[locale]/connections/content/__tests__/copy.test.ts` — every locale in
   `SUPPORTED_LANDING_LOCALES` returns copy that is **not** the EN object (catches the
   "added the file, forgot to wire the switch" failure), has non-empty required fields,
   and ≥4 FAQ entries (JSON-LD needs real content).
3. `app/robots.test.ts` (or extend existing) — YandexBot is explicitly allowed.
