import { describe, expect, it } from 'vitest';
import {
  CHEST_DROP_ODDS,
  CHEST_DROP_SOURCES,
  CHEST_POOL,
  DUPLICATE_COINS,
  isChestPartDrop,
  rollChestPart,
  rollChestRarity,
} from '../chestDrops';
import { getPartRarity } from '../rarity';
import { getCatalogPart } from '../catalog';

describe('chest drop odds', () => {
  it('every chest has whole-percent odds that sum to 100', () => {
    for (const source of CHEST_DROP_SOURCES) {
      const o = CHEST_DROP_ODDS[source];
      expect(o.rare + o.epic + o.legendary).toBe(100);
    }
  });

  it('bigger chests are luckier', () => {
    const order = ['day_clear', 'day_perfect', 'weekly_bronze', 'weekly_silver', 'weekly_gold'] as const;
    for (let i = 1; i < order.length; i++) {
      expect(CHEST_DROP_ODDS[order[i]].legendary).toBeGreaterThan(CHEST_DROP_ODDS[order[i - 1]].legendary);
    }
  });

  it('the roll matches the published odds over many chests', () => {
    for (const source of CHEST_DROP_SOURCES) {
      const n = 20000;
      const seen = { rare: 0, epic: 0, legendary: 0 };
      for (let i = 0; i < n; i++) seen[rollChestRarity(source, `player-${i}|2026-11-0${i % 9}`)] += 1;
      for (const r of ['rare', 'epic', 'legendary'] as const) {
        expect(Math.abs((seen[r] / n) * 100 - CHEST_DROP_ODDS[source][r])).toBeLessThan(1.5);
      }
    }
  });
});

describe('chest pool', () => {
  it('has parts of every rarity and none that are common', () => {
    for (const rarity of ['rare', 'epic', 'legendary'] as const) {
      expect(CHEST_POOL[rarity].length).toBeGreaterThan(rarity === 'legendary' ? 4 : 15);
      for (const key of CHEST_POOL[rarity]) {
        const [cat, id] = key.split(':');
        expect(getPartRarity(cat, id)).toBe(rarity);
      }
    }
  });

  it('keeps celebrity-lookalike cues and facial hair out', () => {
    const all = [...CHEST_POOL.rare, ...CHEST_POOL.epic, ...CHEST_POOL.legendary];
    expect(all).not.toContain('hair:trumpSwoop');
    expect(all).not.toContain('accessory:microphone');
    expect(all.some(k => k.startsWith('facialHair:') || k.startsWith('eyebrows:'))).toBe(false);
  });

  it('only holds parts the picker offers (drawn, not hidden)', () => {
    for (const key of [...CHEST_POOL.rare, ...CHEST_POOL.epic, ...CHEST_POOL.legendary]) {
      const [cat, id] = key.split(':');
      if (cat === 'bgColor') continue;
      const part = getCatalogPart(cat, id);
      expect(part, key).toBeDefined();
      expect(part?.isHidden, key).toBe(false);
    }
  });

  it('includes the new chest-only legendaries', () => {
    expect(CHEST_POOL.legendary).toEqual(expect.arrayContaining([
      'eyes:supernova', 'hair:aurora', 'accessory:dragonWings', 'accessory:flameAura',
    ]));
  });
});

describe('rollChestPart', () => {
  const base = { source: 'weekly_gold' as const, ownedKeys: [] as string[], level: 1 };

  it('is the same for the same seed (retry-safe)', () => {
    const a = rollChestPart({ ...base, seed: 'p1|2026-11-02' });
    const b = rollChestPart({ ...base, seed: 'p1|2026-11-02' });
    expect(a).toEqual(b);
    expect(isChestPartDrop(a)).toBe(true);
  });

  it('gives a part the player does not have yet', () => {
    for (let i = 0; i < 200; i++) {
      const owned = CHEST_POOL.rare.slice(0, CHEST_POOL.rare.length - 1);
      const drop = rollChestPart({ source: 'day_clear', seed: `s${i}`, ownedKeys: owned, level: 1 });
      expect(drop.duplicate).toBe(false);
      expect(owned).not.toContain(drop.key);
    }
  });

  it('pays coins instead when every part of that rarity is already owned', () => {
    const owned = [...CHEST_POOL.rare, ...CHEST_POOL.epic, ...CHEST_POOL.legendary];
    const drop = rollChestPart({ ...base, seed: 'full', ownedKeys: owned });
    expect(drop.duplicate).toBe(true);
    expect(drop.refundCoins).toBe(DUPLICATE_COINS[drop.rarity]);
  });

  it('counts level-unlocked parts as already had', () => {
    // At level 99 every ladder part is usable, so none of them can drop as new.
    for (let i = 0; i < 300; i++) {
      const drop = rollChestPart({ source: 'day_clear', seed: `lv${i}`, ownedKeys: [], level: 99 });
      expect(['accessory:headphones', 'eyes:kawaii', 'hair:cottonCandy']).not.toContain(drop.key);
    }
  });
});
