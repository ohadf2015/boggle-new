import { describe, expect, it } from 'vitest';
import { createTraitQueue } from '../traits';
import type { BlockTrait } from '../types';

function drain(seed: number, n: number): BlockTrait[] {
  const queue = createTraitQueue(seed);
  return Array.from({ length: n }, () => queue.take());
}

describe('createTraitQueue', () => {
  it('peek shows upcoming traits without consuming them', () => {
    const queue = createTraitQueue(3);
    const first = queue.peek(3).map((s) => s.trait);
    expect(queue.peek(3).map((s) => s.trait)).toEqual(first);
    expect(queue.take()).toBe(first[0]);
    expect(queue.peek(2).map((s) => s.trait)).toEqual(first.slice(1));
  });

  it('seals only the 3rd visible slot', () => {
    const slots = createTraitQueue(5).peek(3);
    expect(slots.map((s) => s.sealed)).toEqual([false, false, true]);
  });

  it('revealSealed unseals the 3rd slot and keeps it unsealed as it advances', () => {
    const queue = createTraitQueue(5);
    const third = queue.peek(3)[2].trait;
    queue.revealSealed();
    expect(queue.peek(3)[2]).toEqual({ trait: third, sealed: false });
    queue.take();
    const slots = queue.peek(3);
    expect(slots[1]).toEqual({ trait: third, sealed: false });
    expect(slots[2].sealed).toBe(true);
  });

  it('is deterministic per seed', () => {
    expect(drain(99, 200)).toEqual(drain(99, 200));
  });

  it('differs across seeds', () => {
    expect(drain(1, 50)).not.toEqual(drain(2, 50));
  });

  it('never deals 6 plain blocks in a row', () => {
    for (let seed = 0; seed < 100; seed++) {
      let streak = 0;
      for (const trait of drain(seed, 300)) {
        streak = trait === 'plain' ? streak + 1 : 0;
        expect(streak).toBeLessThanOrEqual(5);
      }
    }
  });

  it('never deals more than 1 gold in any window of 4', () => {
    for (let seed = 0; seed < 100; seed++) {
      const traits = drain(seed, 300);
      for (let i = 0; i + 4 <= traits.length; i++) {
        expect(traits.slice(i, i + 4).filter((t) => t === 'gold').length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('deals every trait over a long run', () => {
    const seen = new Set(drain(11, 500));
    for (const trait of ['plain', 'gold', 'feather', 'anvil', 'magnet', 'lucky'] as const) {
      expect(seen).toContain(trait);
    }
  });
});
