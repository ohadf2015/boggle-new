status: research-only
attempted: PostHog coverage audit + per-mode completion analysis + wired-but-silent regression triage
files_touched: none
next_steps: |
  REGRESSION: leaderboard_viewed wired 06-23 (fe-next/app/[locale]/leaderboard/PageClient.tsx:124,
  useEffect mount) — 17 pageviews in 14d window, 0 PostHog events. Likely PostHog init timing
  on this route. Fix: check lazyPosthog initialization race in PageClient mount; consider adding
  a posthog.ready() guard or using the queued capture pattern.
  
  Next P1 never-wired: profile_viewed, friend_added (social loop signals, clear mount points).
  
  brain-drill game_started: fix (06-26) confirmed correct in code; needs traffic to validate
  (0 brain-drill plays since deploy).
  
  random mode 0 game_completed: by-design (host picks random, completes fire under resolved mode).
  adventure 0 game_completed: by-design (stars-gated: all 5 plays = 0 stars = game_abandoned fires).
