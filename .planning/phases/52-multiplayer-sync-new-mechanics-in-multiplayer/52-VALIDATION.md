---
phase: 52
slug: multiplayer-sync-new-mechanics-in-multiplayer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x |
| **Config file** | `fe-next/jest.config.js` (frontend), `fe-next/backend/jest.config.js` (backend) |
| **Quick run command** | `npm run test:backend -- --testPathPattern=blastModeManager` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:backend -- --testPathPattern=blastModeManager` (SYNC-01/02); `npm run test:frontend -- --testPathPattern=blastLetterGenerator` (SYNC-03)
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 52-01-01 | 01 | 1 | SYNC-01 | unit | `npm run test:backend -- --testPathPattern=blastModeManager` | ✅ needs update | ⬜ pending |
| 52-01-02 | 01 | 1 | SYNC-01 | unit | same | ✅ exists | ⬜ pending |
| 52-02-01 | 02 | 1 | SYNC-02 | unit | `npm run test:backend -- --testPathPattern=wordHandler` | ❌ W0 | ⬜ pending |
| 52-03-01 | 03 | 2 | SYNC-03 | unit | `npm run test:frontend -- --testPathPattern=blastLetterGenerator` | ❌ W0 | ⬜ pending |
| 52-03-02 | 03 | 2 | SYNC-03 | unit | same | ❌ W0 | ⬜ pending |
| 52-04-01 | 04 | 2 | SYNC-04 | unit | `npm run test:frontend -- --testPathPattern=combo-codex` | ❌ W0 | ⬜ pending |
| 52-04-02 | 04 | 2 | SYNC-04 | unit | `npm run test:frontend -- --testPathPattern=useBlastComboDiscovery` | ✅ needs update | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `fe-next/backend/handlers/__tests__/wordHandler.blast.test.ts` — stubs for SYNC-02 (blastComboSync broadcast)
- [ ] `fe-next/components/blast/utils/__tests__/blastLetterGenerator.seeded.test.ts` — stubs for SYNC-03
- [ ] `fe-next/app/api/blast/combo-codex/__tests__/route.test.ts` — stubs for SYNC-04 API merge logic
- [ ] Update `fe-next/backend/modules/__tests__/blastModeManager.test.ts` — add SYNC-01 tile type coverage assertions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Two clients see identical combo flash | SYNC-02 | Requires two browser windows connected to same game room | 1. Open two browser tabs 2. Join same multiplayer Blast game 3. Submit word with 2+ special tiles 4. Verify both tabs show same BlastComboFlash |
| Board refills visually match across clients | SYNC-03 | Visual confirmation of seeded determinism in live game | 1. Open two tabs with same game seed 2. Clear same tiles 3. Verify refill tiles are identical |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
