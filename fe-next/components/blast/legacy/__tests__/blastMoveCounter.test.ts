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
  it('the warm-up wave gives extra moves to learn the ropes', () => {
    expect(getWaveConfig(1).movesAllowed).toBe(14);
  });

  it('a boss wave cuts moves below the wave before it', () => {
    expect(getWaveConfig(5).movesAllowed).toBeLessThan(getWaveConfig(4).movesAllowed);
    expect(getWaveConfig(10).movesAllowed).toBeLessThan(getWaveConfig(9).movesAllowed);
  });

  it('never drops below 4 moves', () => {
    for (let wave = 1; wave <= 30; wave++) expect(getWaveConfig(wave).movesAllowed).toBeGreaterThanOrEqual(4);
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
