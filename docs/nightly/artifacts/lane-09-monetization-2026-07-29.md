status: research-only
attempted: IMPACT CHECK from brief (district-CTA-to-lead-form, shipped 07-21) — verified via PostHog before doing new work.

## IMPACT CHECK result — no new verdict appended (see why)
- `growth:school_lead_submitted` NOT in PostHog taxonomy at all (0 events, ever).
- `growth:school_lead_form_viewed` = 1 view in last 14 days.
- Code IS wired correctly: `SchoolLeadForm.tsx:86` fires `trackGrowthEvent('school_lead_submitted', ...)` on submit, `:30` fires `school_lead_form_viewed` on mount, test `SchoolLeadForm.test.tsx:56` confirms. This is a traffic problem, not a broken instrumentation/CTA bug.
- **This exact item was already caught and fixed last night (2026-07-28)**: ledger already has a verdict line for `09-monetization-2026-07-21-district-cta-to-lead-form` (verdict: neutral, measured: 0) with root-cause note — CTA was near-invisible (`bg-neo-purple/20`), fixed to lime + autocapture tracking on the classroom-game page.
- `check_after_days: 7`, only 1 day has elapsed since that fix shipped → re-measuring now and appending a second verdict would be premature/duplicate. Did NOT touch the ledger further tonight.
- **Next steps for whichever lane picks this up next**: re-run the same query in ~6 more days (2026-08-03+) once traffic has had time to respond to the lime CTA fix. If `school_lead_form_viewed` is still ~1/14d by then, the funnel problem is upstream of the CTA (classroom-game page itself has near-zero traffic) — check `growth:education_upsell_impression` trend, not the CTA color again.

## Other brief signal (not actioned)
- `rewarded_ad_watched`: 1/24h vs 7d avg 2.29 — single-day sample, not enough signal to act on (could be normal low-traffic-hour variance for a nightly run). Left for tomorrow's brief to confirm as a real trend before touching ad-UX.

## Why no code shipped tonight
Spent the lane verifying the standing IMPACT CHECK (correct priority per brief — "if REGRESSED, fixing/reverting is TOP task"; turned out neutral-not-regressed, already actioned yesterday). No fresh safe/small action was left with enough time budget remaining to TDD + land + self-verify before the finalize cutoff. Ranked backlog for tomorrow, highest priority first:
1. Re-check `growth:school_lead_form_viewed` trend after the 07-28 lime-CTA fix has had a week to run (see above).
2. Confirm `rewarded_ad_watched` dip is a real trend (not 1-day noise) before any ad-UX change.
3. Original STEP-3 option 1 (education upsell lead-gen CTA) — already live via `SchoolLeadForm`/`/education/for-schools`; no further net-new surface identified as missing tonight.

files_touched: none (code). docs/nightly/impact-ledger.ndjson: read-only this run, no new line appended (see rationale above).
next_steps: see ranked backlog above; re-verify district-CTA impact after 2026-08-03.
