---
phase: 55
slug: tech-debt-docs-cleanup
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-04
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x |
| **Config file** | `fe-next/jest.config.ts` |
| **Quick run command** | `cd fe-next && npm run test -- --testPathPattern="blastComboEffects\|blastMultiplayerConstants\|useBlastGame" --passWithNoTests` |
| **Full suite command** | `cd fe-next && npm run lint && npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd fe-next && npm run test -- --testPathPattern="blastComboEffects\|blastMultiplayerConstants\|useBlastGame" --passWithNoTests`
- **After every plan wave:** Run `cd fe-next && npm run lint && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 55-01-01 | 01 | 1 | SC-1 | static | `wc -l fe-next/components/blast/utils/blastComboEffects.ts` | ✅ | ⬜ pending |
| 55-02-01 | 02 | 1 | SC-2 | unit | `cd fe-next && npm run test -- --testPathPattern="useBlastGame"` | ✅ | ⬜ pending |
| 55-02-02 | 02 | 1 | SC-3 | lint | `cd fe-next && npm run lint -- --quiet` | ✅ | ⬜ pending |
| 55-03-01 | 03 | 2 | SC-4 | manual | Review REQUIREMENTS.md Coverage block | ✅ | ⬜ pending |
| 55-03-02 | 03 | 2 | SC-5 | manual | Review ROADMAP.md plan checkboxes | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| REQUIREMENTS.md checkboxes accurate | SC-4 | Documentation content review | Compare checkboxes against audit findings |
| ROADMAP.md plan checkboxes accurate | SC-5 | Documentation content review | Verify 53-01 and 54-01 marked complete |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
