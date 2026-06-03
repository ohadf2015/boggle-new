status: shipped
attempted: Wire dailyLetterPool into Word Tower via useWordTowerAdRewards hook (founder directive)
files_touched:
  - fe-next/lib/wordTower/useWordTowerAdRewards.ts (NEW - hook bridging useRewardedAd to refillViaAd)
  - fe-next/lib/wordTower/__tests__/useWordTowerAdRewards.test.ts (NEW - 6 TDD tests)
next_steps:
  - Verify tests pass (background process running at finalize cutoff)
  - Wire hook into Word Tower PageClient: show CTA banner when isPoolExhausted=true
  - Add i18n keys for "Watch ad to get +15 letters" in 5 locales
  - Add word-tower surface to RewardedSurface in lib/admob-config.ts
  - Pass dailyPool from generateDailyLetterPool into useWordTower opts in PageClient
  - Sabotage rival + hint rewarded surfaces = founder directive phase 2
notes:
  - Pure layer complete: dailyLetterPool.ts (14 tests, shipped 06-03)
  - Manager layer complete: refillPoolViaAd + isDailyPoolExhausted in wordTowerManager.ts
  - Hook layer complete: useWordTower already has dailyPool/refillViaAd/isPoolExhausted
  - This lane adds missing AD BRIDGE layer only - no UI yet
  - rewardKind=feature prevents double-reward (letters AND coins)
