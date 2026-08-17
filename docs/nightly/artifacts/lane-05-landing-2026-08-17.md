status: shipped
attempted: STEP0 gate check: mode-improvement shipped 5/7 of last true 7 nights (< 6 threshold) -> stayed in STEP0, did NOT fall back to landing/CVR (no PostHog calls made).
files_touched:
  - fe-next/components/word-craft/gems/GemHuntWinScene.tsx
  - fe-next/components/word-craft/gems/GemHuntPageClient.tsx
  - fe-next/components/word-craft/gems/__tests__/GemHuntWinScene.test.tsx (new, TDD-first)
what_shipped: |
  Word Craft / Gem Hunt (admin-gated via gateWordCraftMode, ?mode=gems) — fixed a
  loss-screen bug: GemHuntWinScene always rendered all 4 crown gems fully lit
  (data-win-gem, WIN_RARITY icon + ring) regardless of outcome, so a LOSS looked
  visually identical to a WIN (same triumphant 4-lit-crowns row). Now the win-scene
  reads the real `inventory` and dims (opacity-25 grayscale, no ring) any color that
  never reached a crown -- on loss you see which colors you actually got vs missed;
  on win all 4 are naturally lit (hasWinningInventory guarantees it), so no outcome
  branching was needed, just reusing the same lit/dim pattern already used in
  GemHuntHUD's crown row.
  Axis: understandability / obviousness (a losing player was seeing a false-positive
  win signal).
next_steps: |
  Gate will run vitest authoritatively -- could not run vitest locally tonight,
  node/rolldown toolchain threw "styleText not exported from node:util" on ANY
  `npx vitest run` invocation (pre-existing env issue, unrelated to this diff --
  same class as the documented nightly gate-wedge). eslint on the 3 changed files
  ran clean. If gate reports a real failure in GemHuntWinScene.test.tsx, re-check
  the GemIcon `withRing` prop signature and the `cn()` import path first.
  Rotation note for tomorrow's lane 5: admin-gated targets verified TONIGHT by
  re-deriving gates from source (word-craft ?mode=gems/cards via gateWordCraftMode,
  connections daily via lib/dailyModes.ts adminOnly:true, sealed-bid). wheel-rush is
  NOT admin-gated anymore (mode-readiness.md confirms it's live in the public MP
  weighted rotation at 0.15) -- the "surviving admin-gated set" list in
  nightly-learnings.md is stale on that point, worth a lane-7 correction.
