import { describe, it, expect } from 'vitest';
import {
  LEVEL_UNLOCK_LADDER,
  getLevelUnlocks,
  getUnlockLevel,
  getNewUnlocksBetween,
  getCollectionProgress,
  isPartUsable,
  normalizeLevel,
  partKey,
  COLLECTIBLE_PART_KEYS,
} from '../unlocks';
import {
  isPremiumPart,
  isLegendaryPart,
  HIDDEN_PARTS,
  FEMALE_HAIR_STYLES,
  MALE_HAIR_STYLES,
  getPartPrice,
} from '@/shared/types/customAvatar';

const PICKABLE_CATEGORIES = new Set(['base', 'hair', 'eyes', 'mouth', 'accessory', 'bgColor']);

describe('level unlock ladder — table invariants', () => {
  it('only grants existing premium (VIP/epic) parts, never legendary', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      expect(isPremiumPart(u.category, u.partId), partKey(u.category, u.partId)).toBe(true);
      expect(isLegendaryPart(u.category, u.partId), partKey(u.category, u.partId)).toBe(false);
      expect(u.rarity === 'rare' || u.rarity === 'epic').toBe(true);
    }
  });

  it('never grants a hidden part or a part nobody can pick in the builder', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      const hidden = (HIDDEN_PARTS as Record<string, readonly string[]>)[u.category] ?? [];
      expect(hidden.includes(u.partId), u.partId).toBe(false);
      // eyebrows have no picker tab, facialHair is male-only → invisible to half the players
      expect(PICKABLE_CATEGORIES.has(u.category), u.category).toBe(true);
      if (u.category === 'hair') {
        // must be visible to BOTH genders or the unlock is a no-show for some players
        expect((FEMALE_HAIR_STYLES as readonly string[]).includes(u.partId), u.partId).toBe(true);
        expect((MALE_HAIR_STYLES as readonly string[]).includes(u.partId), u.partId).toBe(true);
      }
    }
  });

  it('lists each part once and is sorted by level', () => {
    const keys = LEVEL_UNLOCK_LADDER.map(u => partKey(u.category, u.partId));
    expect(new Set(keys).size).toBe(keys.length);
    const levels = LEVEL_UNLOCK_LADDER.map(u => u.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });

  it('is dense early: at least one unlock at EVERY level 2..10, none at level 1', () => {
    const levels = new Set(LEVEL_UNLOCK_LADDER.map(u => u.level));
    expect(levels.has(1)).toBe(false);
    for (let l = 2; l <= 10; l++) expect(levels.has(l), `level ${l}`).toBe(true);
  });

  it('after level 10 unlocks land every 3-5 levels up to ~40', () => {
    const late = [...new Set(LEVEL_UNLOCK_LADDER.map(u => u.level))].filter(l => l >= 10).sort((a, b) => a - b);
    for (let i = 1; i < late.length; i++) {
      const gap = late[i] - late[i - 1];
      expect(gap, `${late[i - 1]}→${late[i]}`).toBeGreaterThanOrEqual(3);
      expect(gap, `${late[i - 1]}→${late[i]}`).toBeLessThanOrEqual(5);
    }
    const top = late[late.length - 1];
    expect(top).toBeGreaterThanOrEqual(36);
    expect(top).toBeLessThanOrEqual(45);
  });

  it('gets rarer as levels climb: first unlock is rare, the top is epic', () => {
    expect(LEVEL_UNLOCK_LADDER[0].rarity).toBe('rare');
    expect(LEVEL_UNLOCK_LADDER[LEVEL_UNLOCK_LADDER.length - 1].rarity).toBe('epic');
    // an epic within reach of the p90 player (level 7)
    expect(LEVEL_UNLOCK_LADDER.some(u => u.rarity === 'epic' && u.level <= 7)).toBe(true);
  });

  it('leaves the gold path unchanged (prices untouched)', () => {
    expect(getPartPrice('eyes', 'laser')).toBe(500);
    expect(getPartPrice('accessory', 'crystalCrown')).toBe(12000);
  });
});

describe('normalizeLevel', () => {
  it('treats guest / unknown / garbage as level 1', () => {
    expect(normalizeLevel(undefined)).toBe(1);
    expect(normalizeLevel(null)).toBe(1);
    expect(normalizeLevel(Number.NaN)).toBe(1);
    expect(normalizeLevel(0)).toBe(1);
    expect(normalizeLevel(-4)).toBe(1);
    expect(normalizeLevel('7')).toBe(7);
    expect(normalizeLevel(7.9)).toBe(7);
  });
});

describe('getLevelUnlocks / getUnlockLevel', () => {
  it('level 1 unlocks nothing', () => {
    expect(getLevelUnlocks(1).size).toBe(0);
  });

  it('is cumulative', () => {
    const at5 = getLevelUnlocks(5);
    const at10 = getLevelUnlocks(10);
    for (const k of at5) expect(at10.has(k)).toBe(true);
    expect(at10.size).toBeGreaterThan(at5.size);
    expect(getLevelUnlocks(999).size).toBe(LEVEL_UNLOCK_LADDER.length);
  });

  it('reports the unlock level of a ladder part, null otherwise', () => {
    const first = LEVEL_UNLOCK_LADDER[0];
    expect(getUnlockLevel(first.category, first.partId)).toBe(first.level);
    expect(getLevelUnlocks(first.level).has(partKey(first.category, first.partId))).toBe(true);
    expect(getLevelUnlocks(first.level - 1).has(partKey(first.category, first.partId))).toBe(false);
    expect(getUnlockLevel('eyes', 'round')).toBeNull(); // free
    expect(getUnlockLevel('accessory', 'crystalCrown')).toBeNull(); // legendary = gold only
  });
});

describe('getNewUnlocksBetween', () => {
  it('returns parts with prevLevel < level <= newLevel, ordered by level', () => {
    const got = getNewUnlocksBetween(1, 4);
    expect(got.length).toBeGreaterThan(0);
    for (const u of got) {
      expect(u.level).toBeGreaterThan(1);
      expect(u.level).toBeLessThanOrEqual(4);
      expect(u).toEqual(expect.objectContaining({ category: expect.any(String), partId: expect.any(String), rarity: expect.any(String) }));
    }
    const levels = got.map(u => u.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });

  it('is empty when the level did not go up', () => {
    expect(getNewUnlocksBetween(5, 5)).toEqual([]);
    expect(getNewUnlocksBetween(6, 3)).toEqual([]);
  });

  it('first level-up (1→2) always reveals something', () => {
    expect(getNewUnlocksBetween(1, 2).length).toBeGreaterThan(0);
  });
});

describe('isPartUsable — free OR owned OR level-unlocked', () => {
  const ladderPart = LEVEL_UNLOCK_LADDER[0];

  it('free parts are always usable', () => {
    expect(isPartUsable('eyes', 'round', { ownedKeys: [], level: 1 })).toBe(true);
  });

  it('premium parts need ownership or level', () => {
    expect(isPartUsable('eyes', 'laser', { ownedKeys: [], level: 1 })).toBe(
      getUnlockLevel('eyes', 'laser') === null ? false : 1 >= (getUnlockLevel('eyes', 'laser') as number),
    );
    expect(isPartUsable('eyes', 'laser', { ownedKeys: ['eyes:laser'], level: 1 })).toBe(true);
    expect(isPartUsable(ladderPart.category, ladderPart.partId, { ownedKeys: [], level: ladderPart.level - 1 })).toBe(false);
    expect(isPartUsable(ladderPart.category, ladderPart.partId, { ownedKeys: [], level: ladderPart.level })).toBe(true);
  });

  it('legendary stays gold-only at any level', () => {
    expect(isPartUsable('accessory', 'crystalCrown', { ownedKeys: [], level: 50 })).toBe(false);
    expect(isPartUsable('accessory', 'crystalCrown', { ownedKeys: ['accessory:crystalCrown'], level: 1 })).toBe(true);
  });
});

describe('getCollectionProgress', () => {
  it('counts owned + level-unlocked collectible parts, split by rarity', () => {
    const none = getCollectionProgress([], 1);
    expect(none.owned).toBe(0);
    expect(none.total).toBe(COLLECTIBLE_PART_KEYS.length);
    expect(none.byRarity.rare.total + none.byRarity.epic.total + none.byRarity.legendary.total).toBe(none.total);

    const lvl10 = getCollectionProgress([], 10);
    expect(lvl10.owned).toBe([...getLevelUnlocks(10)].length);

    // bought + level-granted overlap is not double counted; junk keys ignored
    const first = LEVEL_UNLOCK_LADDER[0];
    const k = partKey(first.category, first.partId);
    const mixed = getCollectionProgress([k, 'accessory:crystalCrown', 'eyes:notARealPart'], first.level);
    expect(mixed.owned).toBe(getLevelUnlocks(first.level).size + 1);
    expect(mixed.byRarity.legendary.owned).toBe(1);
  });

  it('every ladder part is collectible', () => {
    for (const u of LEVEL_UNLOCK_LADDER) expect(COLLECTIBLE_PART_KEYS).toContain(partKey(u.category, u.partId));
  });

  it('excludes hidden and unpickable premium parts from the total', () => {
    expect(COLLECTIBLE_PART_KEYS).not.toContain('mouth:pipe');
    expect(COLLECTIBLE_PART_KEYS).not.toContain('eyebrows:arched');
    // 2026-09 redraw: galaxy hair is now drawn and in both gender pickers, so it
    // counts; neon is retired (hidden) AND in neither picker.
    expect(COLLECTIBLE_PART_KEYS).not.toContain('hair:neon');
    expect(COLLECTIBLE_PART_KEYS).toContain('hair:galaxy');
  });
});

describe('retired parts a player bought (2026-09 redraw)', () => {
  // The three retired keys actually owned in prod (premium_avatar_parts, 2026-09-23).
  const OWNED = ['base:shield', 'accessory:ninjaScarf', 'facialHair:fuManchu'];

  it('owning a retired part makes its replacement usable (no re-buying what you paid for)', () => {
    expect(isPartUsable('accessory', 'samurai', { ownedKeys: OWNED, level: 1 })).toBe(true);
    expect(isPartUsable('base', 'robotHead', { ownedKeys: OWNED, level: 1 })).toBe(true);
    expect(isPartUsable('facialHair', 'handlebar', { ownedKeys: OWNED, level: 1 })).toBe(true);
    expect(isPartUsable('accessory', 'samurai', { ownedKeys: new Set(OWNED), level: 1 })).toBe(true);
  });

  it('does not grant unrelated parts', () => {
    expect(isPartUsable('accessory', 'astronaut', { ownedKeys: OWNED, level: 1 })).toBe(false);
  });

  it('counts the replacement in collection progress', () => {
    const before = getCollectionProgress([], 1).owned;
    const after = getCollectionProgress(OWNED, 1).owned;
    expect(after).toBe(before + 3);
  });
});
