import { describe, it, expect } from 'vitest';
import { applyBetweenTurnEffects, spreadVirus } from '../blastTileEffects';
import { type BlastTileState, COUNTDOWN_EXPLOSION_PENALTY } from '../../types';

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

  describe('virus spread', () => {
    it('infects one adjacent standard tile per virus', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'virus');

      const result = applyBetweenTurnEffects(grid, 3);

      expect(result.virusInfections.length).toBeGreaterThanOrEqual(1);
      const infected = result.virusInfections[0];
      expect(grid[infected.row][infected.col].type).toBe('virus');
    });

    it('does not infect non-standard tiles', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'virus');
      // Surround with non-standard tiles
      grid[0][1] = makeTile(0, 1, 'gold');
      grid[2][1] = makeTile(2, 1, 'bomb');
      grid[1][0] = makeTile(1, 0, 'ice', { hitsRemaining: 2 });
      grid[1][2] = makeTile(1, 2, 'rainbow');

      const result = applyBetweenTurnEffects(grid, 3);

      expect(result.virusInfections).toHaveLength(0);
    });

    it('does not spread from cleared virus tiles', () => {
      const grid = makeGrid(3);
      grid[1][1] = makeTile(1, 1, 'virus', { isCleared: true });

      const result = applyBetweenTurnEffects(grid, 3);

      expect(result.virusInfections).toHaveLength(0);
    });
  });

  describe('combined effects', () => {
    it('applies both countdown tick and virus spread in one call', () => {
      const grid = makeGrid(4);
      grid[0][0] = makeTile(0, 0, 'countdown', { countdown: 2 });
      grid[3][3] = makeTile(3, 3, 'virus');

      const result = applyBetweenTurnEffects(grid, 4);

      expect(grid[0][0].countdown).toBe(1); // ticked
      expect(result.virusInfections.length).toBeGreaterThanOrEqual(1); // spread
      expect(result.penalty).toBe(0); // no explosion yet
    });
  });
});

describe('spreadVirus', () => {
  it('returns empty array when no virus tiles exist', () => {
    const grid = makeGrid(3);
    const infections = spreadVirus(grid, 3);
    expect(infections).toHaveLength(0);
  });

  it('sets activationEffect on infected tile', () => {
    const grid = makeGrid(3);
    grid[1][1] = makeTile(1, 1, 'virus');

    const infections = spreadVirus(grid, 3);

    if (infections.length > 0) {
      const { row, col } = infections[0];
      expect(grid[row][col].activationEffect).toBe('virus-spread');
    }
  });
});
