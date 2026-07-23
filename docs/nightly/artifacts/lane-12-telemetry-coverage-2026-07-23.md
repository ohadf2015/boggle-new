status: research-only
attempted: audit GrowthEvent registry vs PostHog 7d live volume, identify DEAD/CRATERED/newly-dead events, fix highest-value wired-but-silent regression
files_touched: docs/nightly/reports/2026-07-23.md
next_steps: |
  1. Fix posthog-coverage.sh classifier to probe `growth:<event>` volume — eliminates ~25/33 false-positive DEAD flags
  2. Confirm results_cta_clicked status: 0 volume bare AND growth-prefixed; check if exp-results-replay-cta-v1 is active in PostHog
  3. Wire one of the 8 genuine never-wired P1 events: friend_added, challenge_sent, leaderboard_viewed, or hint_used
