---
status: partial
attempted: Flag hygiene audit, new experiment exp-game-abandon-confirm-v1 (registry + GrowthEvent), analytics callback wired into useNavigationGuard, triage-queue FLAG NEEDED blocks updated.
files_touched:
  - fe-next/hooks/useNavigationGuard.ts  (onAbandonAttempt callback added — generic analytics hook point for all game exit intercepts)
  - fe-next/utils/growthTracking.ts      (game_abandon_attempted added to GrowthEvent union)
  - fe-next/lib/experiments.ts           (exp-game-abandon-confirm-v1 registered with description + wiring notes)
  - docs/nightly/triage-queue.md         (2026-06-15 section: FLAG NEEDED for 4 experiments, funnel drop note)
next_steps: |
  1. Human: create PostHog flags for all 4 dark experiments (see triage-queue.md 2026-06-15 section).
  2. Wire onAbandonAttempt callback in callers: DailyChallengeGame.tsx, useSinglePlayerCore.ts
     → trackGrowthEvent('game_abandon_attempted', { mode, score, wordCount }) — now type-safe.
  3. Wire exp-game-abandon-confirm-v1 variant into ExitConfirmation / quit-confirm modal UI
     to show score+words when variant='stats-shown'.
  4. Dead flags to retire (human PostHog action):
     - share-prompt-timing (100% rollout, 0 PostHog exposures) → keep results-page, delete flag
     - show-signup-after-first-win (100% rollout, 0 converts) → keep after-first-win, delete flag
     - adventure-difficulty-tuning (inactive) → safe delete
---
