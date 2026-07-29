---
phase: 53
slug: wildcard-type-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 53 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x |
| **Config file** | `fe-next/jest.config.ts` |
| **Quick run command** | `cd fe-next && npx jest --testPathPattern="shared/types/__tests__/blast\|useBlastGame.mirrorGoldTier\|blastModeManager\|BlastTileRules" --no-coverage` |
| **Full suite command** | `cd fe-next && npm run test -- --no-coverage` |
| **Estimated runtime** | ~15 seconds (quick), ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 53-01-01 | 01 | 1 | TILE-06 | unit | `npx jest --testPathPattern="shared/types/__tests__/blast" --no-coverage` | ✅ (needs update) | ⬜ pending |
| 53-01-02 | 01 | 1 | TILE-06 | unit | `npx jest --testPathPattern="blastModeManager" --no-coverage` | ✅ (needs update) | ⬜ pending |
| 53-01-03 | 01 | 1 | TILE-08 | type-check | `cd fe-next && npx tsc --noEmit` | Via tsc | ⬜ pending |
| 53-01-04 | 01 | 1 | SYNC-01 | unit | `npx jest --testPathPattern="blastModeManager" --no-coverage` | ✅ (needs update) | ⬜ pending |
| 53-01-05 | 01 | 1 | TILE-06 | unit | `npx jest --testPathPattern="useBlastGame.mirrorGoldTier" --no-coverage` | ✅ (already passes) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files or fixtures needed — all changes are in-place edits to existing assertions.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
