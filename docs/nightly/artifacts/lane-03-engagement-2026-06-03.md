---
status: partial
files_touched:
  - fe-next/lib/wordTower/dailyLetterPool.ts (NEW — pure module)
  - fe-next/lib/wordTower/__tests__/dailyLetterPool.test.ts (NEW — 14 tests, TDD-first)
next_steps: |
  Wire into wordTowerManager.ts (optional pool field + applyTowerWord draw-from-pool),
  add refillFromAd action to useWordTower.ts, add i18n keys (5 langs),
  wire useWordTowerAdRewards.ts to AdMob rewarded API, add exp_tower_daily_pool_v1 flag.
---
