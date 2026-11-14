status: partial
attempted: STEP 0 — Word Craft Cards (RunPageClient, admin-gated via gateWordCraftMode), variable-reward axis. Rotated here because Wheel Rush was most-recent and Gem Hunt was dirty (another lane's in-flight uncommitted edit) at run start.
files_touched:
  - fe-next/lib/word-craft/run/feedbackTiers.ts (added nextStreak(prevStreak, tier) pure fn: great/huge extends a chain counter, a plain "nice" word resets it to 0 — earned momentum, not flat per-word praise)
  - fe-next/lib/word-craft/run/__tests__/feedbackTiers.test.ts (RED-GREEN for nextStreak; growth + reset cases)
notes: |
  Local node_modules/.bin/eslint and vitest are broken (eslint.js symlink target missing;
  vitest/rolldown pulled a node:util API Node 18 lacks) — could not run either locally.
  Verified correctness via LSP diagnostics only (pre-edit: "has no exported member
  'nextStreak'" RED; post-edit: zero diagnostics on both touched files). Scope cut hard
  from the full slice (RunHUD/RunWordPop wiring + 5-locale "Chain!" string + sound beat)
  to just this pure helper so something real lands clean inside the time budget — no UI
  wiring, no new strings, so no locale-parity risk was taken on.
next_steps: |
  Wire nextStreak into RunPageClient.tsx's word-commit effect (around state.lastWordScore,
  ~line 90-101): track a streakRef, call nextStreak(streakRef.current, tier) per commit,
  pass `streak` through RunWordPopData into RunWordPop.tsx. Render a chain badge (neo-orange
  — the design system's reserved streak/fire token) when streak >= 2, scaling with it like
  TIER_SCALE does for tier. Add `wordcraft.run.feedback.streak` ({n} chain) to all 5 locale
  files. Pick a different mode next time this rotation reaches Word Craft — Gem Hunt and
  Wheel Rush are both more recently covered; prefer this same RunPageClient wiring step if
  no mode:tweak/polish:try callback has landed by then.
