status: shipped
attempted: Brain Drill Post-Session Word Replay — founder BUILD vote (idea:build:913934c2). polish:try:brain-drill:b44951e9 (Anti-Drill Surprise Round) evaluated but deferred — cosine-distance scoring too complex for budget.
files_touched:
  - fe-next/components/drills/LightningRound.tsx (passes topMissedWords to complete phase)
  - fe-next/components/drills/LightningRoundCompletePhase.tsx (letter-by-letter staggered reveal + score delta)
  - fe-next/components/drills/__tests__/LightningRoundCompletePhase.topMissedWords.test.tsx (5 test cases)
next_steps: extend word replay to other drill complete phases (PatternSwitcher, ComboMaster, MemoryHunt, RareGems); Anti-Drill Surprise Round needs cosine distance endpoint before it can ship
