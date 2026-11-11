import { describe, it, expect } from 'vitest';
import { getXpForLevel } from '@/backend/modules/xpManager';
import { LEVEL_UNLOCK_LADDER } from '@/lib/avatar/unlocks';
import { buildNextUnlockTeaser, getUpcomingUnlocks } from '../nextUnlockModel';

describe('nextUnlockModel', () => {
  it('points at the first ladder rung above the level with progress toward it', () => {
    // Given a player halfway between their level floor and the next unlock
    const next = LEVEL_UNLOCK_LADDER.find(u => u.level > 3)!;
    const from = getXpForLevel(3);
    const to = getXpForLevel(next.level);
    const teaser = buildNextUnlockTeaser(from + Math.round((to - from) / 2));
    // Then it names the unlock level and ~50% progress
    expect(teaser?.level).toBe(3);
    expect(teaser?.next.level).toBe(next.level);
    expect(teaser?.pct).toBeGreaterThan(45);
    expect(teaser?.pct).toBeLessThan(55);
    expect(teaser?.xpToGo).toBe(to - (from + Math.round((to - from) / 2)));
  });

  it('a later known level wins over stale profile XP', () => {
    const teaser = buildNextUnlockTeaser(0, 9);
    expect(teaser?.level).toBe(9);
    expect(teaser!.next.level).toBeGreaterThan(9);
  });

  it('returns null past the top of the ladder', () => {
    expect(buildNextUnlockTeaser(getXpForLevel(99))).toBeNull();
  });

  it('lists the next three unlocks in order', () => {
    const list = getUpcomingUnlocks(1, 3);
    expect(list).toHaveLength(3);
    expect(list[0].level).toBeLessThanOrEqual(list[1].level);
  });
});
