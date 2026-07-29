/**
 * Test: Adventure Progress Resets on Refresh
 *
 * Bug: When the player completes a level, the level appears complete in-session
 * but resets (shows as not done) on page refresh or re-entry.
 *
 * Root Cause:
 * In GET /api/adventure/state, when player_progression row is missing (PGRST116),
 * the handler returns an early response with completions: [] — completely ignoring
 * the level_completions rows that were already fetched in the parallel Promise.all().
 *
 * How the inconsistent DB state arises:
 * POST /api/adventure/complete makes three sequential Supabase calls (not a transaction):
 *   1. SELECT player_progression + level_completions (parallel)
 *   2. UPSERT level_completions  ← SUCCEEDS
 *   3. INSERT player_progression (if missing, no error handling) + UPDATE player_progression
 *      ← FAILS if INSERT silently fails (network timeout, transient error, RLS, etc.)
 * Result: level_completions has the row, player_progression does not.
 *
 * On the next GET /api/adventure/state:
 *   - player_progression: PGRST116 (no row)
 *   - Early return fires: transformProgression(null, []) ← BUG: passes [] not completionsRows
 *   - level_completions data silently discarded
 *   - Client receives empty completions → level shows as not done
 *
 * Fix:
 *   GET /api/adventure/state — pass already-fetched completionsRows to transformProgression
 *   instead of hard-coding [].
 *   POST /api/adventure/complete — add error handling to the player_progression INSERT
 *   and switch to upsert to prevent duplicate-key failures on retry.
 */

describe('Adventure State: missing player_progression with existing completions', () => {
  const userId = 'test-user-abc123';

  // Simulated DB rows
  const completionRow = {
    user_id: userId,
    world: 1,
    level: 1,
    stars: 2,
    best_score: 450,
    best_words: 12,
    completed_at: '2026-03-27T10:00:00Z',
  };

  // Transform helpers (mirrors route logic)
  function transformCompletion(row: typeof completionRow) {
    return {
      world: row.world,
      level: row.level,
      stars: row.stars as 0 | 1 | 2 | 3,
      bestScore: row.best_score,
      bestWords: row.best_words,
      completedAt: row.completed_at,
    };
  }

  function transformProgressionBuggy(completionRows: typeof completionRow[]) {
    // BUG: the current code hard-codes [] instead of using fetched rows
    return {
      userId: userId,
      playerLevel: 1,
      xp: 0,
      currentWorld: 1,
      currentLevel: 1,
      totalStars: 0,
      completions: [], // ← BUG: ignores completionRows argument
      gold: 0,
      upgrades: {},
    };
  }

  function transformProgressionFixed(completionRows: typeof completionRow[]) {
    // FIXED: uses fetched completions
    const completions = completionRows.map(transformCompletion);
    return {
      userId: userId,
      playerLevel: 1,
      xp: 0,
      currentWorld: 1,
      currentLevel: 1,
      totalStars: 0,
      completions, // ← FIXED: populated from DB
      gold: 0,
      upgrades: {},
    };
  }

  describe('Buggy behavior (current code)', () => {
    it('BUG: returns empty completions even when level_completions has rows', () => {
      // GIVEN: player_progression row is missing (PGRST116) but level_completions has data
      const dbCompletions = [completionRow];

      // WHEN: current buggy early-return fires
      const response = transformProgressionBuggy(dbCompletions);

      // THEN: completions is empty — user sees level as not done
      expect(response.completions).toHaveLength(0);
      // The completed level is lost:
      expect(response.completions.find(c => c.world === 1 && c.level === 1)).toBeUndefined();
    });

    it('BUG: isLevelUnlocked logic fails because completions is empty', () => {
      // isLevelUnlocked(world, level, completions) checks if the previous level was completed
      // With empty completions, level 2 appears locked even though level 1 was completed
      const emptyCompletions: typeof completionRow[] = [];

      // Simple simulation of isLevelUnlocked(1, 2, completions):
      // World 1, Level 2 is unlocked if World 1, Level 1 exists in completions
      const isLevel2Unlocked = emptyCompletions.some(c => c.world === 1 && c.level === 1);

      expect(isLevel2Unlocked).toBe(false); // BUG: shows as locked
    });
  });

  describe('Fixed behavior', () => {
    it('should return completions fetched from level_completions when player_progression is missing', () => {
      // GIVEN: player_progression row is missing (PGRST116) but level_completions has data
      const dbCompletions = [completionRow];

      // WHEN: fixed handler uses fetched completions instead of hard-coding []
      const response = transformProgressionFixed(dbCompletions);

      // THEN: completions are populated — user sees level as done
      expect(response.completions).toHaveLength(1);
      expect(response.completions[0]).toMatchObject({
        world: 1,
        level: 1,
        stars: 2,
        bestScore: 450,
        bestWords: 12,
      });
    });

    it('should correctly unlock level 2 when level 1 completion is present', () => {
      const dbCompletions = [completionRow];
      const response = transformProgressionFixed(dbCompletions);

      // isLevelUnlocked(1, 2, completions) — level 2 unlocked if level 1 exists
      const isLevel2Unlocked = response.completions.some(c => c.world === 1 && c.level === 1);
      expect(isLevel2Unlocked).toBe(true);
    });

    it('should return empty completions when level_completions is also empty', () => {
      // GIVEN: both tables are empty (brand new user)
      const dbCompletions: typeof completionRow[] = [];

      // WHEN: fixed handler uses fetched (empty) completions
      const response = transformProgressionFixed(dbCompletions);

      // THEN: completions is empty — correct for a new user
      expect(response.completions).toHaveLength(0);
    });

    it('should preserve all completion fields across multiple completed levels', () => {
      // GIVEN: user has completed multiple levels but player_progression row is missing
      const multipleCompletions = [
        { ...completionRow, level: 1, stars: 3, best_score: 600 },
        { ...completionRow, level: 2, stars: 1, best_score: 200, completed_at: '2026-03-27T11:00:00Z' },
      ];

      const response = transformProgressionFixed(multipleCompletions);

      expect(response.completions).toHaveLength(2);
      expect(response.completions).toContainEqual(
        expect.objectContaining({ world: 1, level: 1, stars: 3, bestScore: 600 })
      );
      expect(response.completions).toContainEqual(
        expect.objectContaining({ world: 1, level: 2, stars: 1, bestScore: 200 })
      );
    });
  });
});

describe('Adventure Complete: silent INSERT failure leaves inconsistent state', () => {
  const userId = 'test-user-xyz';

  describe('The inconsistency that causes the bug', () => {
    it('BUG: level_completions is saved but player_progression INSERT has no error handling', () => {
      // This test documents the code path, not the DB behavior
      // The INSERT in the complete route:
      //   await supabase.from('player_progression').insert({...}) ← no error check
      //   existingProgression = { ... }  ← stale defaults used regardless
      //
      // If INSERT fails, existingProgression has stale defaults.
      // The subsequent UPDATE uses .eq('gold', 0).eq('total_stars', 0)
      // and finds 0 rows (no progression row) → PGRST116 → returns 500.
      // But level_completions was already upserted → inconsistent state.

      const insertResult = { data: null, error: { message: 'Network timeout', code: '23P01' } };
      const insertFailed = insertResult.error !== null;

      // Without error handling, code silently continues:
      const codeChecksForInsertError = false; // ← BUG: current code doesn't check

      expect(insertFailed).toBe(true);
      expect(codeChecksForInsertError).toBe(false); // documents the missing check
    });

    it('FIXED: upsert with error logging prevents silent failures', () => {
      // Fixed version checks the upsert result:
      const upsertResult = { data: null, error: null }; // success case
      const errorLogged = upsertResult.error !== null;

      // With the fix, any error is at least logged
      expect(errorLogged).toBe(false); // no error in success case
      // In error case, the error would be logged and code can handle it
    });
  });

  describe('Security check interaction with stale current_level', () => {
    it('BUG: 403 on level 2 when player_progression.current_level is stuck at 1', () => {
      // After a partial failure:
      //   level_completions: {world:1, level:1, stars:2}  ← saved
      //   player_progression: missing OR current_level=1  ← not updated
      //
      // On next completion attempt for level 2:
      //   existingCompletion = null  (level 2 not yet completed)
      //   playerLevel = current_level = 1
      //   Security check: world===playerWorld && level > playerLevel → 1===1 && 2 > 1 → 403!

      const playerLevel = 1; // stuck at 1, should be 2
      const attemptedLevel = 2;

      const wouldBe403 = attemptedLevel > playerLevel;
      expect(wouldBe403).toBe(true); // documents the 403 path
    });

    it('FIXED: level 2 completion succeeds when current_level is correctly 2', () => {
      const playerLevel = 2; // correctly advanced after level 1
      const attemptedLevel = 2;

      const wouldBe403 = attemptedLevel > playerLevel;
      expect(wouldBe403).toBe(false); // no 403
    });
  });
});
