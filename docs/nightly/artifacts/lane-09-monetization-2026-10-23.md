status: research-only
attempted: checked for a safe, small monetization lever — education lead-gen CTA and rewarded-ad telemetry wiring.
files_touched: none

findings:
- `/education/for-schools` (app/[locale]/education/for-schools/{page.tsx,content.ts}) already ships a full,
  honest school/district lead-capture flow: hero CTA "Get a school quote", mid-page lead form
  (leadTitle/leadIntro), FAQ, pricing table, 6-locale content (en/he/sv/ja/es/ru). No gap to fill here —
  this was my top candidate and it's done.
- Rewarded-ad analytics (`rewarded_ad_offered`, `rewarded_ad_watched`, `rewarded_ad_declined`) are all
  already wired in `utils/growthTracking.ts` (lines ~1802/1813/1824). Tonight's brief signal
  (`ad_event_rewarded_ad_watched` 0/24h, 7d avg 0.14) is a traffic/volume issue, not a missing-instrumentation
  one — nothing to fix in code.
- Did not find a 3rd safe candidate (ad-UX reflow, IAP-interest probe) I could scope, TDD, and self-verify
  inside the remaining time window without risking a half-finished edit under the guardrail (no new ad
  surfaces without a flag + retention review).

next_steps:
- Ad volume is the real lever, not instrumentation: if `rewarded_ad_watched` stays near-zero across multiple
  nights, the next useful lane-09 slice is auditing WHERE the 6 rewarded surfaces actually prompt (are CTAs
  visible/discoverable?), not adding new events.
- IAP/subscription interest probe (`iap_viewed`, flagged, no purchase path) remains a good candidate for a
  future night with a full 15+ min budget — needs its own TDD cycle, don't rush it.
- Revenue snapshot (`revenue-latest.json`) still thin per the brief note — founder should run
  `scripts/nightly/lib/pull-revenue-snapshot.sh` interactively when able.
