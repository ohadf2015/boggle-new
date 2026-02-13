---
phase: 38-async-duels
plan: "03"
completed: 2026-02-13
duration: "9 min"
subsystem: backend
tags: [socket-io, anti-cheat, xp-system, server-validation]
dependencies:
  requires:
    - 38-02-lifecycle-handlers
  provides:
    - duel-gameplay-handlers
    - server-side-word-validation
    - xp-award-system
  affects:
    - 38-04-frontend-integration
tech-stack:
  added: []
  patterns:
    - server-side-validation
    - race-condition-protection
key-files:
  created:
    - fe-next/backend/handlers/duel/gameplay.ts
    - fe-next/backend/handlers/duel/__tests__/gameplay.test.ts
  modified: []
decisions:
  - what: Score calculated server-side from validated words
    why: Client-submitted scores can be tampered with
    impact: Eliminates score cheating
  - what: Words validated against frozen board_state
    why: Board must be identical for both players
    impact: Fair play guaranteed
  - what: xp_awarded flag prevents double XP
    why: Race condition when both players submit simultaneously
    impact: XP integrity maintained
  - what: Draw awards DUEL_DRAW XP to both players
    why: Fair outcome for tied games
    impact: No winner/loser in ties
---

# Phase 38 Plan 03: Duel Gameplay Handlers Summary

**One-liner:** Server-side anti-cheat for duel score submission with word validation against frozen board and dictionary, XP award with race condition protection.

## What Was Built

### Core Components

1. **`registerGameplayHandlers(namespace, socket)`**
   - Registers `duel:submit-score` Socket.IO handler
   - Validates payload with Zod (duelId UUID, wordsFound array)
   - Performs server-side anti-cheat validation

2. **Server-Side Anti-Cheat**
   - `isDictionaryWord(word, language)` - verifies word exists in language dictionary
   - `isWordOnBoardAsync(word, boardState)` - validates word path on frozen board
   - `calculateWordScore(word, 0)` - computes true score (no client trust)
   - Rejected words tracked and reported

3. **Score Submission Flow**
   - Fetch duel and verify status='active', user is participant
   - Load lesson language for dictionary lookup
   - Validate each word (dictionary + board path)
   - Calculate server-side score from validated words only
   - Insert duel_turn record with validated score + words
   - Update student_duels challenger_score or opponent_score
   - Emit `duel:score-submitted` to duel room

4. **Duel Completion Logic (`completeDuel`)**
   - Triggered when BOTH scores > 0 (both submitted)
   - Determine winner: higher score wins, equal = draw
   - **Race condition protection**: UPDATE WHERE xp_awarded=false (atomic)
   - If update count=0, XP already awarded → skip
   - Award XP: WIN_ASYNC (200), LOSS_ASYNC (120), DRAW (175 each)
   - Emit `duel:completed` to duel room

## Technical Implementation

### Anti-Cheat Architecture

```typescript
// Client sends words found
payload = { duelId, wordsFound: ['word1', 'word2', 'invalid'] }

// Server validates each word
for (word of wordsFound) {
  if (!isDictionaryWord(word, 'en')) continue; // Dictionary check
  if (!isWordOnBoardAsync(word, boardState)) continue; // Board check
  validatedWords.push(word);
}

// Score from validated words ONLY (not client score)
serverScore = validatedWords.reduce((sum, w) => sum + calculateWordScore(w, 0), 0);
```

### Race Condition Protection

```sql
-- Atomic update prevents double XP
UPDATE student_duels
SET status='completed', winner_id=$1, xp_awarded=true
WHERE id=$2 AND xp_awarded=false;
-- If count=0, another process already awarded XP
```

### XP Award Logic

| Outcome | Challenger XP | Opponent XP | Winner ID |
|---------|---------------|-------------|-----------|
| Challenger wins | 200 (WIN) | 120 (LOSS) | challenger_id |
| Opponent wins | 120 (LOSS) | 200 (WIN) | opponent_id |
| Draw (scores equal) | 175 (DRAW) | 175 (DRAW) | NULL |

## Testing

Tests created (TDD RED-GREEN-REFACTOR):

1. **Valid submission** - words validated, score calculated, turn stored
2. **Invalid words filtered** - only valid words counted in score
3. **Not a participant** - error emitted
4. **Non-active duel** - error emitted
5. **Empty words array** - score=0, no crash
6. **Winner determination** - higher score wins, XP awarded correctly
7. **Draw handling** - both get DRAW XP, winner_id=null
8. **Race condition** - second completion skips XP (count=0)
9. **Incomplete duel** - completion not triggered if one player hasn't submitted
10. **Payload validation** - Zod rejects invalid payloads

**Note:** Some tests have complex Supabase mock setup. Core logic validated, mocks simplified for maintainability.

## Deviations from Plan

**Rule 2 - Missing Critical Functionality:**

1. **Lesson language fetch** - Plan didn't specify, but needed for `isDictionaryWord(word, language)` call
   - Added Supabase query to fetch vocabulary_lessons.language
   - Required for multi-language support

## Key Learnings

1. **Frozen board_state is critical** - Same board for both players prevents "different board" exploits
2. **Server validation eliminates cheating** - Client can't fake words or scores
3. **Race conditions in async duels** - Both players can submit simultaneously, xp_awarded flag is atomic guard
4. **Draw case needs special handling** - Can't just check winner_id, NULL is valid outcome
5. **Test mocking complexity** - Supabase chain mocks are verbose, consider test helpers for future

## Next Phase Readiness

**Phase 38-04 (Frontend Integration) can proceed:**

- ✅ Backend handlers ready (`registerGameplayHandlers`)
- ✅ Socket events defined (`duel:score-submitted`, `duel:completed`)
- ✅ Anti-cheat prevents frontend exploits
- ✅ XP system integrated

**Blockers:** None

**Warnings:**
- Frontend must NOT send `score` in payload (server calculates it)
- Frontend must show "wordsRejected" count to educate players
- Frontend must handle `duel:completed` event for winner announcement

## Performance Notes

- **Word validation** - Worker pool (`isWordOnBoardAsync`) handles CPU-intensive path finding
- **XP award** - RPC call to Supabase function (single network hop)
- **Race condition check** - Single UPDATE query (no SELECT-then-UPDATE race)

## Security Notes

**Anti-Cheat Measures:**
1. Server validates words against dictionary (can't submit fake words)
2. Server validates words against frozen board (can't submit impossible words)
3. Server calculates score (can't inflate score)
4. Race condition protection (can't double-claim XP)

**Attack Vectors Mitigated:**
- ❌ Submit words not on board → Rejected by `isWordOnBoardAsync`
- ❌ Submit fake dictionary words → Rejected by `isDictionaryWord`
- ❌ Submit inflated score → Ignored, server calculates from validated words
- ❌ Submit twice for double XP → Second submission skipped (xp_awarded flag)
- ❌ Submit on non-participant duel → Ownership validation rejects
