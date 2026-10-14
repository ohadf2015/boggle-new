import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

const LOCALES: Record<string, Record<string, unknown>> = { en, he, sv, ja, es, ru };

const KEYS = ['prompt', 'praiseShort', 'praiseMid', 'praiseLong', 'boardLabel', 'longWord', 'usesTry'];

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

    it(`${locale} praise tiers read differently from each other`, () => {
      const tiers = ['praiseShort', 'praiseMid', 'praiseLong'].map((k) => resolve(bundle, `wordHunt.survival.stage.${k}`));
      expect(new Set(tiers).size).toBe(3);
    });
  }
});
