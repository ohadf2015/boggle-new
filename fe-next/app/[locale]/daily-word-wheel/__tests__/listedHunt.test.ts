import { describe, it, expect } from 'vitest';
import { listedHuntProgress, toListedHuntTargets } from '../listedHunt';

describe('listedHuntProgress', () => {
  const targets = ['BEAD', 'FACE', 'CAFE', 'IDEA', 'CADGE'];

  it('starts at 0/N with 4–9 length buckets', () => {
    const progress = listedHuntProgress(targets, []);
    expect(progress.found).toBe(0);
    expect(progress.total).toBe(5);
    expect(progress.buckets).toEqual([
      { length: 4, found: 0, total: 4 },
      { length: 5, found: 0, total: 1 },
      { length: 6, found: 0, total: 0 },
      { length: 7, found: 0, total: 0 },
      { length: 8, found: 0, total: 0 },
      { length: 9, found: 0, total: 0 },
    ]);
  });

  it('counts a found listed word in 0/N and its length bucket', () => {
    const progress = listedHuntProgress(targets, ['FACE']);
    expect(progress.found).toBe(1);
    expect(progress.total).toBe(5);
    expect(progress.buckets[0]).toEqual({ length: 4, found: 1, total: 4 });
  });
});

describe('toListedHuntTargets', () => {
  it('keeps 4–9 letter words that use the centre letter and the tile multiset', () => {
    const targets = toListedHuntTargets(
      ['CAB', 'FACE', 'ZZZZ', 'FACADE', 'BEAD'],
      'A',
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
    );
    expect(targets).toEqual(['FACE', 'BEAD']);
  });
});
