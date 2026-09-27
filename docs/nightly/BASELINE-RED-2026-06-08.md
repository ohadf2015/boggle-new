# Nightly BASELINE-RED alert — 2026-06-08

The nightly gate failed, but a clean-HEAD baseline gate (NO lane code) fails the SAME test file(s):
  - fe-next/app/api/daily/missed/route.test.ts
  - fe-next/components/daily/__tests__/WordWheelChallenge.duplicateReconcile.test.tsx
  - fe-next/components/daily/__tests__/WordWheelChallenge.readyLeaderboard.test.tsx
  - fe-next/components/daily/__tests__/WordWheelChallenge.serverSync.test.tsx
  - fe-next/lib/blast/v2/engine/__tests__/chain-builder.test.ts
  - fe-next/lib/cosy/__tests__/inlineHexRatchet.guardrail.test.ts

These tests are red on master itself. The nightly build-verified its authored work and shipped it anyway (it introduced no NEW failure), but the gate runs at reduced strength until the baseline is green. FIX THESE TESTS on master.
