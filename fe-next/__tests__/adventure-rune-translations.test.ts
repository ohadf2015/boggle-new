/**
 * Regression: ensure adventure.runes contains the canonical 12-rune catalog
 * with name + desc keys for every language. Prevents duplicate "runes" blocks
 * (legacy 6-rune naming) from clobbering the catalog block.
 */
import { RUNE_CATALOG } from '../lib/adventure/runeCatalog';

const RUNE_IDS = RUNE_CATALOG.map(r => r.id);
const REQUIRED_TOP_KEYS = [
  'title', 'forge', 'equip', 'unequip', 'fragment', 'fragmentEarned',
  'notEnoughFragments', 'slotsFull', 'unknown',
] as const;
const REQUIRED_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;

describe('adventure.runes translations', () => {
  it.each(['en', 'he', 'es', 'ja', 'sv'])(
    '%s defines name+desc for every catalog rune and required UI keys',
    async (lang) => {
      const mod: Record<string, Record<string, unknown>> = await import(`../translations/${lang}.js`);
      const t = mod[lang] as { adventure?: { runes?: Record<string, unknown> } };
      const runes = t?.adventure?.runes;
      expect(runes).toBeDefined();

      for (const id of RUNE_IDS) {
        const entry = (runes as Record<string, { name?: string; desc?: string }>)[id];
        expect(entry).toBeDefined();
        expect(entry?.name).toBeTruthy();
        expect(entry?.desc).toBeTruthy();
      }

      for (const k of REQUIRED_TOP_KEYS) {
        expect((runes as Record<string, unknown>)[k]).toBeTruthy();
      }

      const rarity = (runes as Record<string, Record<string, string>>).rarity;
      expect(rarity).toBeDefined();
      for (const r of REQUIRED_RARITIES) {
        expect(rarity[r]).toBeTruthy();
      }
    },
  );
});
