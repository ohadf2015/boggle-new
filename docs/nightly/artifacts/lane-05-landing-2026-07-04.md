status: shipped
attempted: Word Forge — Iron Streak Bonus (polish:try:word-forge:21d52bc0 founder vote)
files_touched:
  - fe-next/types/wordForge.ts (added ironStreak field to WordForgeRunState)
  - fe-next/hooks/useWordForgeRun.ts (misfiredThisRoundRef tracking, handleRoundEnd streak logic, reject sets misfire, startRound +10% timer at streak>=3)
  - fe-next/components/wordForge/WordForgeHUD.tsx (ironStreak prop, streak chip at 1/3/5 thresholds)
  - fe-next/components/wordForge/WordForgeGame.tsx (pass ironStreak prop to HUD)
  - fe-next/translations/en.js + he.js + sv.js + ja.js + es.js (ironStreak key, 5 locales)
next_steps: Free hint tile at ironStreak>=5 (needs hint infrastructure); verify eslint clean on gate
