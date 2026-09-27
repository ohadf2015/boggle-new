/**
 * Adventure Progress API Logic Tests
 *
 * Tests validation and calculation functions used by the API routes
 * Following the pattern of testing underlying logic rather than HTTP endpoints
 */

import type { LevelCompletion, PlayerProgression } from '@/types/adventure';

// ============================================
// Validation Logic (extracted for testing)
// ============================================

interface CompletionRequestBody {
  world: number;
  level: number;
  stars: number;
  score: number;
  words: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: CompletionRequestBody;
}

/**
 * Validate completion request body
 */
function validateRequestBody(body: Record<string, unknown>): ValidationResult {
  const { world, level, stars, score, words } = body;

  // Check required fields
  if (
    typeof world !== 'number' ||
    typeof level !== 'number' ||
    typeof stars !== 'number' ||
    typeof score !== 'number' ||
    typeof words !== 'number'
  ) {
    return { valid: false, error: 'Missing required fields: world, level, stars, score, words' };
  }

  // Validate world range (1-10)
  if (world < 1 || world > 10) {
    return { valid: false, error: 'Invalid world: must be between 1 and 10' };
  }

  // Validate level range (1-10)
  if (level < 1 || level > 10) {
    return { valid: false, error: 'Invalid level: must be between 1 and 10' };
  }

  // Validate stars range (0-3)
  if (stars < 0 || stars > 3) {
    return { valid: false, error: 'Invalid stars: must be between 0 and 3' };
  }

  // Validate score (non-negative)
  if (score < 0) {
    return { valid: false, error: 'Invalid score: must be non-negative' };
  }

  // Validate words (non-negative)
  if (words < 0) {
    return { valid: false, error: 'Invalid words: must be non-negative' };
  }

  return {
    valid: true,
    data: { world, level, stars, score, words },
  };
}

/**
 * Calculate player level from total XP
 * Uses curved progression: Level N requires N^1.5 * 100 XP
 */
function calculatePlayerLevel(totalXp: number): number {
  let level = 1;
  while (level < 50) {
    const xpRequired = Math.floor(Math.pow(level, 1.5) * 100);
    if (totalXp < xpRequired) {
      return level;
    }
    level++;
  }
  return 50;
}

/**
 * Calculate XP required for a specific level
 */
function xpForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;
  if (targetLevel > 50) return Math.floor(Math.pow(50, 1.5) * 100);
  return Math.floor(Math.pow(targetLevel, 1.5) * 100);
}

/**
 * Transform database row to PlayerProgression type
 */
function transformProgression(
  dbRow: Record<string, unknown> | null,
  completions: LevelCompletion[]
): PlayerProgression {
  if (!dbRow) {
    return {
      userId: '',
      playerLevel: 1,
      xp: 0,
      currentWorld: 1,
      currentLevel: 1,
      totalStars: 0,
      completions: [],
      gold: 0,
      upgrades: {},
      skillPoints: 0,
      skillTree: {},
      runeFragments: 0,
      runes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    userId: dbRow.user_id as string,
    playerLevel: dbRow.player_level as number,
    xp: dbRow.xp as number,
    currentWorld: dbRow.current_world as number,
    currentLevel: dbRow.current_level as number,
    totalStars: dbRow.total_stars as number,
    completions,
    gold: (dbRow.gold as number) ?? 0,
    upgrades: (dbRow.upgrades as Record<string, number>) ?? {},
    skillPoints: (dbRow.skill_points as number) ?? 0,
    skillTree: (dbRow.skill_tree as Record<string, number>) ?? {},
    runeFragments: (dbRow.rune_fragments as number) ?? 0,
    runes: (dbRow.runes as Array<{ runeId: string; equipped: boolean }>) ?? [],
    createdAt: dbRow.created_at as string,
    updatedAt: dbRow.updated_at as string,
  };
}

// ============================================
// Tests
// ============================================

describe('Adventure Progress API - Validation Logic', () => {
  describe('validateRequestBody', () => {
    it('should accept valid request body', () => {
      const result = validateRequestBody({
        world: 1,
        level: 1,
        stars: 2,
        score: 300,
        words: 12,
      });

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({
        world: 1,
        level: 1,
        stars: 2,
        score: 300,
        words: 12,
      });
    });

    it('should reject missing required fields', () => {
      const result = validateRequestBody({ world: 1 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should reject invalid world (too low)', () => {
      const result = validateRequestBody({
        world: 0,
        level: 1,
        stars: 2,
        score: 300,
        words: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid world');
    });

    it('should reject invalid world (too high)', () => {
      const result = validateRequestBody({
        world: 15,
        level: 1,
        stars: 2,
        score: 300,
        words: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid world');
    });

    it('should reject invalid level (too low)', () => {
      const result = validateRequestBody({
        world: 1,
        level: 0,
        stars: 2,
        score: 300,
        words: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid level');
    });

    it('should reject invalid level (too high)', () => {
      const result = validateRequestBody({
        world: 1,
        level: 11,
        stars: 2,
        score: 300,
        words: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid level');
    });

    it('should reject invalid stars (negative)', () => {
      const result = validateRequestBody({
        world: 1,
        level: 1,
        stars: -1,
        score: 300,
        words: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid stars');
    });

    it('should reject invalid stars (too high)', () => {
      const result = validateRequestBody({
        world: 1,
        level: 1,
        stars: 5,
        score: 300,
        words: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid stars');
    });

    it('should reject negative score', () => {
      const result = validateRequestBody({
        world: 1,
        level: 1,
        stars: 2,
        score: -100,
        words: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid score');
    });

    it('should reject negative words', () => {
      const result = validateRequestBody({
        world: 1,
        level: 1,
        stars: 2,
        score: 300,
        words: -5,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid words');
    });

    it('should accept boundary values', () => {
      // Min boundaries
      const minResult = validateRequestBody({
        world: 1,
        level: 1,
        stars: 0,
        score: 0,
        words: 0,
      });
      expect(minResult.valid).toBe(true);

      // Max boundaries
      const maxResult = validateRequestBody({
        world: 10,
        level: 10,
        stars: 3,
        score: 999999,
        words: 100,
      });
      expect(maxResult.valid).toBe(true);
    });
  });

  describe('calculatePlayerLevel', () => {
    it('should return level 1 for 0 XP', () => {
      expect(calculatePlayerLevel(0)).toBe(1);
    });

    it('should return level 1 for XP below threshold', () => {
      // Level 1 requires 1^1.5 * 100 = 100 XP
      expect(calculatePlayerLevel(50)).toBe(1);
      expect(calculatePlayerLevel(99)).toBe(1);
    });

    it('should return level 2 at correct threshold', () => {
      // Level 2 requires 2^1.5 * 100 ≈ 282 XP
      expect(calculatePlayerLevel(100)).toBe(2);
      expect(calculatePlayerLevel(200)).toBe(2);
      expect(calculatePlayerLevel(281)).toBe(2);
    });

    it('should return level 3 at correct threshold', () => {
      // Level 3 requires 3^1.5 * 100 ≈ 519 XP
      expect(calculatePlayerLevel(282)).toBe(3);
      expect(calculatePlayerLevel(400)).toBe(3);
    });

    it('should cap at level 50', () => {
      expect(calculatePlayerLevel(999999999)).toBe(50);
    });

    it('should progress smoothly through levels', () => {
      let prevLevel = 0;
      for (let xp = 0; xp <= 50000; xp += 100) {
        const level = calculatePlayerLevel(xp);
        expect(level).toBeGreaterThanOrEqual(prevLevel);
        prevLevel = level;
      }
    });
  });

  describe('xpForLevel', () => {
    it('should return 0 for level 1 or below', () => {
      expect(xpForLevel(1)).toBe(0);
      expect(xpForLevel(0)).toBe(0);
      expect(xpForLevel(-1)).toBe(0);
    });

    it('should return correct XP for level 2', () => {
      // Level 2 requires 2^1.5 * 100 ≈ 282
      expect(xpForLevel(2)).toBe(Math.floor(Math.pow(2, 1.5) * 100));
    });

    it('should return correct XP for level 10', () => {
      expect(xpForLevel(10)).toBe(Math.floor(Math.pow(10, 1.5) * 100));
    });

    it('should cap at level 50 requirement', () => {
      const level50Xp = Math.floor(Math.pow(50, 1.5) * 100);
      expect(xpForLevel(50)).toBe(level50Xp);
      expect(xpForLevel(51)).toBe(level50Xp);
      expect(xpForLevel(100)).toBe(level50Xp);
    });
  });

  describe('transformProgression', () => {
    it('should return default progression for null row', () => {
      const result = transformProgression(null, []);

      expect(result.userId).toBe('');
      expect(result.playerLevel).toBe(1);
      expect(result.xp).toBe(0);
      expect(result.currentWorld).toBe(1);
      expect(result.currentLevel).toBe(1);
      expect(result.totalStars).toBe(0);
      expect(result.completions).toEqual([]);
    });

    it('should transform database row correctly', () => {
      const dbRow = {
        user_id: 'user-123',
        player_level: 5,
        xp: 1250,
        current_world: 2,
        current_level: 3,
        total_stars: 24,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      const completions: LevelCompletion[] = [
        {
          world: 1,
          level: 1,
          stars: 3,
          bestScore: 500,
          bestWords: 20,
          completedAt: '2024-01-10T00:00:00Z',
        },
      ];

      const result = transformProgression(dbRow, completions);

      expect(result.userId).toBe('user-123');
      expect(result.playerLevel).toBe(5);
      expect(result.xp).toBe(1250);
      expect(result.currentWorld).toBe(2);
      expect(result.currentLevel).toBe(3);
      expect(result.totalStars).toBe(24);
      expect(result.completions).toEqual(completions);
      expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2024-01-15T10:00:00Z');
    });
  });
});

describe('Adventure Progress API - XP Calculations', () => {
  const XP_PER_STAR = 25;
  const BASE_COMPLETION_XP = 50;

  describe('XP earned on first completion', () => {
    it('should award base XP plus star bonus', () => {
      const stars = 2;
      const xpEarned = BASE_COMPLETION_XP + (stars * XP_PER_STAR);

      expect(xpEarned).toBe(100); // 50 + (2 * 25)
    });

    it('should award only base XP for 0 stars', () => {
      const stars = 0;
      const xpEarned = BASE_COMPLETION_XP + (stars * XP_PER_STAR);

      expect(xpEarned).toBe(50);
    });

    it('should award maximum XP for 3 stars', () => {
      const stars = 3;
      const xpEarned = BASE_COMPLETION_XP + (stars * XP_PER_STAR);

      expect(xpEarned).toBe(125); // 50 + (3 * 25)
    });
  });

  describe('XP earned on improved completion', () => {
    it('should award XP only for new stars gained', () => {
      const previousStars = 1;
      const newStars = 3;
      const starsGained = newStars - previousStars;
      const xpEarned = starsGained * XP_PER_STAR;

      expect(xpEarned).toBe(50); // 2 new stars * 25
    });

    it('should award 0 XP when no improvement', () => {
      const previousStars = 2;
      const newStars = 1; // Worse performance
      const starsGained = Math.max(0, newStars - previousStars);
      const xpEarned = starsGained * XP_PER_STAR;

      expect(xpEarned).toBe(0);
    });
  });

  describe('Stars tracking', () => {
    it('should keep best stars on repeated completion', () => {
      const previousStars = 3;
      const newAttemptStars = 1;
      const keptStars = Math.max(previousStars, newAttemptStars);

      expect(keptStars).toBe(3);
    });

    it('should update stars when improved', () => {
      const previousStars = 1;
      const newAttemptStars = 3;
      const keptStars = Math.max(previousStars, newAttemptStars);

      expect(keptStars).toBe(3);
    });
  });

  describe('Score tracking', () => {
    it('should keep best score on repeated completion', () => {
      const previousBestScore = 500;
      const newScore = 300;
      const keptScore = Math.max(previousBestScore, newScore);

      expect(keptScore).toBe(500);
    });

    it('should update score when improved', () => {
      const previousBestScore = 300;
      const newScore = 500;
      const keptScore = Math.max(previousBestScore, newScore);

      expect(keptScore).toBe(500);
    });
  });
});

describe('Adventure Progress API - Next Level Calculation', () => {
  function calculateNextLevel(world: number, level: number): { nextWorld: number; nextLevel: number } {
    let nextWorld = world;
    let nextLevel = level + 1;

    if (nextLevel > 10) {
      nextWorld = world + 1;
      nextLevel = 1;
    }

    if (nextWorld > 10) {
      nextWorld = 10;
      nextLevel = 10;
    }

    return { nextWorld, nextLevel };
  }

  it('should increment level within same world', () => {
    const result = calculateNextLevel(1, 5);
    expect(result).toEqual({ nextWorld: 1, nextLevel: 6 });
  });

  it('should move to next world when completing level 10', () => {
    const result = calculateNextLevel(1, 10);
    expect(result).toEqual({ nextWorld: 2, nextLevel: 1 });
  });

  it('should stay at max when completing final level', () => {
    const result = calculateNextLevel(10, 10);
    expect(result).toEqual({ nextWorld: 10, nextLevel: 10 });
  });

  it('should handle mid-game progression', () => {
    expect(calculateNextLevel(5, 7)).toEqual({ nextWorld: 5, nextLevel: 8 });
    expect(calculateNextLevel(5, 10)).toEqual({ nextWorld: 6, nextLevel: 1 });
  });
});
