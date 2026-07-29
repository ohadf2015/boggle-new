---
phase: 54
slug: multiplayer-combo-sync-codex-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 54 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x with React Testing Library |
| **Config file** | `fe-next/jest.config.ts` |
| **Quick run command** | `npm run test:frontend -- --testPathPattern="BlastView.discovery\|useBlastComboDiscovery\|useWordSubmission\|wordHandler.blast"` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds (quick), ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:frontend -- --testPathPattern="BlastView.discovery\|useBlastComboDiscovery\|useWordSubmission\|wordHandler.blast"`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 54-01-01 | 01 | 1 | SYNC-04 | unit | `npm run test:frontend -- --testPathPattern="BlastView.discovery"` | ❌ W0 | ⬜ pending |
| 54-01-02 | 01 | 1 | SYNC-02 | unit | `npm run test:frontend -- --testPathPattern="useWordSubmission"` | ❌ W0 | ⬜ pending |
| 54-01-03 | 01 | 1 | SYNC-02 | unit | `npm run test:frontend -- --testPathPattern="wordHandler.blast"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BlastView.discovery.test.tsx` — add assertion: `useBlastComboDiscovery` called with `userId` from `useAuth`
- [ ] `useWordSubmission.multiplayer.test.ts` — add assertion: `socket.emit('submitWord', ...)` includes `comboType` when combo detected

*Existing infrastructure covers framework; only behavioral assertions for new wiring are missing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Combo flash visible on other player's screen | SYNC-02 | Requires two browser sessions with active Socket.IO connection | Open two tabs, start multiplayer blast, submit combo word on tab A, verify flash on tab B |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
