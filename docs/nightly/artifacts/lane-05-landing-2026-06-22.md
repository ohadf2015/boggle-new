status: partial
files_touched:
  - fe-next/lib/crossword/metaAnswer.ts (new — pure findMetaAnswer logic)
  - fe-next/lib/crossword/types.ts (MetaAnswer interface + CrosswordPuzzle.metaAnswer field)
  - fe-next/lib/crossword/generate.runtime.ts (imports + calls findMetaAnswer; attaches to returned puzzle)
  - fe-next/components/crossword/CrosswordCell.tsx (isMeta prop + bg-neo-yellow when true)
  - fe-next/components/crossword/CrosswordGrid.tsx (metaCells prop; passes isMeta to each cell)
next_steps: >
  Wire CrosswordView.tsx: add useState showMetaRevealed, setTimeout 1200ms in onSolved
  callback if puzzle.metaAnswer exists, derive metaCells Set, pass to CrosswordGrid,
  render neo-yellow banner below grid. Add crossword.metaReveal key to all 5 locale
  files. Write metaAnswer.test.ts. Emit mode-improvement-shipped block.
