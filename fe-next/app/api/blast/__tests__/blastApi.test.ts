/**
 * Blast API Logic Tests
 *
 * Tests validation and personal best calculation functions
 * used by the blast score persistence API routes.
 */

import {
  validateBlastResult,
  calculatePersonalBests,
} from '../utils';

describe('validateBlastResult', () => {
  // Cast to Record<string, unknown> to match function signature (validation accepts untyped input)
  const validPayload = {
    score: 150,
    tilesCleared: 20,
    totalTiles: 36,
    clearPercentage: 55.6,
    wordsFound: ['CAT', 'DOG', 'FISH'],
    bestWord: 'FISH',
    maxCombo: 3,
    stars: 2,
    difficulty: 'medium',
    language: 'en',
  } as Record<string, unknown>;

  it('should accept a valid payload', () => {
    const result = validateBlastResult(validPayload);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should reject missing score', () => {
    const { score: _, ...rest } = validPayload;
    const result = validateBlastResult(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('score');
  });

  it('should reject negative score', () => {
    const result = validateBlastResult({ ...validPayload, score: -10 });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid stars', () => {
    const result = validateBlastResult({ ...validPayload, stars: 5 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('stars');
  });

  it('should reject invalid difficulty', () => {
    const result = validateBlastResult({ ...validPayload, difficulty: 'extreme' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('difficulty');
  });

  it('should reject non-array wordsFound', () => {
    const result = validateBlastResult({ ...validPayload, wordsFound: 'not-array' });
    expect(result.valid).toBe(false);
  });

  it('should accept tilesCleared > totalTiles (cumulative in gravity mode)', () => {
    const result = validateBlastResult({ ...validPayload, tilesCleared: 50, totalTiles: 36 });
    expect(result.valid).toBe(true);
  });

  it('should accept all valid difficulties', () => {
    for (const d of ['easy', 'medium', 'hard']) {
      const result = validateBlastResult({ ...validPayload, difficulty: d });
      expect(result.valid).toBe(true);
    }
  });

  it('should accept all valid languages', () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es']) {
      const result = validateBlastResult({ ...validPayload, language: lang });
      expect(result.valid).toBe(true);
    }
  });
});

describe('calculatePersonalBests', () => {
  it('should set all bests from first game', () => {
    const result = calculatePersonalBests(null, {
      score: 100,
      clearPercentage: 50,
      maxCombo: 3,
      wordsFound: 5,
    });
    expect(result.bestScore).toBe(100);
    expect(result.bestClearPercentage).toBe(50);
    expect(result.bestMaxCombo).toBe(3);
    expect(result.totalGames).toBe(1);
    expect(result.totalWords).toBe(5);
  });

  it('should keep higher existing bests', () => {
    const existing = {
      bestScore: 200,
      bestClearPercentage: 80,
      bestMaxCombo: 5,
      totalGames: 3,
      totalWords: 30,
    };
    const result = calculatePersonalBests(existing, {
      score: 100,
      clearPercentage: 50,
      maxCombo: 3,
      wordsFound: 5,
    });
    expect(result.bestScore).toBe(200);
    expect(result.bestClearPercentage).toBe(80);
    expect(result.bestMaxCombo).toBe(5);
    expect(result.totalGames).toBe(4);
    expect(result.totalWords).toBe(35);
  });

  it('should update bests when new values are higher', () => {
    const existing = {
      bestScore: 100,
      bestClearPercentage: 50,
      bestMaxCombo: 3,
      totalGames: 2,
      totalWords: 10,
    };
    const result = calculatePersonalBests(existing, {
      score: 300,
      clearPercentage: 90,
      maxCombo: 7,
      wordsFound: 8,
    });
    expect(result.bestScore).toBe(300);
    expect(result.bestClearPercentage).toBe(90);
    expect(result.bestMaxCombo).toBe(7);
    expect(result.totalGames).toBe(3);
    expect(result.totalWords).toBe(18);
  });

  it('should always increment totalGames by 1', () => {
    const existing = { bestScore: 0, bestClearPercentage: 0, bestMaxCombo: 0, totalGames: 10, totalWords: 50 };
    const result = calculatePersonalBests(existing, {
      score: 0,
      clearPercentage: 0,
      maxCombo: 0,
      wordsFound: 0,
    });
    expect(result.totalGames).toBe(11);
  });
});
