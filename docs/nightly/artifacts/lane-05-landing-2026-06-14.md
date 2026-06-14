status: shipped
attempted: polish:try:crane:bc0c7105 — Near-Miss Shudder for crane/word-tower mode
files_touched:
  - fe-next/lib/wordTower/towerLean.ts (added NEAR_MISS_THRESHOLD_DEG + isNearMiss pure fn)
  - fe-next/lib/wordTower/__tests__/towerLean.test.ts (5 new tests for isNearMiss)
  - fe-next/components/wordTower/WordTowerPlay.tsx (nearMissKey state + effect + prop pass)
  - fe-next/components/wordTower/WordTowerScene.tsx (nearMissKey prop, amberFlash state, shake effect, amber overlay)
  - fe-next/app/globals.css (crane-near-miss-shake keyframe + utility)
next_steps: browser verify on /word-tower — place words until lean > 3.2deg to confirm shudder + amber flash fires; consider haptic pulse on nearMiss for mobile
