import { calculateWordScore, KB_BONUS_MULT } from '../scoring';

describe('scoring kb-bonus', () => {
  it('exports KB_BONUS_MULT === 1.1', () => {
    expect(KB_BONUS_MULT).toBeCloseTo(1.1);
  });

  it('applies +10% multiplier when inputMethod=kb', () => {
    const dragScore = calculateWordScore('CAT', 0, 1, 1, { inputMethod: 'drag' });
    const kbScore = calculateWordScore('CAT', 0, 1, 1, { inputMethod: 'kb' });
    expect(kbScore).toBe(Math.round(dragScore * KB_BONUS_MULT));
  });

  it('treats undefined inputMethod as drag (no bonus)', () => {
    const noneScore = calculateWordScore('CAT', 0, 1, 1);
    const dragScore = calculateWordScore('CAT', 0, 1, 1, { inputMethod: 'drag' });
    expect(noneScore).toBe(dragScore);
  });

  it('treats unknown inputMethod as drag (no bonus)', () => {
    const weirdScore = calculateWordScore('CAT', 0, 1, 1, { inputMethod: 'gamepad' as any });
    const dragScore = calculateWordScore('CAT', 0, 1, 1, { inputMethod: 'drag' });
    expect(weirdScore).toBe(dragScore);
  });

  it('returns finite positive number for kb input', () => {
    const score = calculateWordScore('CAT', 0, 1, 1, { inputMethod: 'kb' });
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });

  it('stacks on top of all other multipliers', () => {
    // Base: CAT = 10 pts
    // With combo(3) = 10 + floor(3*0.2) = 10 + 0 = 10
    // With fire(2) = 10 * 2 = 20
    // With rarity(1.5) = 20 * 1.5 = 30
    // With KB bonus = 30 * 1.1 = 33
    const score = calculateWordScore('CAT', 3, 2, 1.5, { inputMethod: 'kb' });
    expect(score).toBe(Math.round(30 * KB_BONUS_MULT));
    expect(score).toBe(33);
  });

  it('preserves drag behavior when explicitly set', () => {
    // HELLO (5 letters) = 50 base
    // combo(5) = floor(5 * 1.0) = 5
    // (50 + 5) * 2 * 1 = 110
    const combo5Fire2 = calculateWordScore('HELLO', 5, 2, 1, { inputMethod: 'drag' });
    expect(combo5Fire2).toBe(110);
  });

  it('applies kb bonus after rarity multiplier', () => {
    // HELLO (5 letters) = 50 base
    // combo(5) = 50 + floor(5*1.0) = 50 + 5 = 55
    // fire(1) = 55 * 1 = 55
    // rarity(1.3) = 55 * 1.3 = 71.5 → 71 (floor)
    // kb bonus(1.1) = 71 * 1.1 = 78.1 → 78 (round)
    const dragScore = calculateWordScore('HELLO', 5, 1, 1.3, { inputMethod: 'drag' });
    const kbScore = calculateWordScore('HELLO', 5, 1, 1.3, { inputMethod: 'kb' });
    expect(dragScore).toBe(71);
    expect(kbScore).toBe(Math.round(dragScore * KB_BONUS_MULT));
    expect(kbScore).toBe(78);
  });
});
