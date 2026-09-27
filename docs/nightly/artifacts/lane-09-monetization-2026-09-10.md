status: research-only
attempted: run the brief's top IMPACT CHECK item (08-25 games-for-teachers -> for-schools nav link) before any new build

## Impact check result
Verdict appended to docs/nightly/impact-ledger.ndjson: **neutral**.
- `/education/for-schools` pageviews since 08-18: 11. `/education/games-for-teachers` pageviews: 8.
- Denominator is plausible (not zero) -> the 0-referral-count reading is real, not a measurement artifact.
- 0 of the 11 for-schools pageviews carried a `games-for-teachers` referrer. The link isn't broken
  (checked in code Sept 06, and traffic to both pages is real) — both pages just get too little total
  traffic (8-11 pv / 3 weeks) for a single internal nav link to show up as a measurable referral channel.
- Not a regression. No revert needed.

## Code-side finding (did not ship — see boundary note)
`/education/for-schools` already has a real lead-capture flow: `SchoolLeadForm` component, hero CTA
`#lead` anchor, `$149/year` pricing copy, FAQ pricing Q&A — in **6 locales** (en/es/he/sv/ja/ru).
This CONTRADICTS the STEP-2 orientation brief in this lane's own prompt ("Education free... NO pricing,
NO lead capture, NO contact-sales anywhere") — that text is stale. Lead-gen already exists; the gap is
traffic INTO it, not the presence of a CTA. Recommend updating the lane-09 prompt's STEP-2 orientation
section to reflect this (avoids a future lane re-building a form that's already live).

## Ranked backlog for tomorrow (lane 09 or lane 05/landing)
1. [S effort, real lever] The bottleneck is top-of-funnel discovery, not conversion: `games-for-teachers`
   and `for-schools` both sit at <10 pv/3wk. Look for more internal entry points into `for-schools`
   (footer, teacher dashboard empty-state, /education hub card) rather than more nav-link plumbing.
2. [S effort] Re-run this same impact-check query after any new entry point ships — the query is now
   proven and cheap: `SELECT countIf($current_url ILIKE for-schools AND $referrer ILIKE <source>) ...`.
3. [M effort, out of lane-09 scope] Ad-side: `rewarded_ad_watched` brief signal was 0/24h (7d avg ~0.29) —
   too thin to act on tonight; needs a few more days of volume before treating as a real drop.
4. Revenue snapshot (`docs/nightly/intel/revenue-latest.json`) was stale this run — founder should re-run
   `scripts/nightly/lib/pull-revenue-snapshot.sh` or provision `ADMOB_API_TOKEN` for unattended AdMob data.

files_touched: docs/nightly/impact-ledger.ndjson (1 verdict line appended)
next_steps: pick backlog item 1 (new for-schools entry point) as tomorrow's lane-09 STEP-3 action; fix the
stale STEP-2 orientation text in scripts/nightly/prompts/09-monetization.md (if it exists) re: lead-capture
already shipping.
