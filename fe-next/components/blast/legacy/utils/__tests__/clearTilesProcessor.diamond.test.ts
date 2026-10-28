import { describe, it, expect } from 'vitest';
import { processTilesForWord } from '../clearTilesProcessor';
import { createSeededRandom } from '../blastLetterGenerator';
import { type BlastTileState, DIAMOND_CLEAR_BONUS } from '../../types';

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

const rowPath = (row: number, len: number) => Array.from({ length: len }, (_, col) => ({ row, col }));

function diamondCells(next: BlastTileState[][]) {
  return next.flat().filter(t => t.type === 'diamond' && !t.isCleared);
}

function run(word: string, prev = makeGrid(6), path = rowPath(0, word.length), seed = 7) {
  return processTilesForWord({
    prev, path, word, baseScore: 10, gridSize: 6, currentWave: 1, rng: createSeededRandom(seed),
  });
}

describe('processTilesForWord — earned diamonds', () => {
  it('spawns no diamond for a common word', () => {
    const result = run('cat');
    expect(diamondCells(result.next)).toHaveLength(0);
    expect(result.diamondsSpawned).toEqual([]);
  });

  it('spawns one diamond for a rare word, off the word path, on a live standard tile', () => {
    const result = run('jumpy');
    const diamonds = diamondCells(result.next);
    expect(diamonds).toHaveLength(1);
    expect(diamonds[0].row === 0 && diamonds[0].col < 5).toBe(false);
    expect(result.diamondsSpawned).toEqual([{ row: diamonds[0].row, col: diamonds[0].col }]);
  });

  it('spawns two diamonds for an epic word', () => {
    const result = run('quartz');
    expect(diamondCells(result.next)).toHaveLength(2);
  });

  it('places spawned diamonds deterministically for a given seed', () => {
    const a = run('quartz', makeGrid(6), rowPath(0, 6), 42).diamondsSpawned;
    const b = run('quartz', makeGrid(6), rowPath(0, 6), 42).diamondsSpawned;
    expect(a).toEqual(b);
  });

  it('never lets a bomb in the same word swallow the diamond it just earned', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const prev = makeGrid(6);
      prev[0][2].type = 'bomb';
      const result = run('quartz', prev, rowPath(0, 6), seed);
      expect(diamondCells(result.next)).toHaveLength(2);
    }
  });

  it('skips spawning when no standard tile is left', () => {
    const prev = makeGrid(6);
    for (const row of prev) for (const t of row) if (t.row > 0) t.type = 'gold';
    const result = run('quartz', prev);
    expect(result.diamondsSpawned).toEqual([]);
  });

  it('awards DIAMOND_CLEAR_BONUS and counts the diamond when one is cleared', () => {
    const plain = run('cat');
    const prev = makeGrid(6);
    prev[0][1].type = 'diamond';
    const result = run('cat', prev);
    expect(result.diamondsCollected).toBe(1);
    expect(result.totalScore).toBe(plain.totalScore + DIAMOND_CLEAR_BONUS);
  });

  it('counts zero diamonds collected when none is on the path', () => {
    expect(run('cat').diamondsCollected).toBe(0);
  });
});
