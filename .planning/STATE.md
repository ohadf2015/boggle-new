# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** Students learn vocabulary through engaging, competitive gameplay that makes practice feel like play — not homework.
**Current focus:** Phase 46 — Foundation (Unified Tile Types & Bug Fixes)

## Current Position

Phase: 46 of 52 (Foundation — Unified Tile Types & Bug Fixes)
Plan: 4 of 4 in current phase (all complete)
Status: In progress
Last activity: 2026-03-04 — 46-03 complete (BUGF-03 through BUGF-07: gold multiplicative, cascade dedup, frozen crack, bomb double-BFS, stale state ref, 631 blast tests pass)

Progress: [██░░░░░░░░░░░░░░░░░░] 7% (v3.0 milestone, 2/27 plans complete)

## Performance Metrics

**v2.0 Velocity (baseline):**
- Total plans completed: 46
- Average duration: ~11 min/plan
- Total execution time: ~593 min
- Commits: 109 | Files: 200 | LOC: +34,809 / -1,378

**v3.0 by Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 46 | 4 | 16min (4/4 complete) | 4min |
| 47 | 5 | - | - |
| 48 | 4 | - | - |
| 49 | 4 | - | - |
| 50 | 4 | - | - |
| 51 | 2 | - | - |
| 52 | 4 | - | - |

*Updated after each plan completion*
| Phase 46 P03 | 4 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Recent decisions affecting v3.0 (see PROJECT.md Key Decisions for full log):
- Rainbow Boost: copies+doubles best special in word; solo = 2x word score
- Remove Wildcard: no mechanic, diluting pool at ~17% spawn rate
- Mirror tile (new): doubles combo partner's effect
- Redesign before bug fixes: new combo system rewrites much buggy code anyway
- 28-pair matrix: every tile pair has defined synergy
- Word-length scaling: 1.0x base / 1.5x at 5-6 letters / 2.0x at 7+
- [Phase 46]: MIN_STANDARD_RATIO=0.6: when board already exceeds special budget, no additional specials placed (correct behavior)
- [Phase 46]: Fisher-Yates shuffle on standardPositions distributes objective tiles randomly vs sequential top-left clustering
- [Phase 46 - 46-02]: processedLightning Set prevents double column-clear when lightning is at prism row+column intersection
- [Phase 46 - 46-02]: LIGHTNING_COLUMN_CLEAR_BONUS awarded for tiles cleared by chain-triggered lightning (prism→lightning path)
- [Phase 46]: Gold stacking multiplicative (3^n): 2 gold = 9x, not 5x
- [Phase 46]: Cascade foundSet empty: cascade re-formations are new formations, always score
- [Phase 46]: tileStatesRef pattern: async timer callbacks use ref not closure to avoid stale state

### Pending Todos

None.

### Blockers/Concerns

- ~~SP/MP tile type divergence (TILE-08)~~ RESOLVED in 46-01
- Pre-existing build error: utils/supabase/server.ts uses next/headers in client component context (not v3.0 scope)
- Migration 40-01 not yet applied to database (not v3.0 scope)

## Session Continuity

Last session: 2026-03-04
Stopped at: Completed 46-03-PLAN.md (BUGF-03 through BUGF-07: gold multiplicative 3^n, cascade empty foundSet, frozen crack, bomb double-BFS dedup, tileStatesRef, 631 blast tests pass)
Resume file: None
