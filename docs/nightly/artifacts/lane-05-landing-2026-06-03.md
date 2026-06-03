status: partial
attempted: Founder directive — Word Tower daily letter pool (finite letters + reward-ad refill surfaces)
files_touched:
  - fe-next/lib/wordTower/wordTowerManager.ts (added dailyPool+adRefillCount to state, daily-aware initWordTowerState + applyTowerWord, refillPoolViaAd, isDailyPoolExhausted)
  - fe-next/lib/wordTower/useWordTower.ts (refillViaAd action, dailyPool opt, isPoolExhausted return)
next_steps: |
  Core logic + hook wiring done. Still needed:
  1. useWordTowerAdRewards.ts — hook wrapping useRewardedAd x3 (letters/hint/sabotage); use generateAdRefillLetters(gameCode,lang,adRefillCount) for letters
  2. WordTowerPoolOverlay.tsx — pool gauge + exhausted overlay with 3 CTAs (canShowAd-gated)
  3. WordTowerPlay.tsx — wire daily=true -> pass generateDailyLetterPool('daily-YYYY-MM-DD', language) to useWordTower; import+render overlay; pass tower.state.game.adRefillCount
  4. Translations (5 locales) — add wordTower.pool.{exhausted,remaining,adLetters,adHint,adSabotage}
  key_facts:
    - dailyPool null = endless, string[] = daily finite mode
    - WORD_TOWER_DAILY_POOL_SIZE=100, WORD_TOWER_AD_REFILL_COUNT=15 (dailyLetterPool.ts)
    - Initial 12 tray letters drawn from pool on init
    - Each applyTowerWord draws refill from pool FIFO; when pool empty tray shrinks
    - isPoolExhausted exposed on useWordTower return
