status: shipped
attempted: Crossword MP Capture Lock — territory-race feel via captured clue badges (polish:try:crossword:cbf9054c)
files_touched:
  - fe-next/lib/crossword/stats.ts (add solvedSlotIds export)
  - fe-next/lib/crossword/__tests__/stats.test.ts (3 new tests for solvedSlotIds)
  - fe-next/components/crossword/CrosswordClueList.tsx (capturedSlotIds prop + cyan badge)
  - fe-next/components/crossword/__tests__/CrosswordClueList.test.tsx (2 new capture tests)
  - fe-next/components/multiplayer/crossword/CrosswordVersus.tsx (wire mySolvedSlotIds → clue list)
next_steps: |
  Phase 2: extend to show RIVALS' captures (requires server to broadcast capturedSlotIds per player
  in crosswordStandings — extend CrosswordMpPlayerProgress + applyProgress + standings() + handler).
  Phase 3: lock animation when a rival captures a clue you are actively editing.
