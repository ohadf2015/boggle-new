/**
 * blastMoveCounter — Tests for move counter and pressure system.
 * Covers: wave config movesAllowed, move decrement, bonus moves, game over, end-of-level bonus.
 */
import { getWaveConfig } from '../utils/blastWaveConfig';
import {
  BONUS_MOVE_THRESHOLD_SMALL,
  BONUS_MOVE_THRESHOLD_LARGE,
  BONUS_MOVE_SMALL,
  BONUS_MOVE_LARGE,
  LEFTOVER_MOVE_BONUS_POINTS,
  calculateBonusMoves,
  calculateLeftoverMoveBonus,
} from '../utils/blastMoveUtils';

// ==================== Wave Config movesAllowed ====================

describe('WaveConfig movesAllowed', () => {
  it('wave 1 allows 20 moves', () => {
    expect(getWaveConfig(1).movesAllowed).toBe(20);
  });

  it('wave 2 allows 18 moves', () => {
    expect(getWaveConfig(2).movesAllowed).toBe(18);
  });

  it('wave 3 allows 16 moves', () => {
    expect(getWaveConfig(3).movesAllowed).toBe(16);
  });

  it('wave 4 allows 15 moves', () => {
    expect(getWaveConfig(4).movesAllowed).toBe(15);
  });

  it('wave 5 allows 14 moves', () => {
    expect(getWaveConfig(5).movesAllowed).toBe(14);
  });

  it('wave 6+ allows 12 moves', () => {
    expect(getWaveConfig(6).movesAllowed).toBe(12);
  });

  it('wave 10 (beyond 6) still uses 12 moves', () => {
    expect(getWaveConfig(10).movesAllowed).toBe(12);
  });
});

// ==================== Bonus Move Calculation ====================

describe('calculateBonusMoves', () => {
  it('returns 0 for words shorter than threshold', () => {
    expect(calculateBonusMoves(3)).toBe(0);
    expect(calculateBonusMoves(4)).toBe(0);
    expect(calculateBonusMoves(5)).toBe(0);
  });

  it('returns +1 for 6-letter words', () => {
    expect(calculateBonusMoves(6)).toBe(BONUS_MOVE_SMALL);
  });

  it('returns +1 for 7-letter words', () => {
    expect(calculateBonusMoves(7)).toBe(BONUS_MOVE_SMALL);
  });

  it('returns +2 for 8-letter words', () => {
    expect(calculateBonusMoves(8)).toBe(BONUS_MOVE_LARGE);
  });

  it('returns +2 for words longer than 8 letters', () => {
    expect(calculateBonusMoves(9)).toBe(BONUS_MOVE_LARGE);
    expect(calculateBonusMoves(12)).toBe(BONUS_MOVE_LARGE);
  });

  it('has correct threshold constants', () => {
    expect(BONUS_MOVE_THRESHOLD_SMALL).toBe(6);
    expect(BONUS_MOVE_THRESHOLD_LARGE).toBe(8);
    expect(BONUS_MOVE_SMALL).toBe(1);
    expect(BONUS_MOVE_LARGE).toBe(2);
  });
});

// ==================== Leftover Move Bonus ====================

describe('calculateLeftoverMoveBonus', () => {
  it('returns 0 when no moves remaining', () => {
    expect(calculateLeftoverMoveBonus(0)).toBe(0);
  });

  it('returns 5 points per remaining move', () => {
    expect(calculateLeftoverMoveBonus(1)).toBe(LEFTOVER_MOVE_BONUS_POINTS);
    expect(calculateLeftoverMoveBonus(3)).toBe(3 * LEFTOVER_MOVE_BONUS_POINTS);
    expect(calculateLeftoverMoveBonus(10)).toBe(10 * LEFTOVER_MOVE_BONUS_POINTS);
  });

  it('has correct bonus constant', () => {
    expect(LEFTOVER_MOVE_BONUS_POINTS).toBe(5);
  });

  it('handles negative moves gracefully (returns 0)', () => {
    expect(calculateLeftoverMoveBonus(-1)).toBe(0);
  });
});
