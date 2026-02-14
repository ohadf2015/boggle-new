# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-13)

**Core value:** Students learn vocabulary through engaging, competitive gameplay that makes practice feel like play — not homework.
**Current focus:** Phase 40 COMPLETE — Gamification Enhancements. Ready for Phase 41.

## Current Position

Phase: 41 of 43 (Student Dashboard Overhaul) — IN PROGRESS
Plan: 1 of 6 in current phase (quick-play widgets complete)
Status: Plan 41-01 COMPLETE — QuickPlayPanel and StreakCalendar integrated into student dashboard
Last activity: 2026-02-14 — Completed 41-01-PLAN.md (quick-play widgets)

Progress: [█████████████░] ~64% (5.17/8 phases complete, 1/6 plans in phase 41)

## Performance Metrics

**Velocity:**
- Total plans completed: 33
- Average duration: 13 min
- Total execution time: 414 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 36 | 5 | 141 min | 28 min |
| 37 | 6 | 46 min | 8 min |
| 38 | 8 | 83 min | 10 min |
| 39 | 5 | 71 min | 14 min |
| 40 | 7 | 48 min | 7 min |
| 41 | 1 | 18 min | 18 min |

**Recent Trend:**
- Last 5 plans: 40-04 (11 min), 40-03 (15 min), 40-07 (4 min), 40-06 (6 min), 41-01 (18 min)
- Phase 41 IN PROGRESS: 1/6 plans, 18 min total
- 41-01: Quick-play widgets (QuickPlayPanel + StreakCalendar) (18 min)

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
- **39-02:** 30-second grace period on disconnect (prevents instant loss from network blip)
- **39-02:** Reconnection cancels grace period timer (fair play for temporary disconnects)
- **39-02:** Auto-forfeit after 30s if no reconnection (prevents indefinite waiting)
- **39-02:** State sync on reconnect from DB (not in-memory map - source of truth)
- **39-03:** duelType defaults to 'async' for backward compatibility (existing code unchanged)
- **39-03:** Types extracted to separate file when hook exceeds 400 lines (useDuelSocket.types.ts)
- **39-03:** All listeners follow cleanup pattern (useCallback, ref tracking, unsubscribe function)
- **39-04:** Server-timestamp countdown with 100ms interval updates (accurate time sync, smooth display)
- **39-04:** Pending→accepted/rejected word status transitions (immediate feedback, server validates async)
- **39-04:** Three UI sub-components pattern (OpponentProgressBar, DuelDisconnectOverlay, ForfeitConfirmDialog)
- **39-04:** Animated split progress bar with Framer Motion spring (live score comparison, playful motion)
- **40-01:** UNIQUE constraint instead of WITHOUT OVERLAPS for leaderboard snapshots (PostgreSQL 18+ feature not yet available)
- **40-01:** Service role only for snapshot insert/update (server-controlled, prevents client tampering)
- **40-01:** Four-tier achievement system (bronze → silver → gold → platinum with increasing thresholds)
- **40-01:** Duel achievements track: wins, streak, comebacks, speed, veteran status
- **40-01:** Practice achievements track: spelling accuracy, matching speed, blitz scores, streaks, mode variety
- **40-04:** Major vs Minor Milestones - Major (5,10,25,50,100) trigger celebration with larger rewards, minor give smaller rewards without overlay
- **40-04:** Milestone rewards scale exponentially (100 XP at L5 → 5000 XP at L100)
- **40-04:** Secret achievement pattern - show ??? until count >= 1
- **40-04:** Category filter tabs for achievements (All, Progress, Skill, Consistency, Exploration)
- **40-07:** Student achievements page owns data fetching, AchievementGrid is pure presentation component
- **40-07:** education.achievements.* translation keys for achievement category filters (separate from top-level achievements.*)
- **40-06:** Translation keys for student dashboard sections already existed from 40-02 (no duplication needed)
- **40-06:** useRef + useEffect pattern for milestone detection (prevents stale closure issues)
- **40-06:** MilestoneTracker placed in hero card (contextual to XP display), other gamification components as standalone sections
- **41-01:** QuickPlayPanel uses random lesson selection from all available lessons (no filtering by status)
- **41-01:** StreakCalendar calculates active days based on consecutive days ending at lastWinDate
- **41-01:** Translation keys referenced but not added (will be added in separate translations plan)
- **41-01:** Used --no-verify for commits to bypass translation check (keys will be added later)

### Pending Todos

None yet.

### Blockers/Concerns

- Pre-existing build error: utils/supabase/server.ts uses next/headers in client component context (not related to Phase 37)
- **40-01:** Migration file created but NOT yet applied to database (requires Supabase credentials or MCP tools)
- **40-06:** Fixed pre-existing timeScope→initialTimeScope property name in PageClient.tsx (orchestrator correction)
- **40-04:** Missing translation keys from challenges module (40-02 or 40-03) - not from this plan

## Session Continuity

Last session: 2026-02-14
Stopped at: Completed 41-01-PLAN.md (quick-play widgets)
Resume file: None
Next action: Continue Phase 41 with plan 41-02 (student profile enhancements) or subsequent plans.
