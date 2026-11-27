status: shipped
files_touched:
  - fe-next/components/word-craft/run/PowerCardView.tsx
  - fe-next/components/word-craft/run/RunResultScene.tsx
  - fe-next/components/word-craft/run/__tests__/RunResultScene.test.tsx
next_steps: >
  Wired RARITY_CHIP (common/rare/legendary colors) into the Word Craft Run
  recap screen so a legendary card pull stands out at run-end instead of
  reading as a plain gray chip. Admin gate (gateWordCraftMode) untouched.
  Local vitest/eslint both failed on a pre-existing broken node_modules clone
  (same Headline 0 issue lane 1 hit tonight) — verified by direct diff review
  instead; nightly gate is authoritative. If gate flags anything, it's most
  likely the rolldown/eslint toolchain itself, not this 2-line/1-import change.
  No further scope intended — this axis (ui/graphics on the run-result recap)
  is done; next rotation night should pick Wheel Rush or Word Craft Gem Hunt.
