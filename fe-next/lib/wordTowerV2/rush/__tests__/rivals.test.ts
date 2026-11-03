import { describe, expect, it } from 'vitest';
import { scoreFromHeightM } from '../../scoring';
import { crossedRivals, pickRivals, scoreToHeightM } from '../rivals';

const entry = (id: string, peakM: number) => ({ id, name: id.toUpperCase(), score: scoreFromHeightM(peakM) });

describe('scoreToHeightM', () => {
  it('inverts scoreFromHeightM', () => {
    for (const m of [0, 1, 7.5, 42, 260]) {
      expect(scoreToHeightM(scoreFromHeightM(m))).toBeCloseTo(m, 2);
    }
  });
});

describe('pickRivals', () => {
  const board = [
    entry('a', 5),
    entry('b', 12),
    entry('c', 20),
    entry('d', 25),
    entry('e', 31),
    entry('f', 40),
    entry('g', 80),
  ];

  it('picks the closest rivals above plus one below, sorted ascending', () => {
    const rivals = pickRivals(board, 15);
    expect(rivals.map((r) => r.id)).toEqual(['b', 'c', 'd', 'e']);
    expect(rivals[0]).toEqual({ id: 'b', name: 'B', peakM: 12 });
  });

  it('respects max', () => {
    expect(pickRivals(board, 15, 2).map((r) => r.id)).toEqual(['b', 'c']);
  });

  it('fills with rivals above when nobody is below', () => {
    expect(pickRivals(board, 0).map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('shows only the closest below when everyone is beaten', () => {
    expect(pickRivals(board, 100).map((r) => r.id)).toEqual(['g']);
  });

  it('dedupes by id and ignores non-positive scores', () => {
    const rivals = pickRivals(
      [entry('a', 20), entry('a', 20), { id: 'z', name: 'Z', score: 0 }, { id: 'n', name: 'N', score: -50 }],
      10,
    );
    expect(rivals.map((r) => r.id)).toEqual(['a']);
  });

  it('returns nothing for an empty board', () => {
    expect(pickRivals([], 10)).toEqual([]);
  });
});

describe('crossedRivals', () => {
  const rivals = [
    { id: 'a', name: 'A', peakM: 10 },
    { id: 'b', name: 'B', peakM: 20 },
    { id: 'c', name: 'C', peakM: 30 },
  ];

  it('returns rivals strictly above prev and at or below next', () => {
    expect(crossedRivals(10, 20, rivals).map((r) => r.id)).toEqual(['b']);
    expect(crossedRivals(5, 35, rivals).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns nothing when the peak does not rise', () => {
    expect(crossedRivals(25, 25, rivals)).toEqual([]);
    expect(crossedRivals(25, 15, rivals)).toEqual([]);
  });
});
