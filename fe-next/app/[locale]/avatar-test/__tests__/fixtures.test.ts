import { describe, it, expect } from 'vitest';
import {
  parseAvatarLabParams,
  buildFixturePremium,
  fixtureConfigForLevel,
  AVATAR_LAB_VIEWS,
  FIXTURE_PLAYER_ID,
} from '../fixtures';
import { LEVEL_UNLOCK_LADDER, isPartUsable } from '@/lib/avatar/unlocks';
import { isValidCustomAvatar } from '@/shared/types/customAvatar';

describe('avatar-test harness params', () => {
  it('defaults to the grid at level 1', () => {
    expect(parseAvatarLabParams({})).toEqual({ level: 1, view: 'grid' });
  });

  it('reads ?level and ?view', () => {
    expect(parseAvatarLabParams({ level: '7', view: 'editor' })).toEqual({ level: 7, view: 'editor' });
    for (const v of AVATAR_LAB_VIEWS) expect(parseAvatarLabParams({ view: v }).view).toBe(v);
  });

  it('clamps level to 1..50 and ignores junk', () => {
    expect(parseAvatarLabParams({ level: '0' }).level).toBe(1);
    expect(parseAvatarLabParams({ level: '99' }).level).toBe(50);
    expect(parseAvatarLabParams({ level: 'abc' }).level).toBe(1);
    expect(parseAvatarLabParams({ level: ['12', '30'] }).level).toBe(12);
    expect(parseAvatarLabParams({ view: 'nope' }).view).toBe('grid');
  });
});

describe('fixture premium — same predicate as the real hook', () => {
  it('locks and unlocks exactly like isPartUsable at that level', () => {
    for (const level of [1, 2, 6, 10, 40]) {
      const premium = buildFixturePremium(level);
      for (const u of LEVEL_UNLOCK_LADDER) {
        expect(premium.isPartUnlocked(u.category, u.partId)).toBe(
          isPartUsable(u.category, u.partId, { ownedKeys: [], level }),
        );
      }
      expect(premium.isPartUnlocked('accessory', 'crystalCrown')).toBe(false);
      expect(premium.isPartUnlocked('eyes', 'round')).toBe(true);
    }
  });

  it('never actually spends gold', async () => {
    const premium = buildFixturePremium(3);
    await expect(premium.purchaseWithGold('eyes', 'laser')).resolves.toBe(false);
  });
});

describe('fixture avatar', () => {
  it('is a valid config that wears its newest level unlocks', () => {
    const lvl1 = fixtureConfigForLevel(1);
    const lvl40 = fixtureConfigForLevel(40);
    expect(isValidCustomAvatar(lvl1)).toBe(true);
    expect(isValidCustomAvatar(lvl40)).toBe(true);
    expect(lvl40).not.toEqual(lvl1);
    expect(FIXTURE_PLAYER_ID).toMatch(/^[a-f0-9-]{36}$/);
  });
});
