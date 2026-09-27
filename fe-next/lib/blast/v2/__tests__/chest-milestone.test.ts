import { describe, it, expect } from 'vitest';
import { rollChest } from '../chest-roll';
import { milestoneForChest, MILESTONE_CHEST_NUMBERS } from '../chest-milestone';

describe('chest milestones', () => {
  it('exposes the milestone numbers in increasing order', () => {
    const sorted = [...MILESTONE_CHEST_NUMBERS].sort((a, b) => a - b);
    expect(MILESTONE_CHEST_NUMBERS).toEqual(sorted);
    expect(MILESTONE_CHEST_NUMBERS.length).toBeGreaterThanOrEqual(3);
  });

  it('milestoneForChest returns the chest number on a milestone', () => {
    for (const n of MILESTONE_CHEST_NUMBERS) {
      expect(milestoneForChest(n)).toBe(n);
    }
  });

  it('milestoneForChest returns null off a milestone', () => {
    expect(milestoneForChest(1)).toBeNull();
    expect(milestoneForChest(2)).toBeNull();
    expect(milestoneForChest(11)).toBeNull();
    expect(milestoneForChest(49)).toBeNull();
  });

  it('rollChest stamps milestone on a milestone chest', () => {
    const c = rollChest('user-1', 10, 'en');
    expect(c.milestone).toBe(10);
  });

  it('rollChest leaves milestone null on a non-milestone chest', () => {
    const c = rollChest('user-1', 7, 'en');
    expect(c.milestone ?? null).toBeNull();
  });
});
