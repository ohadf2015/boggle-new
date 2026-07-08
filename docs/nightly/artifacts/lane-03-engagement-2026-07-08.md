status: shipped
files_touched:
  - fe-next/lib/experiments.ts (new exp-connections-hint-gate-v1)
  - fe-next/components/connections/PuzzleCard.tsx (cursor feedback fix x3 + experiment wire)
  - fe-next/components/connections/ConnectionsGame.tsx (hint_used + game_abandoned analytics)
next_steps: monitor exp-connections-hint-gate-v1 conversion (game_completed connections); confirm connections_hint_used fires in PostHog after deploy
