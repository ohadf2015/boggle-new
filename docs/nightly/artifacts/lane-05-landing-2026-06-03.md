---
status: partial
attempted: Ship "Rival Sabotage via Reward Ad" polish (polish:try:word-tower:6e45e5a5) — watch-ad CTA in WordTowerSabotageBay that grants a sabotage token via useRewardedAd(rewardKind:'feature')
files_touched:
  - fe-next/lib/wordTower/sabotage.ts (canEarnViaAd + awardSabotageTokenViaAd)
  - fe-next/lib/wordTower/__tests__/sabotage.test.ts (6 new tests)
  - fe-next/components/wordTower/useSabotage.ts (earnTokenViaAd + adEarnedToast + dismissAdEarned)
  - fe-next/components/wordTower/WordTowerSabotageBay.tsx (Watch Ad button + ad-earned toast)
  - fe-next/components/wordTower/WordTowerPlay.tsx (useRewardedAd wired + props)
  - fe-next/translations/en.js (watchAd + adEarned)
  - fe-next/translations/he.js (watchAd + adEarned)
  - fe-next/translations/sv.js (watchAd + adEarned)
next_steps: |
  - Add watchAd + adEarned keys to translations/ja.js and translations/es.js (hit 8-file cap tonight)
  - ja/es show key string as fallback until those 2 keys are added
  - Visual verify: open /word-tower on Android — cyan "📺 Watch Ad +1" chip appears below token chip when tokens < 3
---
