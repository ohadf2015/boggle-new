/**
 * crosswordMpManager — parallel-race state: all players solve the SAME puzzle;
 * the server tracks each player's completion % + solve time and ranks them.
 * Pure logic, no IO.
 */
import { describe, it, expect } from 'vitest';
import {
  initCrosswordMpState,
  applyProgress,
  standings,
  allSolved,
} from '../crosswordMpManager';

const PUZZLE = { id: 'en-mini-001', locale: 'en', size: 5, cells: [], slots: [] };

describe('crosswordMpManager', () => {
  it('initializes zeroed progress for each player + holds the shared puzzle', () => {
    const s = initCrosswordMpState(['a', 'b'], PUZZLE, 1000);
    expect(s.puzzle).toBe(PUZZLE);
    expect(s.progress.a).toEqual({ percent: 0, solved: false, elapsedMs: 0, score: 0 });
    expect(s.progress.b.solved).toBe(false);
  });

  it('applies a progress update for a player', () => {
    let s = initCrosswordMpState(['a', 'b'], PUZZLE, 1000);
    s = applyProgress(s, 'a', { percent: 40, solved: false, elapsedMs: 12000, score: 0 });
    expect(s.progress.a.percent).toBe(40);
    expect(s.progress.b.percent).toBe(0);
  });

  it('clamps percent to 0..100', () => {
    let s = initCrosswordMpState(['a'], PUZZLE, 1000);
    s = applyProgress(s, 'a', { percent: 150, solved: false, elapsedMs: 1, score: 0 });
    expect(s.progress.a.percent).toBe(100);
  });

  it('keeps a solved player solved even if a later update says otherwise', () => {
    let s = initCrosswordMpState(['a'], PUZZLE, 1000);
    s = applyProgress(s, 'a', { percent: 100, solved: true, elapsedMs: 30000, score: 50 });
    s = applyProgress(s, 'a', { percent: 90, solved: false, elapsedMs: 31000, score: 0 });
    expect(s.progress.a.solved).toBe(true);
    expect(s.progress.a.percent).toBe(100);
    expect(s.progress.a.score).toBe(50);
  });

  it('ignores updates for unknown players', () => {
    let s = initCrosswordMpState(['a'], PUZZLE, 1000);
    s = applyProgress(s, 'ghost', { percent: 50, solved: false, elapsedMs: 1, score: 0 });
    expect(s.progress.ghost).toBeUndefined();
  });

  it('ranks solved-first, then by percent, then by faster time', () => {
    let s = initCrosswordMpState(['a', 'b', 'c'], PUZZLE, 1000);
    s = applyProgress(s, 'a', { percent: 100, solved: true, elapsedMs: 40000, score: 30 });
    s = applyProgress(s, 'b', { percent: 100, solved: true, elapsedMs: 25000, score: 60 });
    s = applyProgress(s, 'c', { percent: 60, solved: false, elapsedMs: 50000, score: 0 });
    const ranked = standings(s);
    expect(ranked.map((r) => r.username)).toEqual(['b', 'a', 'c']); // b faster solve, a solved, c unsolved
    expect(ranked[0].rank).toBe(1);
  });

  it('allSolved is true only when every active player solved', () => {
    let s = initCrosswordMpState(['a', 'b'], PUZZLE, 1000);
    s = applyProgress(s, 'a', { percent: 100, solved: true, elapsedMs: 1, score: 1 });
    expect(allSolved(s, ['a', 'b'])).toBe(false);
    s = applyProgress(s, 'b', { percent: 100, solved: true, elapsedMs: 1, score: 1 });
    expect(allSolved(s, ['a', 'b'])).toBe(true);
  });
});
