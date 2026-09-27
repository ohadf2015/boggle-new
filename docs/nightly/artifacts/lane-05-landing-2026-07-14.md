---
status: shipped
attempted: polish:try:crossword:41260cd8 — Crossword Clue Scramble (already built 07-11/07-12, completing last-mile gaps)
files_touched:
  - fe-next/translations/ru.js (added crossword.scramble.title/skip/streakAria — was missing, raw key shown to RU users)
  - fe-next/translations/en.js (added crossword.scramble.streakAria)
  - fe-next/translations/he.js (added crossword.scramble.streakAria)
  - fe-next/translations/sv.js (added crossword.scramble.streakAria)
  - fe-next/translations/ja.js (added crossword.scramble.streakAria)
  - fe-next/translations/es.js (added crossword.scramble.streakAria)
  - fe-next/components/crossword/CrosswordView.tsx (fix hardcoded EN aria-label → t())
  - fe-next/components/crossword/__tests__/ClueScramble.test.tsx (new — 7 tests)
next_steps: test crossword as admin at /en/crossword/ — first clue tap should show scramble overlay; test /ru/crossword/ locale
---
