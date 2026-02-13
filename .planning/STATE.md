# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-13)

**Core value:** Students learn vocabulary through engaging, competitive gameplay that makes practice feel like play — not homework.
**Current focus:** Phase 37 COMPLETE — Practice Modes. Ready for Phase 38.

## Current Position

Phase: 38 of 43 (Async Duels) — IN PROGRESS
Plan: 3 of 6 in current phase (just completed)
Status: Duel gameplay handlers with server-side anti-cheat validation
Last activity: 2026-02-13 — Completed 38-03-PLAN.md (Duel Gameplay Handlers)

Progress: [████████░░] ~21%

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: 14 min
- Total execution time: 208 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 36 | 5 | 141 min | 28 min |
| 37 | 6 | 46 min | 8 min |
| 38 | 3 | 21 min | 7 min |

**Recent Trend:**
- Last 5 plans: 37-05 (15 min), 37-06 (12 min), 38-01 (4 min), 38-02 (8 min), 38-03 (9 min)
- Trend: Phase 38 maintaining velocity (7 min average)
- TDD approach with server-side validation
- Anti-cheat architecture preventing score tampering

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v2.0 scope: Duels (async + real-time), practice modes (matching, spelling, blitz), full education overhaul (8 phases)
- Design approach: Use /superdesign for new UI designs before implementation
- **36-01:** Barrel export pattern for module re-exports (lib/supabase/education/index.ts)
- **36-01:** normalizeForStorage and containsHebrew exported in types.ts for cross-module usage
- **36-01:** Foundation stubs created early (duels.ts, practice.ts) to establish module structure
- **36-02:** Import migration done in single atomic commit for easy rollback if needed
- **36-02:** Consolidated imports pattern: import { value, type Type } from './module' (single line)
- **36-03:** FK references profiles(id) following blast_results pattern (not auth.users)
- **36-03:** practice_sessions allows NULL classroom_id for personal practice
- **36-04:** Socket.IO namespace isolation pattern (/duel namespace separate from default)
- **36-04:** Room naming convention: duel:${id} for games, duel:lobby:${classroomId} for lobbies
- **36-04:** Event naming: All duel events use duel: prefix for namespace isolation
- **36-05:** Mode parity design - Similar XP/hour across all practice modes (no favoritism)
- **36-05:** Anti-inflation rules - New activities don't double-count XP
- **36-05:** Progression target - Students level up every 3-4 days at early levels with daily practice
- **36-05:** Loss XP floor - Losing a duel awards participation XP (60% of win)
- **37-01:** Server-side Supabase client pattern for practice.ts DB operations
- **37-01:** Separate usePracticeSessionNew hook instead of extending existing (different patterns)
- **37-01:** Client-side accuracy calculation for immediate XP feedback (server validates)
- **37-01:** Simplified spelling accuracy: wordsSpelled/10 for threshold checking
- **37-02:** checkMatch signature uses definitionText (not definitionId) for simpler API
- **37-02:** touch-action: none on draggable items for iOS scroll prevention
- **37-02:** Component memoization pattern for drag-and-drop sub-components
- **37-03:** First letter hint is free (doesn't count toward hints used)
- **37-03:** Hints beyond first reset current streak to 0
- **37-03:** Auto-advance timing: 1s for correct answers, 2s for incorrect (feedback visibility)
- **37-03:** Hebrew normalization must sanitize niqqud before normalizing final letters
- **37-05:** PracticeType union extended (matching, spelling, blitz) - ripple effect managed across 6 files
- **37-05:** CSS variables used for neo-purple and neo-red (no Tailwind classes yet)
- **37-05:** Mode selector shows 7 practice modes with session counts
- **37-06:** Flat translation key convention (matching, matchingDesc) not nested (matching.title, matching.desc)
- **38-01:** Declined status separate from cancelled (opponent-initiated vs challenger-initiated)
- **38-01:** Server-side Supabase client pattern for duels.ts (following practice.ts)
- **38-01:** Computed isWin field in getDuelHistory (avoids complex SQL)
- **38-01:** Streak calculation processes duels chronologically (current vs max streak)
- **38-02:** Zod for Socket.IO payload validation (type-safe + runtime)
- **38-02:** Frozen board generated at duel creation time (same board for both players)
- **38-02:** State transitions validated server-side via VALID_TRANSITIONS map
- **38-02:** Ownership validation on accept/decline/cancel (only authorized user can perform action)
- **38-03:** Score calculated server-side from validated words (client-submitted scores can be tampered with)
- **38-03:** Words validated against frozen board_state (fair play guarantee)
- **38-03:** xp_awarded flag prevents double XP (race condition protection)
- **38-03:** Draw awards DUEL_DRAW XP to both players (fair outcome for ties)

### Pending Todos

None yet.

### Blockers/Concerns

- Pre-existing build error: utils/supabase/server.ts uses next/headers in client component context (not related to Phase 37)

## Session Continuity

Last session: 2026-02-13
Stopped at: Completed 38-03-PLAN.md (Duel Gameplay Handlers)
Resume file: None
Next action: Execute 38-04-PLAN.md (Frontend Duel Integration)
