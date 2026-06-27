# Breaking Past 2k Google Impressions/Day — Strategy

**Date:** 2026-06-27
**Goal:** Grow past the ~2k/day Google Search impression ceiling; improve GEO, SEO, virality. Explicitly NOT Wordle-emoji sharing.
**Method:** Real GSC data (28d, `sc-domain:lexiclash.live`) + full codebase audit of SEO/virality/content infra.

---

## TL;DR — what's actually going on

The site is **not under-optimized**. It is a mature, heavily-worked SEO property (410 sitemap URLs, 5 locales w/ full hreflang, 7 JSON-LD schema types, llms.txt + per-locale + llms-full.txt, AI crawlers allowed, 140 blog URLs, 25 competitor/keyword landings, dynamic OG per result/challenge/boss/rank, referral system, async challenges).

**The "build more pages" playbook has already been run to exhaustion — and it plateaued.** ~900 programmatic pages were noindexed in June as thin/failed (127 `/anagram/[letters]` "failed", 0% CTR; ~780 daily-archive pages = AdSense thin-page remediation; word-list letter pages noindexed at "0 clicks & ≤2 impressions"). Adding more thin pages is the trap already sprung.

**Two real constraints remain:**

1. **CTR collapse on impressions already earned.** 41,759 Google impressions/28d (~1,490/day) → only **260 clicks = 0.62% CTR**. Expected at these positions: 5–6%. ~80% of earned clicks leak.
2. **Domain authority + distribution ceiling.** 410 URLs on a low-authority domain → Google rations how many it ranks → impressions plateau. The lever that lifts this is **backlinks + branded search**, neither of which more landing pages produce.

---

## Shipped today — and what it does NOT yet do (no over-claiming)

| Shipped | Moves Google impressions? | Reality |
|---|---|---|
| **Bing IndexNow** (11 pages) | **No** — Bing only. Google ignores IndexNow. | Real Bing clicks (Bing CTR 3.8% = 6× Google), Google untouched. |
| **Embeddable WOTD widget** (`/[locale]/embed/word-of-the-day`, frame-ancestors verified in-test) | **Not yet** — only *if embedded by third parties*. | A built lever with a **distribution dependency**. Backlinks materialize only on adoption. |
| **Diagnosis + strategy** | n/a | The high-value output: the ceiling is authority+distribution, not SEO mechanics. |

**Honest bottom line:** the 2k ceiling is **not broken yet**. The deliverable is *diagnosis + one built lever + a named distribution dependency*. The widget is inert until someone embeds it.

**Named adoption risk:** "will anyone embed a no-name's word-of-the-day card?" is unanswered — and for a backlink lever, **adoption IS the product**. The vocabulary card is the laziest beachhead; the **demand-matched follow-up** is a daily-*puzzle* embed (maps to the rising, uncontested `מילת היום` market the vocab card doesn't). Treat the WOTD widget as a cheap bet; if it gets zero embeds in a few weeks, pivot to the puzzle embed or drop it.

**Distribution (the actual next move, non-code):** seed the widget where intent-matched embedders live — Israeli word-game/education forums & WhatsApp groups (Hebrew daily-word), ESL/teacher blogs (education angle already built). Without seeding, the widget produces nothing.

## The data (28d, ending 2026-06-25)

| Engine | Clicks | Impressions | CTR |
|---|---:|---:|---:|
| Google | 260 | 41,759 | 0.62% |
| Bing | 152 | 4,002 | 3.80% |

- **One market carries the site: Spanish "scrabble" intent.** `/es/juego-de-palabras-multijugador` owns ~25k of 41k impressions — `scrabble online` alone = 12,611 impr at pos 5, 0.36% CTR.
- **Bing converts 6× Google (3.8% vs 0.62%)** yet the top Spanish pages are **missing from Bing entirely**.
- **Hebrew daily-word queries** (`המילה היומית` 570 impr, `מילת היום` 314) sit pos 8 and are **rising** — page-1-edge, zero Hasbro competition.

---

## ⚠️ Impression-quality verdict (verified 2026-06-27, device+country GSC split)

`scrabble online` by device: **Desktop pos 5.2 → 0.61% CTR** (4,911 impr), Mobile pos 4.9 → 0.18%, by country Argentina pos 4.7 → 0.29%, Spain pos 5.4 → 0.40%. A genuine organic pos-5 on **desktop** (no app-pack) should convert ~5%; 0.6% is ~8× below. CTR rescue on the bare-trademark "scrabble" cluster is **structurally unwinnable** (below AI Overview/ads/official Scrabble apps + clone-brand intent mismatch) — a better title cannot fix it.

**Consequence: ~25k of the 41k Google impressions are low-quality "scrabble" vanity impressions.** They inflate the impression count but the audience wants *actual* Scrabble and won't convert. **Chasing more scrabble impressions grows the vanity number while adding zero users.** The qualified long-tail is the only convertible slice (`jugar scrabble en español gratis` desktop = 1.92% CTR, 3×) — real users hide behind "gratis / sin descarga / alternativa" qualifiers.

**Reframed goal:** don't optimize for raw impression count (it's gameable with vanity scrabble traffic). Grow impressions **in markets where intent matches the product** — daily word games (Hebrew `מילת היום` rising, uncontested), education (no Hasbro), "alternativa"/qualified seekers. Those impressions convert.

## Why CTR is collapsed (reframe)

The es page metadata is already strong (good title/desc/OG/hreflang/VideoGameJsonLd). 0.36% CTR at "pos 5" for `scrabble online` is abnormal even so. Two structural causes, not a metadata-polish problem:

1. **Intent/brand mismatch** — people searching the generic trademark "scrabble online" want *actual* Scrabble; a clone brand ("LexiClash") buried under Hasbro/EA results gets skipped. Generic `scrabble online` (12.6k impr) is likely **structurally unwinnable**.
2. **Impression-weighted "average position" hides reality** — a true pos-5 doesn't convert at 0.3%; much of that volume is probably pos 10–15 or sits below an AI Overview / app-install pack.

**Action gate:** before any metadata rewrite, do ONE live-SERP look (or GSC country/device split) on a *Spanish-qualified* query (`scrabble en español`, `jugar scrabble online gratis`). If an AI Overview / install pack eats the top, CTR rescue is impossible — skip it. Spanish-qualified queries are the convertible ones; generic `scrabble online` is not.

---

## Plan — ranked by (leverage ÷ effort), evidence-backed

### Tier 1 — Free wins, ship immediately (serve impressions + clicks now)

1. **Bing IndexNow on the working Spanish + Hebrew pages.** Pages rank on Google, missing on Bing, Bing converts 6×. IndexNow key already live (`/207c6c1a7de212bfab82a5acf0b02280.txt`). One signed POST. Pure upside.
2. **Hebrew daily — already internally linked; needs authority, not links.** Verified: `/he/blog/milat-hayom-habit` already links to `/he/daily` with keyword-matched anchor `שחק את מילת היום`, and ES/SV cross-linking was already shipped (`072dd0db9`, `c7c17df67`). Internal-linking is **maxed** — adding more is churn. The rising Hebrew daily-word market (`מילת היום`, uncontested, intent-matched) is the best target for the **embed widget** (Tier 2) and any new authority, not more internal links.

### Tier 1.5 — The one Google-DIRECT, distribution-independent lever (verified, do next)

**Enrich `/he/daily` for the rising `מילת היום` market.** GSC: `המילה היומית` (570 impr) and `מילת היום` (314 impr, +1000% w/w) rank **pos 8 on `/he/daily`** — a thin force-dynamic game canvas with almost no crawlable text. A dedicated rich landing `/he/hamila-hayomit` exists but is *not* the page Google ranks. This is the only lever that grows **Google** impressions without waiting on backlinks, in an uncontested intent-matched market.
- **Action:** add a small server-rendered above-fold intro + FAQPage block (`מה זה מילת היום?`) to `/he/daily`, OR resolve the `/he/daily` ↔ `/he/hamila-hayomit` keyword split so one page wins cleanly. Pos 8→page 1 in the best market.
- **Blocked right now:** `/he/daily`'s mission/quest files are being actively rewritten by a concurrent session (quest-overhaul). Editing now risks collision. Do it in a clean session. Frame as "verify which URL should rank," not a blind rebuild.

### Tier 2 — The ceiling-breaker: manufacture backlinks (the one infra gap)

3. **Embeddable daily-puzzle / word-of-the-day widget** (`/embed/...`, iframe-friendly, `X-Frame-Options` allowed only on this route). The ONLY viral loop the site lacks. Every embed on a teacher's site / blog / Israeli word-game forum = a backlink (authority) + a brand impression (branded search). Backlinks → domain authority → *every existing page ranks higher* → the impression ceiling itself rises. This is also non-emoji virality (the user's explicit constraint) and ties directly to the education angle already being pushed (free, no-signup, classrooms). Add an "Embed this" snippet generator on the daily/word-of-the-day page so embedders can actually grab the code.

### Tier 3 — CTR rescue: DROPPED for the scrabble cluster (verified unwinnable)

4. The device/country split (above) settled the gate: desktop pos-5 at 0.6% = structural, not a snippet problem. **Do not invest in scrabble-cluster metadata rewrites.** The only sliver worth a light touch is the qualified long-tail (`...gratis`, `alternativa...`), and even there the absolute volume is small. Energy belongs in Tier 2 (authority) and intent-matched markets, not here.

### Tier 4 — GEO (infra exists; needs a citable reason, not more llms.txt)

5. The llms.txt surface is already comprehensive. The missing GEO lever is the same widget (third-party embeds get the brand cited by AI crawlers) + unique citable data (e.g. daily solve-rate stats as a public, structured, citable dataset). Lower priority than 1–3.

---

## Explicitly NOT doing (and why)

- **More programmatic/landing pages** — already run to exhaustion; ~900 noindexed as thin. Net-negative to domain quality.
- **Wordle-emoji result sharing** — user ruled it out; also already partially exists.
- **Generic `scrabble online` metadata tuning** — structurally unwinnable intent mismatch; effort sink.
- **Abstract "virality flywheel" essays** — the concrete instance is the embed widget. Build it, don't theorize it.

---

## Verification trail

- GSC pull: `docs/seo-daily/2026-06-27.md`
- Retirement reason verified via `git log`: `66bfec926` ("failed" anagram family), `6cec0b638` (AdSense recovery), `app/[locale]/words/starting-with/[letter]/page.tsx:24` ("0 clicks & ≤2 impressions → noindex").
- Virality infra audit: dynamic OG routes under `app/api/og/*`, referral under `app/api/referral/*`, **no embeds/iframes** (confirmed gap).
