You are running the nightly SEO/GEO/CTR lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new. Be terse, act fast.

═══ LEARNINGS FROM PRIOR RUNS (preamble — apply throughout) ═══
__LEARNINGS__

═══ SKILLS TO USE ═══
From the **Specialized Skills** table above, invoke the skills listed for **lane 06 SEO**. `seo-daily` is mandatory (instruction in Step 1). `humanizer` should run on generated meta descriptions to avoid AI-tells in SERPs.

═══ FOUNDER PRIORITY: EDUCATION KEYWORDS ═══
Education is a top growth target. In the GSC/Bing analysis this run, explicitly surface and act on EDUCATION-intent queries (e.g. "spelling practice", "vocabulary builder", "word games for students/classroom/ESL", "learn english words"). Prioritize CTR/rank-up opportunities and FAQ/GEO content that capture education-intent search and point at the education module.

═══ STEP 0 — Pull Bing AI Performance + Keyword Research data ═══

**AI Performance (Copilot citation data — UI-only, scrape via Playwriter):**
Run `scripts/nightly/lib/bing-ai-perf-scrape.sh` BEFORE invoking the seo-daily skill. It writes `docs/nightly/ai-search/__TODAY__.json` with: `totals` (citations + avg_cited_pages over the default window), `grounding_queries` (which Copilot questions cited us), `cited_pages` (which of our URLs AI cites most).

Each grounding query now carries Bing's **enriched AI-visibility metadata** — use it, don't just read past it:
- `intent` — Bing's intent label (e.g. "Learn and Solve", "Informational", "Media"). **Education lever:** treat `intent` containing "Learn"/"Solve" (and any query whose text is education-shaped) as the founder-priority education segment — prioritize those for the education-module CTR/FAQ/GEO work below.
- `topic` — Bing's topic cluster (e.g. "Puzzle & Strategy Games", "Gaming"). Use to spot off-thesis citations (a topic that doesn't map to a real mode = don't chase it) and to group multi-query landing pages.
- `citation_share` — our % share of citations for that query. **HIGH share (>40%) = we already dominate → defend only (internal links + FAQPage schema), do NOT rewrite the working page. LOW share (<15%) with high citations = contested high-traffic query → highest-leverage target: optimize the cited page for that exact query.**
- `citations` — absolute citation count (drives the intel-signal magnitude/severity).

Skip-gracefully — if the scrape fails (Chrome closed, Playwriter extension offline), the JSON file won't exist; continue without it. Lane 6 still works from GSC + Bing search data alone.

**Keyword Research API (works via REST):**
For the top 5 grounding queries from `ai-search/__TODAY__.json`, call Bing's `GetKeywordStats` endpoint to enrich with Bing search-volume trends:

```
GET https://ssl.bing.com/webmaster/api.svc/json/GetKeywordStats?q=<urlencoded>&country=us&language=en-US&apikey=$BING_WMT_API_KEY
```

Returns historical impressions per date — use to identify queries where we have AI citations but LOW Bing organic (= opportunity to capture the organic clicks too).

**Action priority** (use this data to bias seo-daily picks):
- AI-winning pages (`cited_pages` top 5) should NOT get aggressive title rewrites — they're working. Only add internal links + FAQPage schema for `grounding_queries` they answer.
- AI-winning queries that have LOW Bing organic = highest-leverage SEO target. Optimize the cited page for that exact query.
- Cited pages on non-English locales (`/he`, `/es`) — translate the top 1-2 grounding queries into those locales for the lane's locale-specific edits.

═══ STEP 1 — Invoke seo-daily skill ═══
Invoke the `seo-daily` skill with these inputs:
  --site sc-domain:lexiclash.live
  --bing-site https://lexiclash.live/
  --repo /Users/ohadfisher/git/boggle-new
  --days 28
  --no-pr      (project disallows branches; ship direct to master)

The skill writes `docs/seo-daily/__TODAY__.md`. Read it.

═══ STEP 2 — Self-audit BEFORE picking targets ═══
Survey ground truth before writing copy:
  • Read `fe-next/app/sitemap.ts` for real routes.
  • Read `fe-next/public/llms.txt` for canonical product description.
  • Skim `fe-next/app/[locale]/page.tsx` + 2-3 mode pages for actual feature names, modes, languages supported (en/he/sv/ja/es).

NEVER contradict ground truth. NEVER fabricate features, modes, stats, or testimonials.

═══ STEP 3 — Pick targets (cap totals) ═══
From today's report, pick UP TO:
  • 3 CTR opportunities (meta/title/description)
  • 2 rank-up opportunities (pos 8-25; expand H2 + add 2-3 internal links)
  • 1 NEW landing page (only if high-intent query >50 impr/28d has NO good page)

SKIP if:
  • Existing meta already contains target query verbatim
  • Brand-only term ("lexiclash")
  • Query intent doesn't match a real feature

═══ STEP 4 — Multi-locale by default ═══
New landing pages MUST exist in en, he, sv, ja, es. Single route at `fe-next/app/[locale]/<slug>/page.tsx` using `t()`. Strings in `fe-next/messages/{en,he,sv,ja,es}.json`. Hebrew RTL-safe.

EXCEPTION: English-only intent (e.g. "esl word games") → `isTargetLocale` + `META_FALLBACK` pattern (see `fe-next/app/[locale]/lexiclash-vs-wordwall/page.tsx`), `robots: { index: false }` on non-English.

═══ STEP 4b — AUTONOMOUS native-language review (do NOT flag for a human) ═══
The old flow wrote "flag for native review" — that left AI-generated he/sv/ja/es copy
(FAQ answers, meta, landing strings) sitting unreviewed for nights. You are multilingual:
REVIEW AND FIX it yourself, data-driven, before finishing. For EVERY non-English
user-facing string you wrote or edited this run:
  1. **Back-translate** the target-language string to English as a naive reader would.
  2. **Meaning check:** compare that back-translation to the INTENDED English source. If
     meaning drifted, was lost, or a term is wrong → fix the target string.
  3. **Native-fluency check:** does it read as written by a native speaker, or as a literal
     machine translation? Inspect idiom, word order, register/tone (match the brand: quirky,
     energetic), and locale punctuation (Hebrew RTL + Hebrew quotation/maqaf; Japanese
     particles + 。、; Spanish ¿¡; Swedish å/ä/ö). Invoke the **ux-writer** skill's bar:
     native, not literal — rewrite anything that reads translated.
  4. **Fix in place.** Re-run the two checks on the rewrite until both pass.
  5. This review is MANDATORY and AUTONOMOUS — never emit "needs native review" / "AI-generated,
     flag for human". Record the verdict in STEP 7 instead (strings reviewed, strings rewritten).
Same review applies to any localized copy lane 5 touches — FAQ answers in
`fe-next/app/[locale]/page.tsx` `seoContent[locale].faq`, page meta, and landing strings.

═══ STEP 5 — Edit safely (HARD RULES) ═══
  • JSON-LD only via `components/seo/*` wrappers — pre-commit hook BLOCKS raw script-injection.
  • NO fake `aggregateRating` JSON-LD.
  • NO fabricated stats ("50K+ players", "4.7★").
  • POSITIVE framing only — never "0 downloads"/"0 ads"; use "browser-based"/"ad-free"/"free".
  • Reuse `errors.*` and existing i18n keys — grep before creating new ones.
  • New routes update `fe-next/app/sitemap.ts` AND `fe-next/public/llms.txt` (if AI-discoverable).

═══ STEP 6 — Cap + finish ═══
NO FILE-COUNT CAP — ship everything the work genuinely needs. The lint/test/build gate validates correctness and changes are encapsulated (only your own files are touched), so never drop real edits to hit a number; just keep the change focused + coherent.

DO NOT COMMIT. DO NOT PUSH. The orchestrator (`scripts/nightly/run.sh`) commits + pushes once for all lanes after the build/lint/test gate.

═══ STEP 7 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 5 — SEO/GEO
- Edited: <list of files>
- Queries targeted: <list with impr/pos>
- Native review (STEP 4b, autonomous): <per-locale: N strings reviewed, M rewritten — NOT "needs human review">
- New landing: <slug or "none">
```
