status: shipped
attempted: Improve one existing admin-beta game mode (STEP 0) per rotation/anti-stagnation rule; landing-CVR is fallback only.
files_touched:
  - fe-next/components/word-craft/run/PowerCardView.tsx
  - fe-next/components/word-craft/run/CardPickScreen.tsx
  - fe-next/components/word-craft/run/__tests__/PowerCardView.test.tsx
  - fe-next/components/word-craft/run/__tests__/CardPickScreen.test.tsx
next_steps: >
  Local toolchain in this worktree has no node_modules/.bin (vitest/eslint missing,
  npx vitest failed to resolve 'vitest/config' / '@vitejs/plugin-react') — the same
  CoW-clone issue tracked in nightly learnings Headline 0/1. Could not self-run the
  4 new/changed tests locally; verify via the authoritative nightly gate or rerun
  `npx vitest run components/word-craft/run/__tests__/PowerCardView.test.tsx
  components/word-craft/run/__tests__/CardPickScreen.test.tsx` once node_modules is
  whole. Change is small and mechanical (reuses the existing wc-rise/--wc-delay
  primitive already used in WordCraftRack.tsx/WordCraftGameOverScene.tsx), reviewed
  by hand line-by-line in place of a tool run.
