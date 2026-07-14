status: partial
files_touched:
  - fe-next/utils/abandonOnPagehide.ts (added emitAbandonOnSpaNavigate export)
  - fe-next/hooks/useGameStartTelemetry.ts (wired SPA-navigate abandon on unmount)
  - fe-next/lib/experiments.ts (added exp-homepage-click-feedback-v1 definition)
next_steps:
  - Wire exp-homepage-click-feedback-v1 in LandingModeCubes.tsx (501 lines, deferred for time) — PostHog flag created (id=226295), bucketing users, variant=no-op until wired
  - Review 7 experiments >14d old for human retirement: exp-results-replay-cta-v1 (42d), exp-invite-arrival-clarity-v1 (28d), exp-mp-quickplay-wait-v1 (28d), exp-leaderboard-play-cta-v1 (25d), exp-game-abandon-confirm-v1 (25d), exp-practice-wheel-cta-v1 (25d), exp-wordhunt-hint-v1 (24d)
  - Verify growth:game_abandoned reason=spa_navigate appears in PostHog after 24h
