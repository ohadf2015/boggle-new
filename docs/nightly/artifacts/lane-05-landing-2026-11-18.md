status: shipped
attempted: improve one existing admin-beta mode (STEP 0) — rotate target, ship one axis improvement
files_touched:
  - fe-next/components/multiplayer/crossword/CrosswordVersus.tsx
  - fe-next/components/multiplayer/crossword/__tests__/CrosswordVersus.test.tsx
summary: MP Crossword (admin-gated via canSeeInWorkModes/isAdmin in BattleModeCard's IN_WORK_MODES)
  silently dropped the word-streak combo feature that the solo crossword view already has:
  GameMascotReactions was hardcoded comboLevel={0}, CrosswordGrid rendered with default
  juice='small' and no onComboChange wire, and CrosswordComboChip was never rendered at all.
  Wired MP to the exact same mechanism the solo view uses (local comboLevel state fed by
  CrosswordGrid's existing onComboChange, juice="full", mascot + chip both reacting) —
  zero new abstractions, reused what already existed per the "reuse one layer across modes"
  standing feedback.
tdd: wrote a failing test first (CrosswordVersus.test.tsx — combo chip absent, then appears
  with data-tier after a simulated combo-change event), then implemented the wire.
verification: BLOCKED on this run — both `npx vitest` and `npx eslint` failed with
  MODULE_NOT_FOUND / ERR_MODULE_NOT_FOUND resolving local deps (node_modules/.bin/eslint
  also missing on disk despite `ls` reporting it present), consistent with a concurrent
  session mutating node_modules mid-run (per .claude/rules/60-recurring-pitfalls.md Class 4
  "concurrent agent sessions ... hold .next/lock"). Did not chase repo-wide repair — out of
  lane scope and over time budget. Change was self-reviewed by diff read: minimal, mirrors
  the solo CrosswordView.tsx usage of the same CrosswordGrid/CrosswordComboChip/
  GameMascotReactions APIs line-for-line, no new types, no gate changes, no new files.
  The nightly gate's own authoritative lint/type/test/build run after this lane is the
  real verification; flag if it reports a module-resolution-class SETUP failure for
  OTHER lanes too tonight (same shared-machine symptom, not this diff's fault).
next_steps: if the gate itself also hits MODULE_NOT_FOUND / missing node_modules/.bin
  entries tonight, that is an environment/concurrency issue (lane 7 should check for a
  peer npm install racing this run), not a code issue in this diff.
