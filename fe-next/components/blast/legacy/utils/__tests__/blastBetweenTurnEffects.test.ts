import { describe, it, expect } from 'vitest';
import { applyBetweenTurnEffects } from '../blastBetweenTurnEffects';
import {
  type BlastTileState,
  COUNTDOWN_EXPLOSION_PENALTY,
  CRYSTAL_MAX_MULTIPLIER,
  FUSE_INITIAL_TIMER,
  FUSE_EXPLOSION_PENALTY,
} from '../../types';

/** Helper to create a minimal tile */
function makeTile(row: number, col: number, type: BlastTileState['type'] = 'standard', overrides: Partial<BlastTileState> = {}): BlastTileState {
  return {
    uid: `tile-${row}-${col}`,
    row, col, type,
    isCleared: false,
    hitsRemaining: 0,
    activationEffect: null,
    ...overrides,
  };
}

/** Create an NxN grid of standard tiles */
function makeGrid(size: number): BlastTileState[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => makeTile(r, c)),
  );
}

describe('applyBetweenTurnEffects', () => {
  describe('countdown tick', () => {
    it('decrements countdown on uncleared countdown tiles', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'countdown', { countdown: 3 });

      const result = applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].countdown).toBe(2);
      expect(result.penalty).toBe(0);
      expect(result.countdownExplosions).toHaveLength(0);
    });

    it('explodes countdown tile when it reaches 0', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'countdown', { countdown: 1 });

      const result = applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].isCleared).toBe(true);
      expect(result.penalty).toBe(COUNTDOWN_EXPLOSION_PENALTY);
      expect(result.countdownExplosions).toEqual([{ row: 1, col: 1 }]);
    });

    it('clears adjacent tiles on countdown explosion', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'countdown', { countdown: 1 });

      applyBetweenTurnEffects(grid, 3);

      // All 8 neighbors should be cleared
      expect(grid[0][0].isCleared).toBe(true);
      expect(grid[0][1].isCleared).toBe(true);
      expect(grid[0][2].isCleared).toBe(true);
      expect(grid[1][0].isCleared).toBe(true);
      expect(grid[1][2].isCleared).toBe(true);
      expect(grid[2][0].isCleared).toBe(true);
      expect(grid[2][1].isCleared).toBe(true);
      expect(grid[2][2].isCleared).toBe(true);
    });

    it('damages multi-hit tiles instead of clearing them', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'countdown', { countdown: 1 });
      grid[0][0] = makeTile(0, 0, 'ice', { hitsRemaining: 2 });

      applyBetweenTurnEffects(grid, 3);

      expect(grid[0][0].isCleared).toBe(false);
      expect(grid[0][0].hitsRemaining).toBe(1);
    });

    it('does not tick cleared countdown tiles', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'countdown', { countdown: 2, isCleared: true });

      applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].countdown).toBe(2); // unchanged
    });
  });

  describe('crystal growth', () => {
    it('increments crystalMultiplier by 1 on an unused crystal each turn', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'crystal', { crystalMultiplier: 1 });

      applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].crystalMultiplier).toBe(2);
    });

    it(`caps crystalMultiplier at CRYSTAL_MAX_MULTIPLIER (${CRYSTAL_MAX_MULTIPLIER})`, () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'crystal', { crystalMultiplier: CRYSTAL_MAX_MULTIPLIER });

      applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].crystalMultiplier).toBe(CRYSTAL_MAX_MULTIPLIER);
    });

    it('does not grow cleared crystals', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'crystal', { crystalMultiplier: 2, isCleared: true });

      applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].crystalMultiplier).toBe(2);
    });

    it('initializes missing crystalMultiplier to 2 on first tick', () => {
      const grid = makeGrid(3);
      // Simulate a crystal spawned without an explicit multiplier — treat as 1, grows to 2
      grid[1][1] = makeTile(1, 1, 'crystal');

      applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].crystalMultiplier).toBe(2);
    });
  });

  describe('fuse tick and detonation', () => {
    it('does not tick fuse tiles that are unlit (fuseTimer undefined)', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'fuse', { fuseGroupId: 'g1' });

      const result = applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].fuseTimer).toBeUndefined();
      expect(result.fuseExplosions).toHaveLength(0);
    });

    it('decrements fuseTimer on lit fuses', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'fuse', { fuseGroupId: 'g1', fuseTimer: 3 });

      applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].fuseTimer).toBe(2);
    });

    it('detonates a lit fuse when fuseTimer reaches 0', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'fuse', { fuseGroupId: 'g1', fuseTimer: 1 });

      const result = applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].isCleared).toBe(true);
      expect(result.penalty).toBe(FUSE_EXPLOSION_PENALTY);
      expect(result.fuseExplosions).toEqual([{ row: 1, col: 1 }]);
    });

    it('clears 8 adjacent tiles on fuse detonation (bomb-style blast)', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'fuse', { fuseGroupId: 'g1', fuseTimer: 1 });

      applyBetweenTurnEffects(grid, 3);

      expect(grid[0][0].isCleared).toBe(true);
      expect(grid[0][1].isCleared).toBe(true);
      expect(grid[2][2].isCleared).toBe(true);
    });

    it('does not tick cleared fuses', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'fuse', { fuseGroupId: 'g1', fuseTimer: 2, isCleared: true });

      applyBetweenTurnEffects(grid, 3);

      expect(grid[1][1].fuseTimer).toBe(2);
    });

    it('exposes FUSE_INITIAL_TIMER constant (used by partner-lighting path)', () => {
      expect(FUSE_INITIAL_TIMER).toBeGreaterThan(0);
    });
  });
});
