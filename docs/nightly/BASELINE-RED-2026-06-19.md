# Nightly BASELINE-RED alert — 2026-06-19

The nightly gate failed, but a clean-HEAD baseline gate (NO lane code) fails the SAME test file(s):
  - fe-next/components/drills/__tests__/DrillWordLimits.test.tsx
  - fe-next/components/practice/__tests__/PracticeWheelSandbox.drag.test.tsx
  - fe-next/components/wordTower/WordTowerCrane.sofit.test.tsx
  - fe-next/components/wordTower/__tests__/WordTowerCrane.test.tsx

These tests are red on master itself. The nightly TYPE-verified its authored work (build:schemas + tsc --noEmit — next-build wedges in a fresh worktree, so full build coverage was skipped) and shipped it anyway (it introduced no NEW failure), but the gate runs at reduced strength until the baseline is green. FIX THESE TESTS on master.
