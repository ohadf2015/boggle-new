---
name: seo-improve
description: "On-demand SEO/GEO improvement run for LexiClash — the same flow the nightly lane 6 runs, invocable any time. Scrapes Bing's enriched AI-visibility data (Intent / Topic / Citation Share per grounding query), pulls the GSC+Bing seo-daily report, then makes targeted, multi-locale, native-reviewed copy/schema edits. Use when the user says 'run seo', 'improve seo', 'seo improvement', '/seo-improve', 'optimize search visibility', or asks to act on AI-visibility / Copilot citation data."
argument-hint: "[--no-scrape] [--report-only] [--days 28]"
user-invocable: true
agent: seo-specialist
---

# SEO Improvement Run

Acts on LexiClash's search + AI-visibility data with concrete, shipped edits. This is the
nightly **lane 6** flow made runnable on demand — same data sources, same guardrails, no
midnight wait. The canonical step-by-step lives in
`scripts/nightly/prompts/06-seo.md`; this skill is the manual entry point.

Working dir: `/Users/ohadfisher/git/boggle-new`. Be terse, act fast.

## Inputs (all optional)
- `--no-scrape` — skip the Bing AI-visibility scrape (use the existing `docs/nightly/ai-search/<today>.json` if present).
- `--report-only` — pull data + report, **do not edit any files**. For a read-only audit.
- `--days 28` — seo-daily analysis window (default 28).

## Prerequisites
- Bing WMT + GSC creds (see the `seo-daily` skill's Prerequisites). Missing → degrade, don't fail.
- For the AI-visibility scrape: Playwriter extension connected + a logged-in Bing WMT tab. If offline the scrape skips gracefully; continue from GSC + Bing search data alone.

## Workflow

### 1. Pull Bing AI-visibility data (unless `--no-scrape`)
Run `bash scripts/nightly/lib/bing-ai-perf-scrape.sh`. It writes
`docs/nightly/ai-search/<YYYY-MM-DD>.json` with:
- `totals` — `total_citations`, `avg_cited_pages`.
- `grounding_queries[]` — `{ query, intent, topic, citations, citation_share }`. **This is the enriched section** — Bing now labels each Copilot grounding query with an Intent, a Topic cluster, and our % Citation Share.
- `cited_pages[]` — `{ url, citations }`.

Skip-gracefully: if the file doesn't appear, the scrape was offline; proceed without it.

### 2. Pull the GSC + Bing report
Invoke the `seo-daily` skill:
```
--site sc-domain:lexiclash.live
--bing-site https://lexiclash.live/
--repo /Users/ohadfisher/git/boggle-new
--days <days>
--no-pr
```
It writes `docs/seo-daily/<today>.md`. Read it.

### 3. Use the AI-visibility metadata to bias target picking
Don't just read the columns — let them drive priority:
- **`intent`** — queries whose intent is "Learn"/"Solve" (and any education-shaped query text) are the **founder-priority education segment**. Prioritize them for education-module CTR / FAQ / GEO work.
- **`citation_share`** — **HIGH (>40%) = we already dominate → defend only** (internal links + `FAQPage` schema; do NOT rewrite the working page). **LOW (<15%) with high `citations` = contested high-traffic query → highest-leverage target**: optimize the cited page for that exact query.
- **`topic`** — a topic that maps to no real mode = off-thesis, don't chase it. Use topic to group multi-query landing pages.
- **`cited_pages` top 5** are working — only add internal links + `FAQPage` schema, no aggressive title rewrites.

### 4. Stop here if `--report-only`
Print the picked targets (query · intent · topic · citation_share · current pos) and exit. No edits.

### 5. Edit (mirror `06-seo.md` STEP 2–6)
- Self-audit ground truth first: `fe-next/app/sitemap.ts`, `fe-next/public/llms.txt`, `fe-next/app/[locale]/page.tsx` + 2–3 mode pages. Never contradict or fabricate features/stats.
- Pick UP TO: 3 CTR opportunities, 2 rank-up (pos 8–25), 1 new landing page (only if a >50-impr/28d high-intent query has no good page).
- New landing pages exist in **all 5 locales** (en/he/sv/ja/es) via `t()`, Hebrew RTL-safe. English-only intent → `isTargetLocale` + `META_FALLBACK` + `robots:{index:false}` on non-English.
- **Autonomous native-language review** (06-seo.md STEP 4b): for every non-English string you write, back-translate → meaning check → native-fluency rewrite. Never emit "needs human review."
- HARD rules: JSON-LD only via `components/seo/*` wrappers; no fake `aggregateRating`; no fabricated stats; positive framing only ("ad-free"/"browser-based", never "0 downloads"); reuse existing i18n keys; new routes update `sitemap.ts` + `llms.txt`.

### 6. Validate + finish
- `cd fe-next && npm run lint && npm run test && npm run build` (scope to changed files where possible).
- Summarize: files edited, queries targeted (with intent/share), native-review verdict per locale, new landing (or "none").
- **Do not commit/push unless the user asks** — when invoked manually the user drives the commit; the nightly orchestrator handles it in headless runs.

## Notes
- The scrape captures the **top ~25** grounding queries / pages (Bing's default page size), ranked by citations — ample for targeting. The script echoes the counts so the cap is visible.
- The intel collector (`scripts/nightly/lib/intel/collect-search.sh`) turns these into signals: magnitude from `citations`, `evidence` carrying `intent · topic · share`.
