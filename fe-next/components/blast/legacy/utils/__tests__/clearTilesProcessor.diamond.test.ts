import { describe, it, expect } from 'vitest';
import { processTilesForWord } from '../clearTilesProcessor';
import { createSeededRandom } from '../blastLetterGenerator';
import { type BlastTileState, DIAMOND_CLEAR_BONUS, DIAMOND_WORD_MULTIPLIER } from '../../types';

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
    expect(result.diamondsSpawned).toEqual([{ row: diamonds[0].row, col: diamonds[0].col, gem: diamonds[0].gem }]);
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

  it('a sapphire in the word doubles it, pays its bonus and blasts a small plus around itself', () => {
    const prev = makeGrid(6);
    prev[0][1].type = 'diamond';
    const result = run('cat', prev);
    expect(result.diamondsCollected).toBe(1);
    // Reach 1: up is off the board, left/right are the word's own tiles, so only the tile below goes.
    expect(result.gemCrossCount).toBe(1);
    expect(result.newlyClearedCount).toBe(4);
    expect(result.next[1][1].isCleared).toBe(true);
    expect(result.next[2][1].isCleared).toBe(false);
    expect(result.next[0][3].isCleared).toBe(false);
    const bonus = result.totalScore - 10 * DIAMOND_WORD_MULTIPLIER;
    expect(bonus).toBeGreaterThan(1);
    expect(bonus).toBeLessThan(DIAMOND_CLEAR_BONUS * 2 + 12);
  });

  it('an amethyst reaches two tiles out', () => {
    const prev = makeGrid(6);
    prev[0][1].type = 'diamond';
    prev[0][1].gem = 'amethyst';
    const result = run('cat', prev);
    expect(result.next[1][1].isCleared).toBe(true);
    expect(result.next[2][1].isCleared).toBe(true);
    expect(result.next[3][1].isCleared).toBe(false);
    expect(result.next[0][3].isCleared).toBe(true);
    expect(result.next[0][4].isCleared).toBe(false);
  });

  it('only a ruby blasts its whole row and column', () => {
    const prev = makeGrid(6);
    prev[0][1].type = 'diamond';
    prev[0][1].gem = 'ruby';
    const result = run('cat', prev);
    expect(result.gemCrossCount).toBe(5 + 3);
    for (let r = 0; r < 6; r++) expect(result.next[r][1].isCleared).toBe(true);
    for (let c = 0; c < 6; c++) expect(result.next[0][c].isCleared).toBe(true);
  });

  it('a bomb caught in a gem blast still detonates in full', () => {
    const prev = makeGrid(6);
    prev[0][1].type = 'diamond';
    prev[1][1].type = 'bomb';
    const result = run('cat', prev);
    for (const [r, c] of [[2, 0], [2, 1], [2, 2], [1, 0], [1, 2]]) expect(result.next[r][c].isCleared).toBe(true);
  });

  it('a diamond swept up by a bomb pays its bonus but does not cross-blast', () => {
    const prev = makeGrid(6);
    prev[0][0].type = 'bomb';
    prev[1][1].type = 'diamond';
    const result = run('cat', prev);
    expect(result.diamondsCollected).toBe(1);
    expect(result.gemCrossCount).toBe(0);
    expect(result.next[5][1].isCleared).toBe(false);
  });

  it('counts zero diamonds collected when none is on the path', () => {
    expect(run('cat').diamondsCollected).toBe(0);
  });
});
