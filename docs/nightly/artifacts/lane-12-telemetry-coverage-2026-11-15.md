status: research-only
attempted: ran posthog coverage audit (DEAD/CRATERED/per-mode holes), triage, fix one high-value event wiring issue
files_touched: none (docs/nightly/reports/2026-11-15.md append only, outside fe-next/)
next_steps: 4 events (first_word_found, mode_selected, streak_ignition_shown, next_step_shown) cratered to 0 this week, all firing from the post-game results path. Call sites look correct in isolation; StreakIgnitionCard gates on isLoaded (useWinStreak). Check whether the results-screen parent still mounts these cards, and whether SinglePlayerGame.tsx vs a newer QuickClassicBoard is the live singleplayer path. Also re-check dead_time_detected — "fixed" 2026-11-11, cratered again tonight (25 vs 188).
