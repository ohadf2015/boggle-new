status: research-only
attempted: audit GrowthEvent registry vs PostHog 14d volume, classify DEAD/CRATERED/holes, identify highest-value fix
files_touched: none
next_steps: |
  TOP FIX: brain-drill emits 8 game_completed but 0 game_started — wire trackGameStart('brain-drill',...) in /brain/drills/* page client at session start, mirroring drill_started event already firing there.
  INVESTIGATE: wheel-rush 25 started vs 2 completed (8%) — check WheelRushGame end handler fires trackGameEnd.
  WATCH: growth:adventure_level_start 0 d7 vs 8 prev7 — wired in useAdventureSFXAndAnalytics.ts, likely low traffic (8 adventure starts in 14d total).
  WATCH: growth:iap_viewed 0 d7 vs 12 prev7 — wired in RemoveAdsProbe.tsx:23, fires on settings mount; possibly fewer settings visits.
  NOTE: random 95 game_started/1 completed is NOT a bug — game_started captures pre-resolution intent; game_completed fires with resolved mode.
  NOTE: signup_prompt_shown 20 vs 94 (-79%) correlates with overall MP traffic drop (-54% mp_session_game), not a regression.
