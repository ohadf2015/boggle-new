# Nightly BASELINE-RED alert — 2026-07-20

The nightly gate failed, but a clean-HEAD baseline gate (NO lane code) fails the SAME test file(s):
  - fe-next/components/game/__tests__/LeadChangeBanner.test.tsx
  - fe-next/components/onboarding/__tests__/OnboardingFlow.test.tsx
  - fe-next/components/results/__tests__/StickyReadyBar.modeSelector.test.tsx
  - fe-next/components/results/__tests__/StickyReadyBar.modeSelectorDesktop.test.tsx

These tests are red on master itself. The nightly TYPE-verified its authored work (build:schemas + tsc --noEmit — next-build wedges in a fresh worktree, so full build coverage was skipped) and shipped it anyway (it introduced no NEW failure), but the gate runs at reduced strength until the baseline is green. FIX THESE TESTS on master.
