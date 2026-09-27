/**
 * blastMoveCounter — Tests for move counter and pressure system.
 * Covers: wave config movesAllowed, move decrement, bonus moves, game over, end-of-level bonus.
 */
import { getWaveConfig } from '../utils/blastWaveConfig';
import {
  BONUS_MOVE_THRESHOLD_SMALL,
  BONUS_MOVE_THRESHOLD_MEDIUM,
  BONUS_MOVE_THRESHOLD_LARGE,
  BONUS_MOVE_THRESHOLD_EPIC,
  BONUS_MOVE_SMALL,
  BONUS_MOVE_MEDIUM,
  BONUS_MOVE_LARGE,
  BONUS_MOVE_EPIC,
  LEFTOVER_MOVE_BONUS_POINTS,
  calculateBonusMoves,
  calculateLeftoverMoveBonus,
} from '../utils/blastMoveUtils';

// ==================== Wave Config movesAllowed ====================

describe('WaveConfig movesAllowed', () => {
  it('wave 1 allows 12 moves (learn the ropes)', () => {
    expect(getWaveConfig(1).movesAllowed).toBe(12);
  });

  it('wave 2 allows 10 moves', () => {
    expect(getWaveConfig(2).movesAllowed).toBe(10);
  });

  it('wave 3 allows 9 moves (prism unlock)', () => {
    expect(getWaveConfig(3).movesAllowed).toBe(9);
  });

  it('wave 4 allows 8 moves', () => {
    expect(getWaveConfig(4).movesAllowed).toBe(8);
  });

  it('wave 5 allows 7 moves', () => {
    expect(getWaveConfig(5).movesAllowed).toBe(7);
  });

  it('wave 6 allows 7 moves', () => {
    expect(getWaveConfig(6).movesAllowed).toBe(7);
  });

  it('wave 7 allows 6 moves', () => {
    expect(getWaveConfig(7).movesAllowed).toBe(6);
  });

  it('late waves (10+) reduce moves for difficulty', () => {
    expect(getWaveConfig(10).movesAllowed).toBe(5);
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

  it('returns +2 for 7-letter words', () => {
    expect(calculateBonusMoves(7)).toBe(BONUS_MOVE_MEDIUM);
  });

  it('returns +3 for 8-letter words', () => {
    expect(calculateBonusMoves(8)).toBe(BONUS_MOVE_LARGE);
  });

  it('returns +3 for 9-letter words', () => {
    expect(calculateBonusMoves(9)).toBe(BONUS_MOVE_LARGE);
  });

  it('returns +4 for 10+ letter words', () => {
    expect(calculateBonusMoves(10)).toBe(BONUS_MOVE_EPIC);
    expect(calculateBonusMoves(12)).toBe(BONUS_MOVE_EPIC);
  });

  it('has correct threshold constants', () => {
    expect(BONUS_MOVE_THRESHOLD_SMALL).toBe(6);
    expect(BONUS_MOVE_THRESHOLD_MEDIUM).toBe(7);
    expect(BONUS_MOVE_THRESHOLD_LARGE).toBe(8);
    expect(BONUS_MOVE_THRESHOLD_EPIC).toBe(10);
    expect(BONUS_MOVE_SMALL).toBe(1);
    expect(BONUS_MOVE_MEDIUM).toBe(2);
    expect(BONUS_MOVE_LARGE).toBe(3);
    expect(BONUS_MOVE_EPIC).toBe(4);
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
