# Content Improvement Brief — Blog + Landing Pages (2026-09-12)

## SHIPPED (2026-09-12, uncommitted pending user approval)

Landing pages:
- `/en/online-word-games-with-friends` — H1 exact-phrase "Words With Friends Online", new voice intro, "Why Real-Time Beats Turn-Based" section, "free without the app" FAQ, 20→50 players.
- `/sv/swedish-multiplayer-word-game` — native intro rewrite, new "Bilda ord av bokstäver" H2, corporate section de-stuffed, 20→50.
- `/es/juego-de-palabras-multijugador` — story-led body rewrite (page.tsx + data.ts FAQs), 5→6 idiomas fix.
- `/en/play-boggle-online-free` — "What is Boggle online?" FAQ added (first position), 20→50 + 5→6 language fixes in FAQ/stats/features/JSON-LD.

Blog:
- NEW post `death-of-turn-based-word-games` — 5 locales (en/he/sv/ja/es), natively adapted per locale (ZOO not QI in SV, "את" in HE, FE in ES, LINE/佳代子 in JA). Wired: content.ts, page.tsx, PageClient.tsx, lib/blog/data.ts, sitemap.ts, llms.txt.
- Polished EN blocks: `most-popular-word-games-2026`, `free-word-games-online` (hooks, keyword-variant headings, FAQ direct answers).

Validation: lint 0 errors · 40,800 tests pass · build OK (route prerendered).

## Follow-ups (not done)
- RU adaptation of the new post (ru exists but post ships without it; add slug to RU_TRANSLATED_BLOG in sitemap.ts when done).
- Locale catch-up for the 2 polished posts (EN-only polish).
- Dedicated hero image for the new post (currently reuses /images/blog/multiplayer-social.jpg).
- Defend pages per §1 remain untouched, as intended.
- **Blog-wide renderer wart**: every post's PageClient renders `section.content.split('\n\n')` as raw `<p>` text — `**bold**`/`*italic*` markers in older posts render as literal asterisks to readers. Our new post ships clean (markers stripped). Proper fix: shared paragraph renderer that parses bold/italic + codemod the ~30 PageClient copies, or strip markers from all legacy content.ts files.

---

> Working doc for the "improve blog + landing content" goal. Sources: GSC 28d
> (`docs/seo-daily/2026-09-12.md`), Bing Copilot grounding data
> (`docs/nightly/ai-search/2026-09-01.json`), live SERP research (2026-09-12).

## 1. Ground truth: what's already working (don't break it)

| Page | Signal | Rule |
|---|---|---|
| `/en/boggle-word-shake-free` | 1,700 AI citations, "daily word wheel" share 52% | DEFEND — internal links + FAQ only, no rewrite |
| `/en/daily-word-wheel` | 1,500 citations | DEFEND — same |
| `/en/best-online-word-games` | 953 citations, "best free browser word games multiplayer" share 41% | DEFEND — light polish only |
| `/en/competitive-word-games` | 346 citations | Light polish |

## 2. Highest-leverage targets (from data)

1. **`/es/juego-de-palabras-multijugador`** — 29k of 61k total impressions, 0.6% CTR vs 4% expected. Queries: "scrabble online", "scrabble en español", "scrabble online gratis", "scrabble en linea". Fix snippet + page copy → est. +700 clicks/mo. **#1 priority.**
2. **`/en/play-boggle-online-free`** — "boggle online" (851 imp, pos 9.5), "online boggle", "free boggle", "boggle online free". Rank-up to page 1 via H1/FAQ/content depth.
3. **`/en/online-word-games-with-friends`** — "words with friends online" (896 imp, pos 10.5), "words with friends online play free" (614 imp, pos 9). Exact-phrase H1 + FAQ entry.
4. **`/sv/swedish-multiplayer-word-game`** — "scrabble svenska" (1,291 imp, 0.2% CTR), "bilda ord av bokstäver" (171 imp, pos 9.4). Title leads with "Scrabble Svenska"; add H2 "Bilda ord av bokstäver".
5. **Blog posts** — raise human quality + keyword coverage sitewide (see §4).

## 3. Research: what ranks + engages in 2026

From SERP + SEO research (see conversation sources):
- **Human-first is the ranking factor**: engagement signals (dwell, scroll, return visits), not keyword density. Keyword stuffing penalized.
- **E-E-A-T**: first-person experience, real opinions, specifics ("I tried all 9 and most suck" beats "there are many options").
- **Intent match**: game queries = "let me play now" → lead with play CTA + honest comparison, not history lessons.
- **Listicles dominate** the education/ESL SERP: "10 fun vocabulary games", "33 vocabulary activities", "no-prep", grade modifiers.
- **Structure for skimmers + AI answers**: short paragraphs, H2/H3 question headings, concise 40-60 word direct answers under question headings (citable by AI Overviews/Copilot), FAQPage schema already present on main landers.
- **Semantic coverage**: cover the query family ("boggle online", "online boggle", "free boggle", "boggle game online free") naturally in H1/first 100 words/subheads — not repetitions, variants.
- **Brand voice** (from .impeccable.md): quirky, electric, loud, party energy + competitive edge. Neo-brutalist personality. Not corporate.

## 4. Blog improvement principles (apply to every rewritten post)

- Hook in first 2 sentences: opinion, story, or surprising fact — never throat-clearing ("In today's fast-paced world…").
- First-person experience where true; concrete numbers/names over adjectives.
- One idea per paragraph, 2–4 lines; H2s that promise something ("The mode that ruins friendships" > "Game modes").
- Keywords: primary in title + first 100 words; variants in H2s; question H2/H3 with direct answers for AI citability.
- End with one clear CTA (play the mode), not a generic "conclusion" section.
- Keep what's cited — posts with AI citation share get polish, not rewrites.

## 5. Locale discipline

- EN/ES/SV pages above are per-locale native copy — each edit gets back-translation + fluency check per seo-improve STEP 4b.
- New strings via `t()` keys; no hardcoded UI text. Hebrew unaffected unless a page is shared.
- Positive framing only ("free, browser-based"); never fake stats/ratings; JSON-LD only via `components/seo/*`.
