---
status: research-only
attempted: Crossword Clue Scramble — polish:try:crossword:41260cd8 (most recent founder vote). Spent budget on orientation; no code written.
files_touched: none
next_steps: |
  Implement ClueScramble feature in crossword mode (polish:try:crossword:41260cd8):
  - Spec: "add scramble mini-prompt as a 10s overlay on crossword clue cells; skip = clue reveals; solves add to a clue streak counter"
  - Create fe-next/components/crossword/ClueScramble.tsx (~80 lines):
      * Props: clue string, onEarned(), onSkip()
      * Pick longest word (>=4 chars) from clue, shuffle letters
      * 10s countdown bar, text input for answer
      * Correct = onEarned(); timeout/skip = onSkip()
  - Modify CrosswordView.tsx (425 lines, safe):
      * Add state: clueStreak (number), earnedClues (Set<string> via useRef to avoid re-render)
      * Track activeSlot.id changes (useEffect on activeSlot?.id); when NEW slot and !earnedClues.has(id), set scrambleSlotId state
      * Render <ClueScramble> overlay (z-30, above board, below z-50 solved overlay) when scrambleSlotId is set
      * onEarned: earnedClues.add(id), clueStreak++, clear scrambleSlotId
      * onSkip: earnedClues.add(id), clear scrambleSlotId (no streak bump)
  - Show clue streak badge in stat bar (between words counter and timer) only when clueStreak > 0
  - Translation keys needed: crossword.scramble.title, crossword.scramble.skip, crossword.scramble.correct, crossword.scramble.streak
  - IMPORTANT: translation system is inline in fe-next/contexts/LanguageContext.tsx (463 lines) — read it first to find the crossword section and add keys there + all 5 locales (en/he/sv/ja/es)
  - Admin gate on fe-next/app/[locale]/crossword/page.tsx already in place; no gate changes needed
---
