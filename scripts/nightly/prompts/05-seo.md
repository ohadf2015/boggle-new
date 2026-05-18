You are running the nightly SEO/GEO/CTR lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new. Be terse, act fast.

═══ LEARNINGS FROM PRIOR RUNS (preamble — apply throughout) ═══
__LEARNINGS__

═══ STEP 1 — Invoke seo-daily skill ═══
Invoke the `seo-daily` skill with these inputs:
  --site sc-domain:lexiclash.com
  --bing-site https://lexiclash.com/
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
New landing pages MUST exist in en, he, sv, ja, es. Single route at `fe-next/app/[locale]/<slug>/page.tsx` using `t()`. Strings in `fe-next/messages/{en,he,sv,ja,es}.json`. Hebrew RTL-safe. Non-English AI-generated — flag for native review.

EXCEPTION: English-only intent (e.g. "esl word games") → `isTargetLocale` + `META_FALLBACK` pattern (see `fe-next/app/[locale]/lexiclash-vs-wordwall/page.tsx`), `robots: { index: false }` on non-English.

═══ STEP 5 — Edit safely (HARD RULES) ═══
  • JSON-LD only via `components/seo/*` wrappers — pre-commit hook BLOCKS raw script-injection.
  • NO fake `aggregateRating` JSON-LD.
  • NO fabricated stats ("50K+ players", "4.7★").
  • POSITIVE framing only — never "0 downloads"/"0 ads"; use "browser-based"/"ad-free"/"free".
  • Reuse `errors.*` and existing i18n keys — grep before creating new ones.
  • New routes update `fe-next/app/sitemap.ts` AND `fe-next/public/llms.txt` (if AI-discoverable).

═══ STEP 6 — Cap + finish ═══
PER-LANE CAP: __PER_LANE_CAP__ files. If your edits exceed this, REVERT the lowest-priority ones until you're at or below.

DO NOT COMMIT. DO NOT PUSH. The orchestrator (`scripts/nightly/run.sh`) commits + pushes once for all lanes after the build/lint/test gate.

═══ STEP 7 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 5 — SEO/GEO
- Edited: <list of files>
- Queries targeted: <list with impr/pos>
- Locales needing native review: <list>
- New landing: <slug or "none">
```
