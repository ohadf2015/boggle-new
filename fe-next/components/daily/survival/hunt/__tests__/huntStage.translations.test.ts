import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

const LOCALES: Record<string, Record<string, unknown>> = { en, he, sv, ja, es, ru };

const KEYS = ['prompt', 'praiseShort', 'praiseMid', 'praiseLong', 'boardLabel', 'longWord', 'lucky', 'combo'];

function resolve(bundle: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], bundle);
}

describe('word hunt stage copy', () => {
  for (const [locale, bundle] of Object.entries(LOCALES)) {
    it(`${locale} has every stage string`, () => {
      for (const k of KEYS) {
        const value = resolve(bundle, `wordHunt.survival.stage.${k}`);
        expect(typeof value, `${locale} wordHunt.survival.stage.${k}`).toBe('string');
        expect((value as string).trim().length).toBeGreaterThan(0);
      }
    });

    it(`${locale} keeps the {bonus} placeholder in the long-word sticker`, () => {
      expect(resolve(bundle, 'wordHunt.survival.stage.longWord')).toContain('{bonus}');
    });

    it(`${locale} offers several cheers per praise tier so found words don't all read the same`, () => {
      for (const k of ['praiseShort', 'praiseMid', 'praiseLong']) {
        const pool = resolve(bundle, `wordHunt.survival.stage.${k}`) as string;
        expect(pool.split('|').filter((s) => s.trim()).length, `${locale} ${k}`).toBeGreaterThanOrEqual(3);
      }
    });

    it(`${locale} keeps the {bonus} and {count} placeholders in the lucky and combo stickers`, () => {
      expect(resolve(bundle, 'wordHunt.survival.stage.lucky')).toContain('{bonus}');
      expect(resolve(bundle, 'wordHunt.survival.stage.combo')).toContain('{count}');
    });

    it(`${locale} praise tiers read differently from each other`, () => {
      const tiers = ['praiseShort', 'praiseMid', 'praiseLong'].map((k) => resolve(bundle, `wordHunt.survival.stage.${k}`));
      expect(new Set(tiers).size).toBe(3);
    });
  }
});
