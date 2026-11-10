status: shipped
files_touched:
- fe-next/components/word-craft/run/RoundResultScene.tsx
- fe-next/components/word-craft/run/__tests__/RoundResultScene.test.tsx
next_steps: no new locale strings needed — wired the already-translated-6-locale `wordcraft.run.roundResult.closeSub` key (sat unused since creation) into the round-fail screen for near-miss framing. Vitest crashes under this worktree's Node 18 (known: vitest4-needs-node20-worktree) — verified via eslint only; gate's own full run should catch any real regression. Next-night candidate for word-craft/cards(Run): add a matching near-miss variant to RunResultScene (full-run end screen) using the same meterZone('close') check against the run's final target, same closeSub-style reuse pattern.
