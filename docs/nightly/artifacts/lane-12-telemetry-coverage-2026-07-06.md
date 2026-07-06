status: research-only
attempted: Run posthog coverage audit, triage DEAD/CRATERED, investigate drill_completed drop and results_viewed zero
files_touched: none
next_steps: |
  1. FIX results_viewed — call site EXISTS (SinglePlayerResults.tsx:189) but 0 in PostHog. 
     Likely cause: SinglePlayerResults not mounting (game_completed fires before results route,
     classic games may use a different path). Check if resultsData ever becomes non-null in
     SinglePlayerView for classic. HIGH VALUE: would instrument every SP results view.
  2. WATCH drill_completed — 20→0 this week but only 2 starts. Likely statistical noise.
     Server-side path (processCompletion.ts:388 via getPostHogServer) looks intact. Re-check
     next week; if still 0, investigate Supabase insert failures (captureApiError path).
  3. random mode 39 starts → 0 completions — KNOWN premature-emit issue. game_started
     fires with mode=random before gameModeConfirmed gate, or server sends gameMode='random'
     in some message. completions fire with resolved mode. Low priority vs results_viewed.
findings: |
  Registry: 111 events. DEAD: 57. CRATERED: 0.
  Newly-dead (d7=0, prev7>0): drill_completed (prev7=20, tiny sample), growth:friend_added (prev7=3)
  Per-mode holes: random 39 starts → 0 completions (known), singleplayer 2→0
  results_viewed: wired in SinglePlayerResults.tsx:189 but genuine 0 in PostHog (14d window)
