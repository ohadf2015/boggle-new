/**
 * Tests for M4: Drill → Profile XP pipeline
 * Verifies the XP calculation formula: baseXP = 10 + floor(score/50), capped at 50.
 */

describe('Drill XP calculation', () => {
  function calculateDrillXp(score: number): number {
    const baseXp = 10 + Math.floor(score / 50);
    return Math.min(baseXp, 50);
  }

  it('awards 10 XP for zero score', () => {
    expect(calculateDrillXp(0)).toBe(10);
  });

  it('awards 14 XP for score of 200', () => {
    expect(calculateDrillXp(200)).toBe(14); // 10 + floor(200/50) = 14
  });

  it('awards 30 XP for score of 1000', () => {
    expect(calculateDrillXp(1000)).toBe(30); // 10 + 20 = 30
  });

  it('caps at 50 XP for score of 2000', () => {
    expect(calculateDrillXp(2000)).toBe(50); // 10 + 40 = 50
  });

  it('caps at 50 XP for score of 5000', () => {
    expect(calculateDrillXp(5000)).toBe(50); // 10 + 100 = 110, capped at 50
  });

  it('awards 11 XP for score of 50', () => {
    expect(calculateDrillXp(50)).toBe(11); // 10 + 1
  });

  it('awards 10 XP for score of 49 (floor rounds down)', () => {
    expect(calculateDrillXp(49)).toBe(10); // 10 + 0
  });
});
