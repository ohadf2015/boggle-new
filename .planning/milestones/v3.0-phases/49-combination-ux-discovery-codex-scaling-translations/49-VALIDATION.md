---
phase: 49
slug: combination-ux-discovery-codex-scaling-translations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 49 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 with `@testing-library/react` |
| **Config file** | `fe-next/jest.config.ts` |
| **Quick run command** | `npx jest --testPathPattern="blastComboDiscovery\|blastCodex\|blastComboScaling\|useBlastComboDiscovery" --no-coverage` |
| **Full suite command** | `npx jest --testPathPattern="blast" --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="blastComboDiscovery|blastCodex|blastComboScaling|useBlastComboDiscovery" --no-coverage`
- **After every plan wave:** Run `npx jest --testPathPattern="blast" --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 49-01-01 | 01 | 1 | COMB-04 | unit | `npx jest useBlastComboDiscovery --no-coverage` | ❌ W0 | ⬜ pending |
| 49-01-02 | 01 | 1 | COMB-04 | unit | `npx jest useBlastComboDiscovery --no-coverage` | ❌ W0 | ⬜ pending |
| 49-01-03 | 01 | 1 | COMB-04 | unit | `npx jest BlastComboDiscovery --no-coverage` | ❌ W0 | ⬜ pending |
| 49-01-04 | 01 | 1 | COMB-04 | unit | `npx jest useBlastComboDiscovery --no-coverage` | ❌ W0 | ⬜ pending |
| 49-02-01 | 02 | 1 | COMB-05 | unit | `npx jest BlastCodexModal --no-coverage` | ❌ W0 | ⬜ pending |
| 49-02-02 | 02 | 1 | COMB-05 | unit | `npx jest BlastCodexModal --no-coverage` | ❌ W0 | ⬜ pending |
| 49-02-03 | 02 | 1 | COMB-05 | unit | `npx jest BlastCodexModal --no-coverage` | ❌ W0 | ⬜ pending |
| 49-03-01 | 03 | 1 | COMB-06 | unit | `npx jest blastComboScaling --no-coverage` | ❌ W0 | ⬜ pending |
| 49-03-02 | 03 | 1 | COMB-06 | unit | `npx jest blastComboScaling --no-coverage` | ❌ W0 | ⬜ pending |
| 49-03-03 | 03 | 1 | COMB-06 | unit | `npx jest blastComboScaling --no-coverage` | ❌ W0 | ⬜ pending |
| 49-03-04 | 03 | 1 | COMB-06 | unit | `npx jest blastComboEffects --no-coverage` | Partial | ⬜ pending |
| 49-04-01 | 04 | 2 | COMB-07 | manual | Translation file review | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `fe-next/components/blast/hooks/__tests__/useBlastComboDiscovery.test.ts` — stubs for COMB-04 state logic
- [ ] `fe-next/components/blast/__tests__/BlastComboDiscovery.test.tsx` — stubs for COMB-04 banner render
- [ ] `fe-next/components/blast/__tests__/BlastCodexModal.test.tsx` — stubs for COMB-05 codex render
- [ ] `fe-next/components/blast/utils/__tests__/blastComboScaling.test.ts` — stubs for COMB-06 scaling util

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Translation keys display correctly in Hebrew RTL | COMB-07 | Visual RTL layout verification | Load Blast menu with `?locale=he`, open Codex, verify combo names render RTL |
| Translation keys display correctly in Japanese | COMB-07 | Character rendering check | Load Blast menu with `?locale=ja`, open Codex, verify Japanese characters |
| Discovery banner visual appearance | COMB-04 | Visual/animation quality | Trigger first combo, verify freeze + banner animation look correct |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
