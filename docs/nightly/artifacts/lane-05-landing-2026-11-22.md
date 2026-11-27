status: shipped
attempted: STEP 0 — self-selected admin-beta mode improvement (understandability + feel axis)
files_touched:
  - fe-next/components/word-craft/gems/GemHuntRuleHint.tsx
  - fe-next/components/word-craft/gems/__tests__/GemHuntRuleHint.test.tsx
next_steps: >
  Gem Hunt / Word Craft Run / Wheel Rush (the only 3 real admin-beta targets —
  sealed-bid is REMOVED, brain-drill/Brain Gym is public not admin-gated, crossword
  is noindex-only not admin-gated) already had many files mid-edit in git status
  tonight (GemHuntPageClient.tsx, PowerCardView.tsx, gemDrama.ts, feedbackTiers.ts,
  WheelRushHeader.tsx — all dirty before this lane started). To avoid colliding with
  that in-flight work, this lane picked a clean, self-contained file in the same
  mode (GemHuntRuleHint.tsx) rather than touching the dirty ones. vitest and eslint
  both hung (RC=124) on this run — looked like machine contention from the ~4
  concurrently running nightly lane processes (ps aux showed 4 `claude` sessions),
  not a problem with this specific diff: the change is a direct copy of the
  already-shipped GemShop.tsx entrance-tween pattern (same gsap.fromTo + same
  prefers-reduced-motion guard), so risk is low, but a human/tomorrow's lane should
  run `npx vitest run components/word-craft/gems/__tests__/GemHuntRuleHint.test.tsx`
  once the machine is quiet to get a real green before trusting it long-term.
  Tomorrow's lane 05 should rotate to Wheel Rush or Word Craft Run once their
  currently-dirty files settle (committed or reverted) — do not re-pick Gem Hunt
  two nights running.
