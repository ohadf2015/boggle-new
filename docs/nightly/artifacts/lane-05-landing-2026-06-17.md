status: partial
attempted: Shiritori Tempo Bonus (polish:try vote) — useShiritoriTempo hook + spEngine wildcardHead param
files_touched:
  - fe-next/lib/shiritori/sp/useShiritoriTempo.ts (new hook, 40 lines)
  - fe-next/lib/shiritori/sp/__tests__/useShiritoriTempo.test.ts (11 tests)
  - fe-next/lib/shiritori/sp/spEngine.ts (wildcardHead param, backward-compatible)
next_steps: |
  Wire useShiritoriTempo into solo/page.tsx (6 edit points):
  1. Import useShiritoriTempo (line ~35)
  2. Destructure hook after useShiritoriGhostMultiplier (line ~88)
  3. resetTempo() in newGame (line ~163)
  4. commitPlayerWord(state, word, ok, tempoActive) (line ~176)
  5. After success: if tempoActive spendTempo(); always recordTempoSubmit() (line ~205)
  6. Tempo badge in header JSX (lines 271-278): tempoActive show neo-yellow chip "⚡ free word"
  Add shiritori.solo.tempo.active + shiritori.solo.tempo.hint to all 5 locale files.
