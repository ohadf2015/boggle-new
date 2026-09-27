import { describe, it, expect } from 'vitest';
import { processTilesForWord } from '../clearTilesProcessor';
import { type BlastTileState, CRYSTAL_MAX_MULTIPLIER } from '../../types';

/** Build an NxN grid of standard tiles (no specials, no multi-hit). */
function makeGrid(size: number): BlastTileState[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      uid: `t-${r}-${c}`,
      row: r,
      col: c,
      type: 'standard' as const,
      isCleared: false,
      hitsRemaining: 0,
      activationEffect: null,
    })),
  );
}

describe('processTilesForWord — crystal tile', () => {
  it('multiplies word score by the crystal multiplier when a crystal is in the path', () => {
    // Given: 3x3 grid with a crystal at (0,1) with multiplier 4
    const prev = makeGrid(3);
    prev[0][1].type = 'crystal';
    prev[0][1].crystalMultiplier = 4;

    // When: word "CAT" traverses (0,0)->(0,1)->(0,2), base score 10
    const result = processTilesForWord({
      prev,
      path: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      word: 'CAT',
      baseScore: 10,
      gridSize: 3,
      currentWave: 1,
    });

    // Then: totalScore reflects ×4 on the base (no other multipliers active)
    expect(result.totalScore).toBe(40);
  });

  it('treats crystal with multiplier 1 as no score change', () => {
    const prev = makeGrid(3);
    prev[0][1].type = 'crystal';
    prev[0][1].crystalMultiplier = 1;

    const result = processTilesForWord({
      prev,
      path: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      word: 'CAT',
      baseScore: 10,
      gridSize: 3,
      currentWave: 1,
    });

    expect(result.totalScore).toBe(10);
  });

  it('stacks multiple crystals multiplicatively', () => {
    const prev = makeGrid(3);
    prev[0][0].type = 'crystal';
    prev[0][0].crystalMultiplier = 2;
    prev[0][2].type = 'crystal';
    prev[0][2].crystalMultiplier = 3;

    const result = processTilesForWord({
      prev,
      path: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      word: 'CAT',
      baseScore: 10,
      gridSize: 3,
      currentWave: 1,
    });

    // 10 * 2 * 3 = 60
    expect(result.totalScore).toBe(60);
  });

  it('clears the crystal tile when it is used', () => {
    const prev = makeGrid(3);
    prev[0][1].type = 'crystal';
    prev[0][1].crystalMultiplier = CRYSTAL_MAX_MULTIPLIER;

    const result = processTilesForWord({
      prev,
      path: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      word: 'CAT',
      baseScore: 10,
      gridSize: 3,
      currentWave: 1,
    });

    expect(result.next[0][1].isCleared).toBe(true);
  });

  it('does nothing when a crystal is on the board but not in the path', () => {
    const prev = makeGrid(3);
    prev[2][2].type = 'crystal';
    prev[2][2].crystalMultiplier = 5;

    const result = processTilesForWord({
      prev,
      path: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      word: 'CAT',
      baseScore: 10,
      gridSize: 3,
      currentWave: 1,
    });

    expect(result.totalScore).toBe(10);
    expect(result.next[2][2].isCleared).toBe(false);
  });
});
