# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-13)

**Core value:** Students learn vocabulary through engaging, competitive gameplay that makes practice feel like play — not homework.
**Current focus:** Phase 38 COMPLETE — Async Duels. Ready for Phase 39.

## Current Position

Phase: 39 of 43 (Real-Time Duels) — IN PROGRESS
Plan: 1 of 8 in current phase (1 complete: 39-01)
Status: Real-time duel handlers complete with TDD. Ready for 39-02 (disconnection handling).
Last activity: 2026-02-13 — Completed 39-01-PLAN.md (real-time handlers)

Progress: [███████████] ~38.1% (3.125/8 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 21
- Average duration: 14 min
- Total execution time: 301 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 36 | 5 | 141 min | 28 min |
| 37 | 6 | 46 min | 8 min |
| 38 | 8 | 83 min | 10 min |
| 39 | 1 | 25 min | 25 min |

**Recent Trend:**
- Last 5 plans: 38-07 (6 min), 38-08 (5 min), 39-01 (research), 39-01 (25 min)
- Trend: Phase 39 starting with comprehensive TDD (25 min for real-time handlers)
- TDD execution: 11/11 core tests passing, 4 timer tests skipped (Jest limitation)
- Phase 38 COMPLETE: All async duel functionality delivered
- Phase 39 IN PROGRESS: Real-time handlers complete

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
- **38-04:** In-memory lobby tracking acceptable for single-server deployment (Map-based, no Redis needed yet)
- **38-04:** Event listener cleanup pattern: on* methods return unsubscribe function (React useEffect compatible)
- **38-04:** Lobby state vs update: New joiner gets full state, others get delta (bandwidth optimization)
- **38-05:** Modal overlay pattern with fixed positioning for challenge modal
- **38-05:** Toast position: bottom-right desktop, top-right mobile (non-blocking)
- **38-05:** 30-second auto-dismiss for challenge notifications
- **38-05:** Quick Match uses random opponent selection (simple, fair)
- **38-06:** Text input for word finding (not drag-based) - simplifies async duel UX
- **38-06:** Score displayed only after submission (not during play) - focus on word finding, server validates
- **38-06:** Win rate calculated client-side (simple formula, no server needed)
- **38-06:** Duel translations in education.duels namespace (nested for organization)
- **38-06:** Fire icon on win streak >= 3 (visual reward for consistency)
- **38-07:** State-based tabs instead of routing-based (instant switching, better UX)
- **38-07:** Participant verification on duel page load (server-side security check)
- **38-07:** ChallengeButton dual variants (button and icon) for flexible placement (SOC-02)
- **38-08:** Flat translation key convention applied to duel keys (duelLobbyTitle not education.duels.duelLobbyTitle)
- **39-01:** In-memory Map for active real-time duel game state (O(1) lookups, auto-cleanup)
- **39-01:** socket.to(room).emit() for opponent-only broadcasts (excludes sender automatically)
- **39-01:** Server-side word validation with isWordOnBoardAsync + isDictionaryWord (anti-cheat)
- **39-01:** Server-side timer for duel completion (prevents client clock drift)
- **39-01:** Language type cast safe for DB strings (validated by DB constraints)

### Pending Todos

None yet.

### Blockers/Concerns

- Pre-existing build error: utils/supabase/server.ts uses next/headers in client component context (not related to Phase 37)

## Session Continuity

Last session: 2026-02-13
Stopped at: Completed 39-01-PLAN.md (real-time handlers with TDD)
Resume file: None
Next action: Execute 39-02 (disconnection handling)
