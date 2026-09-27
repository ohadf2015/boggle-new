status: shipped
attempted: audit GrowthEvent registry vs PostHog live volume, find newly-dead or wired-but-silent events, fix highest-value item TDD
files_touched:
  - fe-next/utils/growthTracking.ts (added daily_challenge_completed to CANONICAL_DUAL_EMIT)
next_steps: |
  - OPEN: results_viewed = 0 despite 81+69 singleplayer completions (word-wheel/survival isMultiplayer=null).
    growth:results_viewed also 0. SinglePlayerResults.tsx useEffect not firing. Needs deeper investigation.
  - Most "DEAD" registry events fire as growth:event — coverage classifier needs growth:-prefix awareness
    OR more events should join CANONICAL_DUAL_EMIT
  - daily_challenge_completed now dual-emits; verify in PostHog after deploy
