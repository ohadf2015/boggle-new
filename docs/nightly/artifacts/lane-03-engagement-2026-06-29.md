status: research-only
attempted: rage-click triage on word-wheel + leaderboard; flag hygiene sweep; PostHog flag ensure for exp-wordhunt-hint-v1; new experiment design for word-wheel drag hint

files_touched: none (time budget exhausted before code changes)

findings:
  - exp-wordhunt-hint-v1: WIRED (WordHuntResultsContent.tsx) + PostHog flag EXISTS (confirmed live)
  - exp-daily-hub-streak-nudge-v1: IN PostHog but NOT in experiments.ts and NOT wired in any component -> zombie flag, human should delete from PostHog
  - exp-leaderboard-play-cta-v1: events in posthogEngagement.ts but NO component renders the play-cta variant; PostHog flag INACTIVE. Half-wired = unwired.
  - share-prompt-timing + show-signup-after-first-win: old-style usePostHogFlag (pre-registry), 90+ days; need result data to retire
  - Word-wheel rage clicks (#1, score 0.887): root cause = drag-to-spell mechanic not tap-discoverable; no experiment targets this; NEW experiment needed

next_steps: |
  1. Add exp-wordwheel-drag-hint-v1 to fe-next/lib/experiments.ts
  2. Wire minimal drag-hint overlay in WordWheelGame.tsx (show "Swipe to spell" for 3s on first game, dismiss on pointerdown)
  3. Add trackWheelDragHintSeen + trackWheelDragHintDismissed to growthTracking.ts
  4. Run posthog-experiment.sh ensure exp-wordwheel-drag-hint-v1 control drag-hint "..."
  5. Delete exp-daily-hub-streak-nudge-v1 from PostHog (zombie flag)
  6. Wire exp-leaderboard-play-cta-v1 play-cta render in leaderboard PageClient.tsx, then re-activate
