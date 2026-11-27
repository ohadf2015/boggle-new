status: partial
files_touched:
  - fe-next/utils/growthTracking.ts (new GrowthEvent union member: adventure_locked_world_tapped)
  - fe-next/components/adventure/WorldMapNode.tsx (fire the event from the locked-orb onClick, no behavior change otherwise)
  - fe-next/components/adventure/__tests__/WorldMapNode.lockedTap.test.tsx (new test, written first per TDD)
next_steps: >
  Scoped down from the brief's goal 2 (new typed flagged experiment) to goal 3 (instrumentation) only,
  given the 15-min lane budget - ran out of time to safely wire + verify a new PostHog-flagged variant on
  the complex animated WorldMapNode component. eslint on the 3 changed files is clean. Could not confirm
  the new test's pass/fail locally: the test runner invocation failed in this environment for reasons
  unrelated to the code change (a stale cached dependency resolution error), and a fallback local binary
  path did not exist at the repo root. Tomorrow's lane 03 should: (1) confirm this test runs green in the
  authoritative gate, (2) pick up the he/word-tower/daily rage-click target (PlotPanel.tsx busy-tap
  opacity-60 disabled state, DailyFlowChrome.tsx skip-button vanishing on a loading flag with no
  placeholder) which was investigated but not fixed this run, (3) do the flag-hygiene sweep (decided-
  experiment removal) and the STEP 3b PostHog flag ensure-sweep, both skipped entirely this run for time,
  (4) exp-practice-wheel-cta-v1 remains a dead PostHog flag (inactive, 0 call sites in code, not even in
  lib/experiments.ts registry) - either wire it or confirm it can be deleted in PostHog.
