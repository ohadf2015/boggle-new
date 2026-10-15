import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

const LOCALES = { en, he, sv, ja, es, ru } as Record<string, Record<string, unknown>>;
const KEYS = [
  'economy.chest.headline.common',
  'economy.chest.headline.rare',
  'economy.chest.headline.epic',
  'economy.chest.chip.label',
  'economy.chest.chip.cash',
  'economy.chest.chip.xp',
  'economy.chest.chip.item',
  'economy.chest.continue',
  'economy.goal.save.hintReveal',
  'economy.goal.save.doubleCash',
  'economy.goal.save.streakShield',
];

function resolve(bundle: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((node, k) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[k] : undefined), bundle);
}

describe('chest and shop-goal copy', () => {
  it.each(Object.keys(LOCALES))('Given %s, Then every chest key resolves to real text', (lang) => {
    for (const key of KEYS) {
      const value = resolve(LOCALES[lang], key);
      expect(typeof value, `${lang} ${key}`).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  it.each(Object.keys(LOCALES))('Given %s, Then each goal line says how much cash is missing, with no bare power-up name', (lang) => {
    for (const id of ['hintReveal', 'doubleCash', 'streakShield']) {
      const save = resolve(LOCALES[lang], `economy.goal.save.${id}`) as string;
      expect(save, `${lang} ${id}`).toContain('{missing}');
      expect(save).not.toContain('{name}');
    }
  });

  it('Given English, Then the chest button says Collect', () => {
    expect(resolve(en, 'economy.chest.continue')).toBe('Collect');
  });
});
