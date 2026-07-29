import { describe, it, expect } from 'vitest';
import { processTilesForWord } from '../clearTilesProcessor';
import { type BlastTileState, ANCHOR_LENGTH_BONUS } from '../../types';

/** Build an NxN grid of standard tiles. */
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

describe('processTilesForWord — anchor tile', () => {
  it('awards ANCHOR_LENGTH_BONUS × word.length as bonus when anchor is in the path', () => {
    // Given: 4x4 grid with an anchor at (0,1)
    const prev = makeGrid(4);
    prev[0][1].type = 'anchor';

    // When: word "CATS" (length 4) traverses row 0
    const result = processTilesForWord({
      prev,
      path: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ],
      word: 'CATS',
      baseScore: 10,
      gridSize: 4,
      currentWave: 1,
    });

    // Then: totalScore = baseScore (10) + ANCHOR_LENGTH_BONUS * 4
    expect(result.totalScore).toBe(10 + ANCHOR_LENGTH_BONUS * 4);
  });

  it('clears the anchor tile when it is used in a word', () => {
    const prev = makeGrid(3);
    prev[0][1].type = 'anchor';

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

  it('does nothing when anchor exists but is not in path', () => {
    const prev = makeGrid(3);
    prev[2][2].type = 'anchor';

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

  it('stacks additively when multiple anchors are in the path', () => {
    const prev = makeGrid(3);
    prev[0][0].type = 'anchor';
    prev[0][2].type = 'anchor';

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

    // 2 anchors × (ANCHOR_LENGTH_BONUS × 3) added to baseScore 10
    expect(result.totalScore).toBe(10 + 2 * ANCHOR_LENGTH_BONUS * 3);
  });
});
