# Nightly BASELINE-RED alert — 2026-06-09

The nightly gate failed, but a clean-HEAD baseline gate (NO lane code) fails the SAME test file(s):
  - fe-next/app/__tests__/sitemap.test.ts
  - fe-next/components/adventure/meta/__tests__/AdventureLevelUpModal.test.tsx
  - fe-next/lib/admin/__tests__/adminNav.test.ts
  - fe-next/lib/blast/v2/engine/__tests__/chain-builder.test.ts
  - fe-next/lib/cosy/__tests__/inlineHexRatchet.guardrail.test.ts

These tests are red on master itself. The nightly build-verified its authored work and shipped it anyway (it introduced no NEW failure), but the gate runs at reduced strength until the baseline is green. FIX THESE TESTS on master.
