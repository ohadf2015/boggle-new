import { describe, it, expect } from 'vitest';
import {
  wordTouchesCake, decrementCakeHp, isCakeDestroyed, cakeAnchorCells, getCakeHp,
} from '../blastCakeEngine';
import type { BlastTileState } from '@/shared/types/blast';

const cake = (uid: string, row: number, col: number, hp?: number): BlastTileState => ({
  uid: `${uid}-${row}-${col}`, row, col, type: 'cake', isCleared: false,
  activationEffect: null, hitsRemaining: 1, cakeAnchorUid: uid,
  ...(hp !== undefined ? { cakeHp: hp } : {}),
});

const std = (row: number, col: number): BlastTileState => ({
  uid: `s-${row}-${col}`, row, col, type: 'standard', isCleared: false,
  activationEffect: null, hitsRemaining: 1,
});

// 3x3 cake centered with anchor HP=5 at (1,1), surrounded by standards
const grid: BlastTileState[][] = [
  [cake('cake-1', 0, 0), cake('cake-1', 0, 1), cake('cake-1', 0, 2), std(0, 3)],
  [cake('cake-1', 1, 0), { ...cake('cake-1', 1, 1), cakeHp: 5 }, cake('cake-1', 1, 2), std(1, 3)],
  [cake('cake-1', 2, 0), cake('cake-1', 2, 1), cake('cake-1', 2, 2), std(2, 3)],
  [std(3, 0), std(3, 1), std(3, 2), std(3, 3)],
];

describe('blastCakeEngine.wordTouchesCake', () => {
  it('detects word touching cake', () => {
    expect(wordTouchesCake(grid, [{ row: 0, col: 0 }, { row: 0, col: 1 }])).toBe('cake-1');
  });
  it('returns null when word does not touch cake', () => {
    expect(wordTouchesCake(grid, [{ row: 3, col: 0 }, { row: 3, col: 1 }])).toBeNull();
  });
});

describe('blastCakeEngine.decrementCakeHp', () => {
  it('decrements anchor HP by 1 per call', () => {
    const next = decrementCakeHp(grid, 'cake-1');
    expect(getCakeHp(next, 'cake-1')).toBe(4);
  });
  it('clamps at 0', () => {
    let g = grid;
    for (let i = 0; i < 7; i++) g = decrementCakeHp(g, 'cake-1');
    expect(getCakeHp(g, 'cake-1')).toBe(0);
  });
  it('does not mutate input', () => {
    decrementCakeHp(grid, 'cake-1');
    expect(getCakeHp(grid, 'cake-1')).toBe(5);
  });
});

describe('blastCakeEngine.isCakeDestroyed', () => {
  it('false at full HP', () => {
    expect(isCakeDestroyed(grid, 'cake-1')).toBe(false);
  });
  it('true at 0 HP', () => {
    let g = grid;
    for (let i = 0; i < 5; i++) g = decrementCakeHp(g, 'cake-1');
    expect(isCakeDestroyed(g, 'cake-1')).toBe(true);
  });
});

describe('blastCakeEngine.cakeAnchorCells', () => {
  it('returns all 9 cells of cluster', () => {
    expect(cakeAnchorCells(grid, 'cake-1')).toHaveLength(9);
  });
  it('returns empty for unknown uid', () => {
    expect(cakeAnchorCells(grid, 'cake-X')).toHaveLength(0);
  });
});
