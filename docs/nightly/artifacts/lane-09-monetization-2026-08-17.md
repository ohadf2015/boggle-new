status: research-only
files_touched: none

## Why: whole standard playbook already shipped in prior nights

Checked all 4 prioritized options from the prompt before writing code — every one is already
built and wired, not a gap:

1. **Education lead-gen** — `app/[locale]/education/for-schools/` has a full lead form
   (`SchoolLeadForm.tsx`), a working API (`app/api/education/school-lead`), and an admin
   review dashboard (`app/api/admin/school-leads`, `app/[locale]/admin/school-leads`).
   `DistrictUpsellStrip` / `TeacherAccessCTA` components link into it and are mounted on
   `games-for-teachers`, `esl-word-games`, `spelling-bee-practice`, `vocabulary-games-classroom`.
   `education/duels` correctly has NO upsell strip — it's an authed in-classroom student
   tool (`TeacherGate`-wrapped), not a marketing landing page; adding one there would be wrong.
2. **Ad-UX telemetry** — `rewarded_ad_offered/watched/declined` are dual-emitted
   (`utils/growthTracking.ts`) and called from 10+ real surfaces (`DoubleGoldAdButton`,
   `TimeLowAdPrompt`, `WatchAdButton`, `useRewardedAd.ts`, adventure/daily/drills). Brief's
   "0/24h rewarded_ad_watched" reading is a genuine low-volume signal, not a missing-instrumentation
   gap — nothing to wire.
3. **IAP/subscription interest probes** — `RemoveAdsProbe` (mounted in `settings/PageClient.tsx`)
   and `SupporterInterestCard` (mounted in `profile/PageClient.tsx`) both fire `iap_viewed`.
   `teacher/upgrade/PageClient.tsx` already has a district/school bulk-pricing CTA linking to
   `/education/for-schools` with its own `iap_viewed` event. Nothing unwired here either.
4. **Revenue snapshot** — `docs/nightly/intel/revenue-latest.json` absent (confirms brief's
   own "stale" note). Founder should run `scripts/nightly/lib/pull-revenue-snapshot.sh`
   (interactive Playwriter) or provision `ADMOB_API_TOKEN` if unattended revenue signal
   is wanted.

## What I did NOT do
Did not run a full PostHog schema-first query workflow to measure conversion on the
IAP probes / district CTA — that's a legitimate next step but is real wall-clock (schema
discovery + query-trends), and every candidate CODE change for tonight turned out to
already exist, so there was no edit left to make that query would justify at this budget.

## next_steps (ranked for tomorrow's lane-09 run)
1. **Measure before building more**: query `iap_viewed` (by `surface`/`product`) and
   `district_inquiry` click-through over last 14–30d via PostHog. If `RemoveAdsProbe` /
   `SupporterInterestCard` have near-zero exposure, the lever is DISCOVERABILITY (where
   they're placed on settings/profile), not new probes — don't add a 3rd probe blind.
2. If `rewarded_ad_declined` reasons skew heavily toward one bucket (e.g. `no_ad_provider`
   on web where H5 ads are still gated OFF), that's a config/fill issue for AdSense
   approval, not a UX fix — hand off to Lane 08 boundary note, don't duplicate.
2b. Revenue snapshot missing — flag to founder (`pull-revenue-snapshot.sh` / `ADMOB_API_TOKEN`).
3. Do NOT re-propose: for-schools lead form, DistrictUpsellStrip rollout, RemoveAdsProbe,
   SupporterInterestCard, teacher upgrade district CTA — all confirmed shipped and wired
   2026-08-17, re-verify only if a future audit claims one is missing.
