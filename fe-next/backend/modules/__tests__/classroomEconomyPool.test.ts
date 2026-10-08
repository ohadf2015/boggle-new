import { describe, it, expect } from 'vitest';
import { chestPartPool, chestPartUnlock, CHEST_PART_TIER } from '../classroomEconomyPool';
import { getPartRarity } from '@/lib/avatar/rarity';
import { revealPartNameKey } from '@/lib/avatar/revealTrigger';
import { CHEST_RARITIES } from '@/shared/constants/classroomEconomy';
import { en } from '../../../translations/en.js';
import { es } from '../../../translations/es.js';
import { ja } from '../../../translations/ja.js';
import { he } from '../../../translations/he.js';
import { sv } from '../../../translations/sv.js';
import { ru } from '../../../translations/ru.js';

const BUNDLES = { en, es, ja, he, sv, ru };
const UNLOCK_CATEGORIES = ['base', 'hair', 'eyes', 'mouth', 'accessory', 'bgColor'];

function resolve(bundle: Record<string, unknown>, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), bundle);
}

describe('chestPartPool', () => {
  it('Given each chest rarity, Then every pool entry is a category:partId key in a wearable category', () => {
    for (const rarity of CHEST_RARITIES) {
      const pool = chestPartPool(rarity);
      expect(pool.length).toBeGreaterThan(0);
      for (const key of pool) {
        const [category, partId] = key.split(':');
        expect(UNLOCK_CATEGORIES).toContain(category);
        expect(partId).toBeTruthy();
      }
    }
  });

  it('Given each chest rarity, Then every entry carries the tier the chest maps to', () => {
    for (const rarity of CHEST_RARITIES) {
      for (const key of chestPartPool(rarity)) {
        const [category, partId] = key.split(':');
        expect(getPartRarity(category, partId)).toBe(CHEST_PART_TIER[rarity]);
      }
    }
  });

  it('Given the pool, Then no legendary part is ever awarded by a chest', () => {
    for (const rarity of CHEST_RARITIES) {
      for (const key of chestPartPool(rarity)) {
        const [category, partId] = key.split(':');
        expect(getPartRarity(category, partId)).not.toBe('legendary');
      }
    }
  });

  it('Given every pool entry, Then it has a player-facing name in all six locales', () => {
    for (const rarity of CHEST_RARITIES) {
      for (const key of chestPartPool(rarity)) {
        const [category, partId] = key.split(':');
        const nameKey = revealPartNameKey({ category: category as never, partId });
        for (const [locale, bundle] of Object.entries(BUNDLES)) {
          const name = resolve(bundle as unknown as Record<string, unknown>, nameKey);
          expect(typeof name === 'string' && name.length > 0, `${locale} missing ${nameKey}`).toBe(true);
        }
      }
    }
  });
});

describe('chestPartUnlock', () => {
  it('Given a pool key, Then it parses to a wearable unlock with its own rarity', () => {
    const key = chestPartPool('epic')[0];
    const [category, partId] = key.split(':');
    expect(chestPartUnlock(key)).toMatchObject({ category, partId, rarity: getPartRarity(category, partId) });
  });

  it('Given a legacy cosmetic id from an older row, Then it resolves to null', () => {
    expect(chestPartUnlock('tile-neon')).toBeNull();
  });

  it('Given a key outside the wearable categories, Then it resolves to null', () => {
    expect(chestPartUnlock('bodyStyle:slim')).toBeNull();
  });
});
