status: shipped
attempted: STEP 0 — Word Alchemy elemental particle bursts on correct word submit
files_touched:
  - fe-next/lib/pixiFx/presets.ts (added element-fire/water/earth/air presets + PresetName union)
  - fe-next/app/[locale]/word-alchemy/page.tsx (elementBurstPreset helper + correct-guess burst wiring)
next_steps: visual verify at http://localhost:3001/en/word-alchemy — submit each op type (synonym/anagram/addLetter/homophone) to see distinct elemental bursts; if feel is off, tune preset colors/speed in presets.ts
