status: shipped
attempted: STEP 0 — Word Tower Roguelike Run Perks (polish:try:word-tower:65d745e2 + idea:build:ce190faf)
files_touched:
  - fe-next/lib/wordTower/useRunStreakPerk.ts (new — hook, milestone detection, drop counter)
  - fe-next/components/wordTower/WordTowerHud.tsx (runPerks prop + badge strip above deck)
  - fe-next/components/wordTower/WordTowerPlay.tsx (hook wired, craneMods fold, HUD prop)
  - fe-next/translations/en.js + he.js + sv.js + ja.js + es.js (wordTower.runPerk.hotStreak.a11y)
next_steps: >
  Add celebration toast when Hot Streak perk awards (playPowerUpSound + toast "Next 3 drops +50%").
  Add 2500m milestone for advanced climbs. Both small additions to useRunStreakPerk + WordTowerPlay.
founder_note: >
  Blog creation directive goes to lane 08 (blog ISR pattern validated 7/7 for that lane).
