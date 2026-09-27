status: shipped
attempted: Word Forge Iron Streak Bonus — grid border glow at thresholds 3 (orange) and 5 (red+pulse), wiring the visual payoff that was missing for the already-implemented streak mechanic
files_touched:
  - fe-next/components/wordForge/WordForgeGrid.tsx  (added ironStreak prop + ring-2 glow classes)
  - fe-next/components/wordForge/WordForgeGame.tsx  (passes ironStreak={run.state.ironStreak} to grid)
next_steps: >
  Hint tile at streak 5 (free illuminated tile hint) — the spec called for this but was
  scoped out for time. Hook state + translations already exist; needs: pick a random
  non-selected tile, pass hintTilePos from hook to grid, render a subtle highlight class.
  Also: misfire sound cue when streak resets could amplify the emotional impact.
