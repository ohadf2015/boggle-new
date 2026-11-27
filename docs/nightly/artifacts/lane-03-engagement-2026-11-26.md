status: shipped
attempted: Investigate rage clicks on /he/daily/word-wheel (top brief item) + flag hygiene sweep + new experiment/instrumentation per lane-03 goals.
files_touched: docs/nightly/triage-queue.md, docs/nightly/reports/2026-11-26.md, docs/nightly/impact-ledger.ndjson (docs only; no fe-next code changed by this lane)
shipped_this_run: >
  Deactivated 7 zombie PostHog feature flags (active:true, zero code call sites anywhere
  in fe-next) via scripts/nightly/lib/posthog-experiment.sh deactivate (reversible soft-kill,
  not delete): exp-connections-hint-unavailable-feedback-v1, exp-connections-howtoplay-tap-v1,
  exp-leaderboard-play-cta-v1, exp-mp-entry-cta-eager-press-v1, exp-mp-probe-skip-v1,
  exp-profile-back-to-room-v1, exp-wordtower-busy-tap-feedback-v1. Ages 16-160 days; the code
  that once read them was likely lost to this repo's 51+-night no-commit streak. Verified
  deactivation via API response ({"status":"deactivated",...}) for all 7.
findings:
  - The brief's #1 item (rage clicks on /he/daily/word-wheel) is ALREADY addressed: a prior
    lane shipped exp-wordwheel-short-word-feedback-v1 on 2026-11-25 (wired in
    WheelActionBar.tsx, flag live id 379437, rollout 100%) but it's still sitting UNCOMMITTED
    in the working tree along with ~4 other wired-but-uncommitted experiments from lanes going
    back to 2026-11-05 (exp-edu-locked-tile-feedback-v1, exp-edu-join-loading-feedback-v1,
    exp-wordtower-placing-nudge-v1, exp-avatar-randomize-feedback-v1). All already have live
    PostHog flags (confirmed via flags sweep) — no `ensure` action needed.
  - Swept all 32 experiment keys in lib/experiments.ts against the PostHog flags list.
    11 "exp-*" flags exist in PostHog with NO matching experiments.ts entry; 4 of those were
    already active:false (clean). The other 7 were still active:true and silently bucketing
    real traffic into a no-op variant — those are the ones deactivated above.
next_steps: >
  (1) STEP 4 instrumentation (2-3 new analytics events) was not reached this run — the zombie-flag
  investigation consumed the time budget. Pick it up next scheduling.
  (2) exp-wordtower-busy-tap-feedback-v1 (now deactivated) targets the same rage-click surface as
  tonight's brief item "/en/word-tower" (score 0.439) — if that idea is still wanted, re-wire it
  properly in experiments.ts before re-activating, don't just flip it back on blind.
  (3) The real blocker is still Headline 0/1 from learnings.md: until a nightly commit actually
  lands, every lane's wired code (including the 5 experiments found here) stays invisible to
  production and PostHog flags will keep drifting out of sync with code like this.
