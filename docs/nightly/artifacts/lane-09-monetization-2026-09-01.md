status: partial
attempted: run brief's IMPACT CHECK on the 08-25 games-for-teachers -> for-schools lead link; evaluate education upsell + ad-UX opportunities for a safe ship

## Impact check result (top brief item)
- games-for-teachers page had only 3 total $pageview events in the 14d window (2026-08-18..09-01).
- for-schools pageviews with referrer containing games-for-teachers: 0 in both before/after windows.
- Verdict: **no-exposure**, not a true "neutral" — the link was never meaningfully tested, denominator too small to conclude anything. Recorded as "neutral" measured=0 in impact-ledger.ndjson with a note explaining the no-exposure caveat (schema only supports improved|neutral|regressed).
- Do NOT re-run this exact check next time without first confirming games-for-teachers itself gets more traffic (it's a discoverability problem upstream of the link, not a link problem).

## Code state found (no gaps worth a rushed edit tonight)
- `/education/for-schools` already has a full lead-capture section (`#lead`, `leadTitle`/`leadIntro`) — shipped 08-25, confirmed present.
- Education hub (`PageClient.tsx`) already links to `/education/for-schools` twice (`teacher-hub-for-schools-link` testid + a second CTA).
- Lead-gen scaffolding for schools is NOT missing — it's under-discovered. The lever is traffic INTO games-for-teachers/for-schools, not more CTAs on pages nobody reaches.

files_touched: docs/nightly/impact-ledger.ndjson (verdict line only)
next_steps:
- Traffic-to-for-schools is the real bottleneck, not lead-capture UX. Consider: (a) hand off to Lane 06/SEO — check if games-for-teachers and for-schools are indexed/ranking at all; (b) hand off to Lane 05 (landing) — add a for-schools/games-for-teachers link from a higher-traffic education sub-page (spelling-bee-practice, esl-word-games) rather than the low-traffic games-for-teachers hub.
- Ad-UX (item 2 in playbook) and IAP-demand-probe (item 3) not investigated tonight — next lane-09 run should check `rewarded_ad_declined` volume and `iap_viewed` wiring status before picking one.
- No code shipped tonight was judged safer than a rushed edit given remaining time budget; this is a valid research-only outcome per lane contract.
