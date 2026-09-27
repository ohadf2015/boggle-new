# Education landing — teacher search-intent SEO/GEO/CTR pass

**Date:** 2026-05-30
**Goal:** Make `/education` win the queries teachers actually type, and make the orphaned teacher landing pages discoverable.

## Evidence (live GSC + URL Inspection, 90d)

- `/education` pages get **0 impressions / 0 clicks** over 90 days. Zero teacher/classroom/ESL/vocabulary queries site-wide. Site only ranks for `scrabble online` clusters.
- URL Inspection (GSC):
  - `/en/education` — **Submitted and indexed**, last crawl 2026-05-05 → *indexed but buried* (intent/copy problem).
  - `/en/education/vocabulary-games-classroom` — indexed, crawl 2026-05-22 → *buried*.
  - `/en/education/games-for-teachers` — **URL is unknown to Google** → *never discovered* (crawl-equity problem). The most teacher-targeted URL Google has never seen.
- Cause of "unknown": variants linked **only** from the hub (crawled May 5); **footer links zero education pages**. The high-traffic scrabble pages never point at education, so crawl equity never flows there.

## Real teacher intent (directional — competitor SERP titles / PAA, not validated volume; Ahrefs OAuth skipped)

Recurring high-intent patterns:
- "free vocabulary games for the classroom" + **"no login / no account / no setup / no prep"** ← maps to LexiClash's real moat (join-code, no student accounts, ad-free)
- "games to play with any vocabulary words" / **custom word list** — teachers want THEIR words
- grade-band + ESL qualifiers (middle school, high school, all ages, ESL/EFL)
- "vocabulary review games", "word games to play in class", whole-class multiplayer

**Core mismatch:** hub H1 = *"The word-game platform built for your language — not translated to it."* (brand positioning) and `<title>` = *"Education Hub — Word Games for Classrooms & Teachers"* (generic). Neither matches teacher query language. CTR optimization is downstream — there are no impressions yet, so this pass targets *intent-match + discoverability*, not CTR-on-existing-rank.

## Changes (all reversible, copy/links only)

### Track A — Discoverability (highest leverage)
1. **Footer "For Teachers" column** (sitewide) → links Education Hub + Vocabulary Games + Games for Teachers + ESL Word Games. Pushes crawl equity from every page (incl. ranking scrabble pages) into the orphaned variants. New `footer.*` i18n keys ×5.
2. **De-orphan `spelling-bee-practice`** — add it to peer cross-links (currently linked only from hub).

### Track B — Intent-match copy + GEO
3. **Hub `<title>`/description** (`seo.educationHub`) → lead with high-intent phrasing: "Free Vocabulary Games for the Classroom — No Student Logins". CTR + ranking-intent lever.
4. **Hub visible H1/sub** (`education.landing.hero`) → lead with teacher intent (free, no login, own word lists, whole-class); keep native-5-language moat in the sub.
5. **Hub FAQ** (page.tsx `seoContent`, 5 locales) → add two GEO-citable, high-intent Q&A:
   - "Can I use my own vocabulary or word list?" (custom-list intent)
   - "Do students need to download or install anything?" (browser/Chromebook intent)
   These feed the FAQPage JSON-LD → AI-answer + featured-snippet capture.

## Out of scope / deferred
- CTR tuning on scrabble queries (off-task, separate from teachers).
- Ahrefs volume validation (interactive OAuth; phrasing treated as directional).
- New backlinks / off-site authority (can't do in-repo).

## TDD
- `Footer` renders For-Teachers nav + 4 education hrefs (RTL-safe).
- `seo.educationHub` title/description contain intent keywords (regression guard on CTR copy).
- Exported hub `seoContent.en.faq` includes the 2 new questions → flows into FAQ JSON-LD.

## Verify
- `npm run lint && npm run test && npm run build`.
- Playwriter render `/en/education` + `/he/education` (RTL) — H1 + footer column fit.
- Re-pull URL Inspection after deploy + request indexing for `games-for-teachers`.
