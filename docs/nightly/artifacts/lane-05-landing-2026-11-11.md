status: shipped
attempted: STEP 0 - Word Craft Gem Hunt, variable-reward axis - rare (Joker, cost.rarity 2) shop card now gets gold ring + sparkle instead of blending into common cards
files_touched:
  - fe-next/components/word-craft/gems/GemShop.tsx
  - fe-next/components/word-craft/gems/__tests__/GemShop.test.tsx
  - docs/nightly/reports/2026-11-11.md (lane block appended)
next_steps: |
  - Correct the brief's stale "known admin-gated set" (Wheel Rush was RELEASED/public since
    2026-10-05 per mode-readiness.md - 11-06/11-08 lane-5 reports mistakenly targeted it as
    admin-gated). Only real admin-gated mode left in code: Word Craft (gems/cards sub-modes).
  - vitest not run locally this lane (time-budget rule); nightly gate's full run is
    authoritative. eslint clean on both changed files.
  - Rotate Gem Hunt axis next: UI/graphics/gameplay not yet covered (feel done 11-05,
    understandability done 11-07, variable-reward done tonight).
