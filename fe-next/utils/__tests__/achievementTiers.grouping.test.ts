import { describe, it, expect } from 'vitest';
import { groupAchievementsByTier, type AchievementGroupItem } from '../achievementTiers';

describe('groupAchievementsByTier', () => {
  const item = (key: string, count: number, locked = false): AchievementGroupItem => ({ key, count, locked });

  it('orders groups rarest-first then locked last', () => {
    const groups = groupAchievementsByTier([
      item('a', 1),    // bronze
      item('b', 20),   // silver (>=15)
      item('c', 80),   // gold (>=75)
      item('d', 350),  // platinum (>=300)
      item('z', 0, true), // locked
    ]);
    expect(groups.map((g) => g.tier)).toEqual(['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'locked']);
  });

  it('omits empty groups', () => {
    const groups = groupAchievementsByTier([item('a', 1), item('b', 2)]);
    expect(groups.map((g) => g.tier)).toEqual(['BRONZE']);
    expect(groups[0].items).toHaveLength(2);
  });

  it('routes locked items (regardless of count) to the locked group', () => {
    const groups = groupAchievementsByTier([item('a', 5), item('z', 0, true)]);
    const locked = groups.find((g) => g.tier === 'locked');
    expect(locked?.items.map((i) => i.key)).toEqual(['z']);
  });

  it('preserves input order within a group', () => {
    const groups = groupAchievementsByTier([item('a', 1), item('b', 1), item('c', 1)]);
    expect(groups[0].items.map((i) => i.key)).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for empty input', () => {
    expect(groupAchievementsByTier([])).toEqual([]);
  });
});
