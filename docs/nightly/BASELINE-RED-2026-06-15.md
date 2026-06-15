# Nightly BASELINE-RED alert — 2026-06-15

The nightly gate failed, but a clean-HEAD baseline gate (NO lane code) fails the SAME test file(s):
  - fe-next/modules/__tests__/blastModeManager.thaw.test.ts

These tests are red on master itself. The nightly build-verified its authored work and shipped it anyway (it introduced no NEW failure), but the gate runs at reduced strength until the baseline is green. FIX THESE TESTS on master.
