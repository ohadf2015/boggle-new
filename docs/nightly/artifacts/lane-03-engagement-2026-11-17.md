status: shipped
attempted: Investigate he/word-tower/daily rageclicks (top brief item, reach=38), flag hygiene sweep, propose+wire one experiment, instrument gaps.
files_touched:
  - fe-next/components/wordTowerV2/LetterRow.tsx
  - fe-next/components/wordTowerV2/V2Dock.tsx
  - fe-next/components/wordTowerV2/WordTowerV2.tsx
  - fe-next/lib/experiments.ts
  - fe-next/utils/growthTracking.ts
summary: Root-caused the brief's #1 rage-click surface to a silent no-op — tapping
  the letter tray while a built word is "placing" (crane swing) is swallowed with
  no feedback. Wired exp-wordtower-busy-tap-feedback-v1 (control=silent legacy,
  shake-feedback=brief tray shake) at the single shared pointer-down choke point,
  plus a new wt2_busy_tap event (fires both arms) so the raw tap rate is measurable
  either way. PostHog flag ensured live via posthog-experiment.sh (was already
  created 2026-11-10 by a dropped prior-night attempt — this is the first time
  code actually consumes it). Found a second dangling flag
  (exp-wordtower-placing-nudge-v1, 0 code refs) targeting the same surface from an
  earlier dropped attempt — logged to triage-queue.md, left untouched.
  No decided-winner flags retired (none found with p<0.05/n>=1000 in budget).
  Could not run eslint/tsc — shared fe-next/node_modules was mid-broken
  (ERR_MODULE_NOT_FOUND on eslint itself) at verification time, likely a
  concurrent lane's install; reviewed the diff manually instead (types flow
  through existing ExperimentKey/GrowthEvent unions, no new `any`).
next_steps: Gate's authoritative lint/tsc/build run is the real verification for
  tonight's diff. After 3 days, check the impact-ledger query_hint — compare
  rageclick count on /he/word-tower/daily against the 38 baseline, and split
  wt2_busy_tap by variant to confirm shake-feedback doesn't just suppress retries
  without reducing frustration. Next lane: wire or disable
  exp-wordtower-placing-nudge-v1 (triage-queue.md).
