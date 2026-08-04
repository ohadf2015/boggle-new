status: research-only
attempted: ran impact-check queries for district_inquiry CTA + classroom_for_schools CTA autocapture; investigated rewarded-ad decline reasons for an ad-UX fix; checked revenue snapshot freshness
files_touched: docs/nightly/impact-ledger.ndjson (2 verdict lines appended, no code changed)

## Impact checks (from brief)
- `growth:iap_viewed` product=district_inquiry, 7d: **0** (baseline 0) → verdict `neutral`, not regressed — CTA shipped 2026-07-20, still zero exposure.
- `$autocapture` cta=classroom_for_schools, 7d: **0** (baseline 0) → verdict `neutral`, not regressed — CTA shipped 2026-07-28.
- Both appended to docs/nightly/impact-ledger.ndjson.

## Why no code shipped tonight
- Zero clicks on both education CTAs across 2 separate shipped windows (07-20, 07-28) points to a **traffic/discoverability problem on `/education/for-schools` + `/education/vocabulary-games-classroom`**, not a CTA-copy/placement problem. Shipping a 3rd CTA tweak there tonight would be guessing without a traffic signal — out of lane-09 scope, hand off to Lane 05/06 (landing/SEO) to check organic traffic to those two routes first.
- Rewarded-ad decline volume is too small to act on: `growth:rewarded_ad_declined` = 4 total events/7d (3× "Ad dismissed without reward" on `retry` surface, 1× "Ad not ready" on `catchup` surface). n=4 is not enough signal to justify a UX change on a surface adjacent to the reward economy — guardrail says no speculative ad-flow edits.
- Prior monetization scaffolding already live and correctly wired: `RemoveAdsProbe` (components/ads/) mounted in `settings` + `profile` PageClients, `SupporterInterestCard` (components/monetization/) likewise — both instrumented with `iap_viewed`. No gap found; re-shipping either would be duplicate work.
- Revenue snapshot (`docs/nightly/intel/revenue-latest.json`) is absent (confirms brief's "stale/absent" note) — founder needs to run `pull-revenue-snapshot.sh` (interactive Playwriter) or provision `ADMOB_API_TOKEN` for unattended AdMob revenue data; nothing a lane can fix.

## Ranked backlog for tomorrow / other lanes
1. **[Lane 05/06 hand-off]** Check organic traffic (GSC impressions/clicks or PostHog pageviews) to `/education/for-schools` and `/education/vocabulary-games-classroom`. If traffic is also ~0, the CTA fixes are moot until the pages get discovered — SEO/landing work outranks another CTA tweak.
2. **[open]** `ADMOB_API_TOKEN` provisioning or a fresh `pull-revenue-snapshot.sh` run — unblocks unattended eCPM/fill-rate signal for this lane instead of relying on thin PostHog ad-event counts.
3. **[open, low priority]** Rewarded-ad decline reasons on `retry`/`catchup` surfaces — re-check in a week once sample size grows past ~4/7d before considering any UX change.

next_steps: Lane 05/06 should verify traffic to the two education-upsell pages before any further CTA iteration; re-run this lane's impact checks again in ~7d once (or if) traffic exists.
