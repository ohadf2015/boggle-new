---
status: shipped
attempted: wire exp-practice-wheel-cta-v1 (last dark experiment), ensure PostHog flags for wired experiments, add instrumentation events
files_touched:
  - fe-next/lib/experiments/__tests__/practiceWheelRetryCta.test.ts (new — TDD tests)
  - fe-next/lib/experiments/practiceWheelRetryCta.ts (new — pure resolver)
  - fe-next/hooks/usePracticeWheelRetryCta.ts (new — experiment hook)
  - fe-next/components/practice/PracticeWheelSandbox.tsx (wired experiment + retry CTA)
  - fe-next/lib/practice/telemetry.ts (added trackPracticeRetryClicked event)
posthog_flags:
  - exp-practice-wheel-cta-v1: exists (now wired, 50/50, 100% rollout)
  - exp-game-abandon-confirm-v1: created id=209541 (was wired but lacked PostHog flag)
  - exp-leaderboard-play-cta-v1: created id=209542 then DEACTIVATED — all 3 call sites are telemetry-only (posthogEngagement.ts comments + experiment property), no conditional render exists, variant B cannot serve; flag would poison the experiment
next_steps:
  - Dead flags (share-prompt-timing, show-signup-after-first-win, mp-signup-nudge-copy-v1) queued in triage-queue.md for human retirement
  - Rage clicks on /es/multiplayer + /he/sealed-bid unaddressed — need UX investigation
  - exp-leaderboard-play-cta-v1 needs leaderboard/PageClient.tsx refactored below 500 lines (currently 519) before variant-B can render; re-enable flag only then
---
