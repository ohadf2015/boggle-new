status: shipped
attempted: Brain Drill — Post-Session Word Replay (idea:build:913934c2, founder voted YES)
files_touched:
  - fe-next/components/drills/LightningRoundCompletePhase.tsx (new topMissedWords prop + staggered letter reveal UI)
  - fe-next/components/drills/LightningRound.tsx (compute top 3 missed words by score, pass to CompletePhase)
  - fe-next/translations/en.js (missedWords key)
  - fe-next/translations/he.js (missedWords key — מילים שהחמצת)
  - fe-next/translations/sv.js (missedWords key — Ord du missade)
  - fe-next/translations/ja.js (missedWords key — 見逃した単語)
  - fe-next/translations/ru.js (missedWords key — Пропущенные слова)
  - fe-next/translations/es.js (missedWords key — Palabras que perdiste)
next_steps: none — feature complete. Optionally apply same pattern to combo-master/memory-hunt drills.
