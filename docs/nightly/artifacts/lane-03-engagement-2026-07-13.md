status: shipped
files_touched:
  - fe-next/components/singleplayer/game/components/PortraitGameLayout.tsx
  - fe-next/translations/en.js
  - fe-next/translations/he.js
  - fe-next/translations/sv.js
  - fe-next/translations/ja.js
  - fe-next/translations/es.js
  - docs/nightly/impact-ledger.ndjson
  - docs/nightly/triage-queue.md
  - docs/nightly/reports/2026-07-13.md

shipped:
  - Impact check: blast watchad rageclick fix IMPROVED (0 vs 8 baseline, 7d) — verdict appended to ledger
  - Wired exp-singleplayer-word-goal-v1 in PortraitGameLayout (portrait/mobile); word-goal variant shows "N / 10 words" badge bottom-right in classic/survival modes
  - Added singlePlayer.wordGoalUnit translation key in 5 locales (en/he/sv/ja/es)
  - Created PostHog flag exp-singleplayer-word-goal-v1 (id:225006, 50/50, control vs word-goal)
  - Triage queue: flagged exp-mp-room-join-loading-v1 zombie (code reverted, flag still live in PostHog); flagged 4 experiments >14d for human stat review

next_steps:
  - Human: deactivate exp-mp-room-join-loading-v1 in PostHog UI (id:219697) — 0 call sites, serving dead variant
  - Human: check PostHog experiment results for exp-results-replay-cta-v1 (40d), exp-leaderboard-play-cta-v1 (24d), exp-mp-quickplay-wait-v1 (27d), exp-invite-arrival-clarity-v1 (27d) — retire winners
  - Next lane: wire LandscapeGameLayout + DesktopGameLayout for same badge (portrait only tonight)
  - Next lane: add 2-3 funnel gap events (game_abandoned, homepage_mode_card_tap) — ran out of budget
