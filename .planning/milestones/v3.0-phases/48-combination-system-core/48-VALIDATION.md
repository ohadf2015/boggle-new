---
phase: 48
slug: combination-system-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 48 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x with `@testing-library/react` |
| **Config file** | `fe-next/jest.config.ts` |
| **Quick run command** | `npx jest --testPathPattern="blastCombos\|useBlastGame.comboPairs\|BlastComboFlash\|blastComboEffects" --no-coverage` |
| **Full suite command** | `npx jest --testPathPattern="blast" --no-coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="blastCombos|useBlastGame.comboPairs|BlastComboFlash|blastComboEffects" --no-coverage`
- **After every plan wave:** Run `npx jest --testPathPattern="blast" --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 48-01-01 | 01 | 1 | COMB-01 | unit | `npx jest blastCombos --no-coverage` | Partial (9 exist) | ⬜ pending |
| 48-01-02 | 01 | 1 | COMB-01 | unit | `npx jest blastCombos --no-coverage` | ❌ W0 | ⬜ pending |
| 48-02-01 | 02 | 2 | COMB-02 | unit | `npx jest useBlastGame.comboPairs --no-coverage` | ❌ W0 | ⬜ pending |
| 48-02-02 | 02 | 2 | COMB-02 | unit | `npx jest useBlastGame.comboPairs --no-coverage` | ❌ W0 | ⬜ pending |
| 48-03-01 | 03 | 2 | COMB-02 | unit | `npx jest useBlastGame.comboPairs --no-coverage` | ❌ W0 | ⬜ pending |
| 48-03-02 | 03 | 2 | COMB-02 | unit | `npx jest useBlastGame.comboPairs --no-coverage` | ❌ W0 | ⬜ pending |
| 48-04-01 | 04 | 3 | COMB-03 | unit | `npx jest BlastComboFlash --no-coverage` | ❌ W0 | ⬜ pending |
| 48-04-02 | 04 | 3 | COMB-03 | unit | `npx jest BlastComboFlash --no-coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `fe-next/components/blast/__tests__/useBlastGame.comboPairs.test.ts` — stubs for COMB-02 (22 new pairs)
- [ ] `fe-next/components/blast/__tests__/BlastComboFlash.test.tsx` — stubs for COMB-03 visual distinction
- [ ] `fe-next/components/blast/utils/__tests__/blastComboEffects.test.ts` — stubs for extracted combo executor

*Existing infrastructure covers COMB-01 detection tests (extend `blastCombos.test.ts`).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Screen flash visually distinct from tile-level particles | COMB-03 | Visual perception judgment | Trigger any combo in Blast mode; verify screen flash is noticeable vs individual tile clear |
| Audio sting plays on combo trigger | COMB-03 | Audio playback in test env | Submit word with 2+ specials; verify audio sting fires (distinct from normal word accept sound) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
