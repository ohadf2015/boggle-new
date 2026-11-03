import { describe, expect, it } from 'vitest';
import { createTraitQueue } from '../traits';
import type { BlockTrait } from '../types';

function drain(n: number, seed: number, goldWeightMul?: () => number): BlockTrait[] {
  const queue = createTraitQueue(seed, goldWeightMul ? { goldWeightMul } : undefined);
  return Array.from({ length: n }, () => queue.take());
}

const golds = (traits: BlockTrait[]) => traits.filter((t) => t === 'gold').length;

describe('createTraitQueue goldWeightMul', () => {
  it('given a 1x getter, when drained, then the sequence matches the default queue', () => {
    expect(drain(300, 42, () => 1)).toEqual(drain(300, 42));
  });

  it('given a 2x getter, when drained over many seeds, then gold shows up clearly more often', () => {
    let base = 0;
    let boosted = 0;
    for (let seed = 1; seed <= 40; seed++) {
      base += golds(drain(200, seed));
      boosted += golds(drain(200, seed, () => 2));
    }
    expect(boosted).toBeGreaterThan(base * 1.4);
  });

  it('given a 2x getter, when drained, then gold still appears at most once in any 4 blocks', () => {
    const traits = drain(2000, 7, () => 2);
    for (let i = 0; i + 4 <= traits.length; i++) expect(golds(traits.slice(i, i + 4))).toBeLessThanOrEqual(1);
  });

  it('given the multiplier changes mid-run, when blocks are dealt, then already-dealt ones keep their trait', () => {
    let mul = 1;
    const queue = createTraitQueue(9, { goldWeightMul: () => mul });
    const shown = queue.peek(3).map((s) => s.trait);
    mul = 3;
    expect([queue.take(), queue.take(), queue.take()]).toEqual(shown);
  });
});
