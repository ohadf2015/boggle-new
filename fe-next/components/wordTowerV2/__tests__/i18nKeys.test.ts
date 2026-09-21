import { describe, expect, it } from 'vitest';
import { en } from '@/translations/en.js';
import { es } from '@/translations/es.js';
import { he } from '@/translations/he.js';
import { ja } from '@/translations/ja.js';
import { ru } from '@/translations/ru.js';
import { sv } from '@/translations/sv.js';
import { ACHIEVEMENTS } from '@/lib/wordTowerV2/achievements';
import { BIOMES } from '@/lib/wordTowerV2/biomes';
import { CALLOUT_VARIANTS } from '@/lib/wordTowerV2/celebrations';
import { REWARDS } from '@/lib/wordTowerV2/rewards';
import { DISTRICTS, MAX_DISTRICT, PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';
import { buildingNameKey } from '../estate/estateArt';

/**
 * Word Tower v2 builds most of its keys dynamically (`call.perfect.${i}`,
 * `ach.${id}.name`, `biome.${id}`), which the static translation scanner cannot
 * see. Every key the code can emit must resolve in every locale.
 */
const LOCALES = { en, es, he, ja, ru, sv } as Record<string, Record<string, unknown>>;

function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

const keys: string[] = [
  'wordTowerV2.bestFlag',
  'wordTowerV2.leaveConfirm',
  'wordTowerV2.dailyPlayed',
  'wordTowerV2.recapAlt',
  'wordTowerV2.hud.floor',
  'wordTowerV2.hud.floorA11y',
  'wordTowerV2.hud.effect',
  'wordTowerV2.hud.exit',
  'wordTowerV2.stability.label',
  'wordTowerV2.stability.a11y',
  'wordTowerV2.stability.steady',
  'wordTowerV2.stability.wobbly',
  'wordTowerV2.stability.danger',
  'wordTowerV2.newSky',
  'wordTowerV2.newBest',
  'wordTowerV2.collapsed',
  'wordTowerV2.reward.crate',
  'wordTowerV2.ach.unlocked',
  'wordTowerV2.hint.spell',
  'wordTowerV2.hint.drop',
  'wordTowerV2.changeWord',
  'wordTowerV2.editHint',
  'wordTowerV2.coins.run',
  'wordTowerV2.streak.a11y',
  'wordTowerV2.milestone.floors',
  'wordTowerV2.milestone.a11y',
  ...['tap', 'skip', 'continue', 'guest'].map((k) => `wordTowerV2.chest.${k}`),
  ...['common', 'rare', 'epic'].map((k) => `wordTowerV2.chest.tier.${k}`),
  ...['shield', 'brick', 'blueprint'].map((k) => `wordTowerV2.chest.item.${k}`),
  ...['perfects', 'floors'].map((k) => `wordTowerV2.chest.tease.${k}`),
  ...['floorsA11y', 'combo', 'tenants', 'crates', 'badges', 'nextGoal'].map((k) => `wordTowerV2.results.${k}`),
  ...['double', 'triple', 'quad', 'unstoppable', 'legendary'].map((k) => `wordTowerV2.call.combo.${k}`),
  'wordTowerV2.call.word.big',
  'wordTowerV2.call.word.mega',
  ...Object.entries(CALLOUT_VARIANTS).flatMap(([q, n]) => Array.from({ length: n }, (_, i) => `wordTowerV2.call.${q}.${i}`)),
  ...BIOMES.map((b) => `wordTowerV2.biome.${b.id}`),
  ...REWARDS.flatMap((r) => [`wordTowerV2.reward.${r.id}.name`, `wordTowerV2.reward.${r.id}.desc`]),
  ...ACHIEVEMENTS.flatMap((a) => [`wordTowerV2.ach.${a.id}.name`, `wordTowerV2.ach.${a.id}.desc`]),
  // Empire: every district, every building in it, and both perk phrasings.
  ...DISTRICTS.flatMap((d) => [`wordTowerV2.estate.district.${d.id}`, ...d.buildings.map((b) => `wordTowerV2.estate.building.${b.id}`)]),
  ...PLOT_SLOTS.flatMap((slot) => [`wordTowerV2.estate.perkLine.${slot}`, `wordTowerV2.estate.chip.${slot}`]),
  // The name under a plot follows the art pack, not the catalog.
  ...Array.from({ length: MAX_DISTRICT }, (_, i) => PLOT_SLOTS.map((slot) => buildingNameKey(i + 1, slot))).flat(),
  ...[
    'open', 'title', 'back', 'level', 'maxed', 'upgrade', 'repair', 'free', 'need', 'damaged', 'progress',
    'built', 'repaired', 'guest', 'perksTitle', 'perksNone', 'newsRaids', 'newsAffordable', 'newsDamaged',
    'completeTitle', 'completeSub', 'completeNext', 'completeCta', 'reward',
  ].map((k) => `wordTowerV2.estate.${k}`),
];

describe('Word Tower v2 i18n', () => {
  for (const [lang, dict] of Object.entries(LOCALES)) {
    it(`given ${lang}, when every emitted key is looked up, then each is a non-empty string`, () => {
      const missing = keys.filter((k) => typeof get(dict, k) !== 'string' || !(get(dict, k) as string).trim());
      expect(missing).toEqual([]);
    });

    it(`given ${lang}, when placeholders are read, then they survive translation`, () => {
      for (const k of keys) {
        const want = ((get(en, k) as string).match(/\{\w+\}/g) ?? []).sort();
        expect(((get(dict, k) as string).match(/\{\w+\}/g) ?? []).sort(), `${lang} ${k}`).toEqual(want);
      }
    });
  }
});
