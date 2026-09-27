# Nightly BASELINE-RED alert — 2026-07-26

The nightly gate failed, but a clean-HEAD baseline gate (NO lane code) fails the SAME test file(s):
  - fe-next/components/daily/__tests__/DailyChallengeGame.trackGameStart.test.tsx
  - fe-next/components/tutorial/ModeCoach.test.tsx

These tests are red on master itself. The nightly TYPE-verified its authored work (build:schemas + tsc --noEmit — next-build wedges in a fresh worktree, so full build coverage was skipped) and shipped it anyway (it introduced no NEW failure), but the gate runs at reduced strength until the baseline is green. FIX THESE TESTS on master.
