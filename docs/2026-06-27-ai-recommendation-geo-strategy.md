# Getting LexiClash Recommended by ChatGPT & AI Assistants (GEO Strategy)

**Date:** 2026-06-27
**Trigger:** Owner observed that ChatGPT recommends LexiClash *when named* ("what about lexiclash?") but omits it from *unprompted* lists ("word games to play with friends online").
**Goal:** Get LexiClash into the **unprompted** AI recommendation set.

---

## 1. Where ChatGPT actually gets its data (two channels)

AI assistants answer word-game questions from **two distinct sources**. Our observed behavior maps cleanly onto them:

### Channel A — Live grounded retrieval (works ✅)
When a user names us ("what about lexiclash?"), ChatGPT Search / SearchGPT issues a live web fetch. Its crawlers (`OAI-SearchBot`, `ChatGPT-User`) hit `lexiclash.live`, read our `llms.txt` + rendered HTML + JSON-LD, and cite us (the "LexiClash" footnotes in the transcript). The returned blurb — "2–20 players, private rooms, no download, 5 languages" — is lifted **verbatim from our `llms.txt`**. This channel is essentially maxed on our side (see §3).

### Channel B — Parametric memory + corroborated authority (the gap ❌)
For an **unprompted** "best word games to play with friends," the model draws on its training corpus and, when grounding, on **high-authority third-party pages**: Reddit threads, "best word games" listicles (PCGamesN, Polygon, Rock Paper Shotgun, blog roundups), Wikipedia/Wikidata, app-store listings, YouTube. These are the sources that *name multiple games in one place*, so the model treats them as the canonical "category roster."

**We are absent from Channel B.** No Wikipedia/Wikidata entity, near-zero Reddit mentions, no Product Hunt, no YouTube, thin app-store review volume. So the model has no corroborated reason to include us in the default roster — even though it *can* describe us accurately once pointed at our site.

> **Key mental model:** Channel A makes us *citable*. Channel B makes us *recommendable*. We have done the first; the second is an off-site authority problem, not a code problem.

---

## 2. The one number that matters: third-party corroboration

LLMs include an entity in an unprompted list roughly in proportion to **how many independent, reputable sources mention it alongside its category peers**. Our on-site pages — however perfect — count as a *single* source (ourselves). The fix is breadth of *independent* mentions, sequenced below by leverage-per-effort.

---

## 3. On-site status: DONE (do not re-chase)

The April GEO audit (`GEO-AUDIT-REPORT.md`) is now largely **resolved**. Verified present in repo as of 2026-06-27:

| Audit item | Status |
|---|---|
| Broken `sitemap.xml` | ✅ Fixed — `app/sitemap.ts`, ~410 URLs, full hreflang |
| hreflang for 5 locales | ✅ `langAlternates()` across all routes |
| AI-crawler robots rules | ✅ `app/robots.ts` explicit Allow for GPTBot/OAI-SearchBot/ClaudeBot/PerplexityBot/CCBot/Google-Extended/+ |
| `llms.txt` + `llms-full.txt` | ✅ Both present + per-locale variants + **Query→URL routing table** |
| Organization / WebSite / VideoGame / WebApplication schema | ✅ `app/[locale]/layout.tsx` |
| `FAQPage` schema | ✅ On landing pages (`online-word-games-with-friends`, `best-online-word-games`, etc.) |
| `ItemList` ranked listicle | ✅ `/best-online-word-games` — LexiClash #1, 9 competitors named |
| `Article` schema + author/editorial | ✅ Blog + `/about/ohad-fisher` + `/editorial-policy` |
| Comparison pages (vs Wordle/Scrabble/WWF/Quizlet/Kahoot…) | ✅ 13+ |
| `aggregateRating` | ⚠️ Intentionally **removed** — hardcoded ratings risk a Google manual action. Re-add ONLY when fed by a real review pipeline. |

**Deliberately NOT adding on-site right now (would be harmful or fake):**
- `sameAs` to X/TikTok/YouTube/Reddit — there are no such profiles yet; pointing schema at non-existent URLs degrades entity trust. Add each URL the *same day* the profile goes live.
- `WebSite` `potentialAction` SearchAction — there is no real `/search` results page; a fake one earns a GSC error, not sitelinks.

**Conclusion:** on-site marginal gains are now small. Effort should shift to §4.

---

## 4. Off-site authority playbook (the actual lever) — sequenced

Ordered by impact ÷ effort. Items 1–4 are the 80/20.

### Priority 1 — Wikidata entity (highest leverage, ~1 hr, free)
LLMs and Google's Knowledge Graph both ingest Wikidata. A structured entity is the single strongest "this is a real, known thing" signal.
- Create a Wikidata item: `LexiClash` — instance of *video game* / *word game*, with properties: official website, publisher, platform (web/Android), genre, languages, inception (2024).
- Link it back: once the Q-ID exists, add `https://www.wikidata.org/wiki/Q…` to `sameAs` in `app/[locale]/layout.tsx` and `OrganizationJsonLd.tsx` (the schema↔entity loop closes the corroboration).
- A full Wikipedia article likely won't pass notability yet — Wikidata does not require it. Do Wikidata now; revisit Wikipedia after press coverage (Priority 5).

### Priority 2 — Reddit presence (high leverage for Perplexity/ChatGPT, ongoing)
Reddit is disproportionately weighted by ChatGPT (OpenAI data deal) and Perplexity.
- Target subreddits: r/WordGames, r/boardgames, r/webgames, r/InternetIsBeautiful, r/playmygame, r/ESL, r/Teachers (education angle).
- **Authentic value first** — answer existing "word game with friends?" threads with a genuine, non-spammy mention. Do NOT astroturf; LLMs and mods both detect and discount it.
- One well-received `r/WordGames` "we built a free real-time multiplayer word game" post with positive comments is worth more than 50 listicle backlinks.

### Priority 3 — Product Hunt launch (one-time spike, ~½ day prep)
- Tuesday/Wednesday launch. Assets: GIF demo, tagline ("Real-time multiplayer Boggle with friends — no download"), 3–5 screenshots.
- Product Hunt pages are crawled by every AI engine and frequently cited in "best new X" answers. Even a modest finish creates a durable citable entity record.

### Priority 4 — Get into existing "best word games" listicles (compounding)
This is what directly populates Channel B's roster.
- Identify the top 20 ranking pages for "best online word games" / "word games to play with friends" (the same pages ChatGPT grounds on).
- Outreach to authors with a tight pitch + the press-fact block (see §5). Offer a free embed/demo. Getting added to 3–5 of these is the most direct path to unprompted inclusion.
- Lower-friction wins: free-game directories (CrazyGames ✅ already, itch.io, Poki submission, alternativeto.net — list LexiClash as an alternative to Words With Friends/Wordle/Scrabble).

### Priority 5 — YouTube + app-store depth (slower, durable)
- 3 short gameplay/explainer videos. Gemini and ChatGPT weight video for game entities; YouTube is also a top-cited domain.
- Drive Google Play review volume past ~50 with replies — review count is an authority signal AI engines read from store pages.
- After 2–3 of the above land, a Wikipedia draft becomes plausible (needs ≥2 independent reliable sources).

---

## 5. Press-fact block (paste into outreach, directory listings, PH, and any "facts" request)

> **LexiClash** is a free, browser-based **real-time multiplayer word game**. 2–20+ players race to find words on the same letter grid simultaneously — a full match takes 2–3 minutes, versus the days-long turns of Words With Friends. No download, no signup, no pay-to-win. Create a room, share a link or QR code, and play instantly across phone, tablet, and desktop. Eight game modes (Multiplayer Grid Battle, Word Hunt Survival, Daily Word Wheel, Adventure, Blast, Brain Drills, Vocabulary Duels, Party). Available in English, Hebrew (RTL), Swedish, Japanese, and Spanish. Founded 2024. Play free: https://www.lexiclash.live

Keep this wording consistent everywhere — repeated identical phrasing across independent domains is exactly the corroboration signal Channel B rewards.

---

## 6. Measurement

- **Monthly probe**: ask ChatGPT, Perplexity, Gemini, and Copilot the *unprompted* query "best word games to play with friends online" — track whether LexiClash appears, and at what position. This is the north-star metric for this effort.
- Secondary: Google Play review count, Reddit mention count (search), referring domains in GSC, whether a Wikidata Q-ID exists.
- Re-run after each Priority item ships; expect Channel-B inclusion to move only after items 1–4 compound (weeks, not days).

---

## 7. TL;DR

1. ChatGPT already describes us accurately from `llms.txt` when named — **on-site is done**.
2. It omits us unprompted because we lack **third-party corroboration** (Wikidata, Reddit, Product Hunt, listicles).
3. Do, in order: **Wikidata → Reddit → Product Hunt → listicle outreach → YouTube/store depth.**
4. Use the identical §5 press-fact block everywhere so independent sources reinforce one entity description.
5. Track via the monthly unprompted-query probe in §6.
