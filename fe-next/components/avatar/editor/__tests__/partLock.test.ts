import { describe, it, expect } from 'vitest';
import { getPartLockInfo, sortPartsForGrid, type LockPremium } from '../partLock';
import { getUnlockLevel, isPartUsable } from '@/lib/avatar/unlocks';

function premiumAt(level: number, coins = 1000, owned: string[] = []): LockPremium {
  return {
    isPartUnlocked: (c, v) => isPartUsable(c, v, { ownedKeys: owned, level }),
    coins,
    level,
  };
}

describe('getPartLockInfo — why a part is locked and how to get it', () => {
  it('a free part is never locked', () => {
    const info = getPartLockInfo('accessory', 'glasses', premiumAt(1));
    expect(info).toMatchObject({ locked: false, path: 'free', rarity: 'common', price: 0 });
  });

  it('a level-ladder part below your level shows "Lv N" with levels to go', () => {
    // headphones unlock at level 2 on the ladder
    expect(getUnlockLevel('accessory', 'headphones')).toBe(2);
    const info = getPartLockInfo('accessory', 'headphones', premiumAt(1));
    expect(info.locked).toBe(true);
    expect(info.path).toBe('level');
    expect(info.unlockLevel).toBe(2);
    expect(info.levelsToGo).toBe(1);
    expect(info.rarity).not.toBe('common');
    expect(info.price).toBeGreaterThan(0); // gold is still an option
  });

  it('the same ladder part is owned once you reach its level', () => {
    const info = getPartLockInfo('accessory', 'headphones', premiumAt(2));
    expect(info).toMatchObject({ locked: false, path: 'owned' });
  });

  it('a gold-only legendary part shows its price and whether you can afford it', () => {
    const poor = getPartLockInfo('accessory', 'crystalCrown', premiumAt(50, 100));
    expect(poor).toMatchObject({ locked: true, path: 'gold', rarity: 'legendary', price: 12000, affordable: false, unlockLevel: null });
    expect(poor.goldShort).toBe(11900);
    const rich = getPartLockInfo('accessory', 'crystalCrown', premiumAt(1, 20000));
    expect(rich.affordable).toBe(true);
    expect(rich.goldShort).toBe(0);
  });

  it('a bought part is owned regardless of level', () => {
    const info = getPartLockInfo('accessory', 'crystalCrown', premiumAt(1, 0, ['accessory:crystalCrown']));
    expect(info).toMatchObject({ locked: false, path: 'owned' });
  });

  it('without a premium context (onboarding) premium parts are locked, free parts are free', () => {
    expect(getPartLockInfo('accessory', 'crystalCrown', null).locked).toBe(true);
    expect(getPartLockInfo('accessory', 'glasses', null).locked).toBe(false);
  });

  it('unknown player level → levelsToGo is null (no false promise)', () => {
    const p = premiumAt(1);
    const info = getPartLockInfo('accessory', 'headphones', { ...p, level: undefined });
    expect(info.levelsToGo).toBeNull();
  });

  it('none is always free', () => {
    expect(getPartLockInfo('accessory', 'none', premiumAt(1)).locked).toBe(false);
  });
});

describe('sortPartsForGrid — usable first, then the nearest unlock', () => {
  it('orders none, usable, level-locked by level, then gold by price', () => {
    const p = premiumAt(1, 0);
    const out = sortPartsForGrid('accessory', ['crystalCrown', 'cowboyHat', 'glasses', 'headphones', 'none', 'crown'], p);
    expect(out[0]).toBe('none');
    expect(out[1]).toBe('glasses');
    // ladder: headphones L2 before cowboyHat L5
    expect(out.indexOf('headphones')).toBeLessThan(out.indexOf('cowboyHat'));
    // level-locked before gold-only
    expect(out.indexOf('cowboyHat')).toBeLessThan(out.indexOf('crown'));
    // cheaper gold before pricier legendary
    expect(out.indexOf('crown')).toBeLessThan(out.indexOf('crystalCrown'));
  });

  it('is stable for equal keys (keeps catalog order among free parts)', () => {
    const out = sortPartsForGrid('accessory', ['none', 'glasses', 'sunglasses', 'cap'], premiumAt(1));
    expect(out).toEqual(['none', 'glasses', 'sunglasses', 'cap']);
  });
});
