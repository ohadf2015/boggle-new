---
phase: 51
slug: tile-idle-death-animations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 51 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | `fe-next/jest.config.js` |
| **Quick run command** | `npx jest BlastTile.idle BlastTile.clearAnimation --no-coverage` |
| **Full suite command** | `npx jest --testPathPattern="phaser/objects/__tests__" --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest BlastTile.idle BlastTile.clearAnimation --no-coverage`
- **After every plan wave:** Run `npx jest --testPathPattern="phaser" --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 51-01-01 | 01 | 0 | TILE-10 | unit | `npx jest BlastTileRules --no-coverage` | ✅ | ⬜ pending |
| 51-01-02 | 01 | 1 | TILE-10 | unit | `npx jest BlastTile.idle --no-coverage` | ✅ (needs new cases) | ⬜ pending |
| 51-01-03 | 01 | 1 | TILE-10 | unit | `npx jest BlastTile.idle --no-coverage` | ✅ (needs new cases) | ⬜ pending |
| 51-01-04 | 01 | 1 | TILE-10 | unit | `npx jest BlastTile.idle --no-coverage` | ✅ (needs new cases) | ⬜ pending |
| 51-02-01 | 02 | 1 | TILE-11 | unit | `npx jest BlastTile.clearAnimation --no-coverage` | ✅ (needs new cases) | ⬜ pending |
| 51-02-02 | 02 | 1 | TILE-11 | unit | `npx jest BlastTile.clearAnimation --no-coverage` | ✅ (needs new cases) | ⬜ pending |
| 51-02-03 | 02 | 1 | TILE-11 | unit | `npx jest BlastTile.clearAnimation --no-coverage` | ✅ (needs new cases) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `BlastTileRules.ts` — add `mirror`, `silver`, `diamond` entries to `TILE_TINTS`, `TILE_BORDERS`, `GLOW_BASES`, `BLAST_TILE_CONFIGS`
- [ ] `BlastTileRules.ts` — remove orphan `wildcard` entries

*Existing test infrastructure covers all phase requirements — only code changes needed, no new test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual distinctiveness of idle animations | TILE-10 | Subjective aesthetic judgment | Play game with all tile types visible, verify each type has unique motion |
| Visual distinctiveness of death animations | TILE-11 | Subjective aesthetic judgment | Clear each tile type, verify unique visual effect |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
