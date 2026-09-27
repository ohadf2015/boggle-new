import { describe, expect, it } from 'vitest';
import { en } from '@/translations/en.js';
import { es } from '@/translations/es.js';
import { he } from '@/translations/he.js';
import { ja } from '@/translations/ja.js';
import { ru } from '@/translations/ru.js';
import { sv } from '@/translations/sv.js';
import { WORLD_COUNT } from '@/lib/adventure/play/levels';
import { WORLD_CONFIGS } from '@/lib/adventure/worldConfig';
import { RELIC_IDS, POTION_IDS } from '@/lib/adventure/play/relics';
import { KILL_TIERS } from '@/components/adventure/play/stage/killView';

/**
 * Adventure builds most of its keys dynamically (`relic.${id}`, `elite.w${n}`,
 * `combat.kill.${tier}`), which the static translation scanner cannot see.
 * Mirror of components/wordTowerV2/__tests__/i18nKeys.test.ts — 6 locales.
 */
const LOCALES = { en, es, he, ja, ru, sv } as Record<string, Record<string, unknown>>;

function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

const NODE_KINDS = ['fight', 'elite', 'treasure', 'shop', 'rest', 'event', 'boss'] as const;
const LEVEL_KINDS = ['classic', 'hunt', 'chain', 'fog', 'bomb', 'elite', 'boss'] as const;
const LOOT_RARITIES = ['common', 'rare', 'epic'] as const;
const COLLECTION_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
const COLLECTION_CATS = ['trophy', 'scroll', 'rune', 'relic'] as const;
const COMBAT_STATUS = ['hit', 'blocked', 'interrupt', 'phase', 'freeze', 'curse'] as const;
const DEEDS = ['crushed', 'obliterated'] as const;

const keys: string[] = [
  ...RELIC_IDS.flatMap((id) => [`adventurePlay.relic.${id}`, `adventurePlay.relicDesc.${id}`]),
  ...POTION_IDS.flatMap((id) => [`adventurePlay.potion.${id}`, `adventurePlay.potionDesc.${id}`]),
  ...NODE_KINDS.map((k) => `adventurePlay.map.kind.${k}`),
  ...LEVEL_KINDS.map((k) => `adventurePlay.variety.kind.${k}`),
  ...Array.from({ length: WORLD_COUNT }, (_, i) => `adventurePlay.combat.elite.w${i + 1}`),
  ...WORLD_CONFIGS.map((w) => `adventure.worlds.${w.name}`),
  ...LOOT_RARITIES.map((r) => `adventurePlay.loot.rarity.${r}`),
  ...COLLECTION_RARITIES.map((r) => `adventure.collection.rarity.${r}`),
  ...COLLECTION_CATS.map((c) => `adventure.collection.category.${c}`),
  ...COMBAT_STATUS.map((s) => `adventurePlay.combat.status.${s}`),
  ...KILL_TIERS.map((t) => `adventurePlay.combat.kill.${t}`),
  ...DEEDS.map((d) => `adventurePlay.deed.${d}`),
  'adventurePlay.deed.bonusHint',
  'adventurePlay.loot.noRelics',
  'adventurePlay.loot.hearts',
  'adventurePlay.loot.potionsTitle',
  'adventurePlay.loot.kindRelic',
  'adventurePlay.loot.kindPotion',
  'adventurePlay.loot.kindGold',
];

describe('Adventure i18n (dynamic keys)', () => {
  for (const [lang, dict] of Object.entries(LOCALES)) {
    it(`given ${lang}, when every emitted key is looked up, then each is a non-empty string`, () => {
      const missing = keys.filter((k) => typeof get(dict, k) !== 'string' || !(get(dict, k) as string).trim());
      expect(missing).toEqual([]);
    });

    it(`given ${lang}, when placeholders are read, then they survive translation`, () => {
      for (const k of keys) {
        const enVal = get(en, k);
        if (typeof enVal !== 'string') continue;
        const want = (enVal.match(/\{\w+\}/g) ?? []).sort();
        const got = get(dict, k);
        if (typeof got !== 'string') continue;
        expect((got.match(/\{\w+\}/g) ?? []).sort(), `${lang} ${k}`).toEqual(want);
      }
    });
  }
});
