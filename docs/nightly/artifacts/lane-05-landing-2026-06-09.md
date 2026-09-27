status: partial
attempted: ship Shiritori Chain Combo Meter polish (polish:try:shiritori:899fc63f signal)
files_touched:
  - fe-next/lib/shiritori/sp/comboStats.ts
  - fe-next/lib/shiritori/sp/__tests__/comboStats.test.ts (14 tests green)
  - fe-next/components/shiritori/ShiritoriComboMeter.tsx
  - fe-next/translations/en.js, he.js, sv.js, ja.js, es.js (combo keys x5)
next_steps: |
  Wire ShiritoriComboMeter into fe-next/app/[locale]/shiritori/solo/page.tsx:
  1. Import: ShiritoriComboMeter from @/components/shiritori/ShiritoriComboMeter
             playerWordCount, getPersonalBest, savePersonalBest, isNewRecord from @/lib/shiritori/sp/comboStats
  2. Add state: const [personalBest, setPersonalBest] = useState(() => getPersonalBest(difficulty))
  3. Update PB useEffect: when playerWordCount(state.chain) > personalBest, call savePersonalBest + setPersonalBest
  4. On newGame: reset personalBest via setPersonalBest(getPersonalBest(d))
  5. Render <ShiritoriComboMeter playerWords={playerWordCount(state.chain)} personalBest={personalBest} phase={state.phase} />
     between difficulty buttons and head prompt in the JSX
