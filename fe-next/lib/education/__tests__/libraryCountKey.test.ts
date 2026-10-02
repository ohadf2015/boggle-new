import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';
import { countKey } from '../library';

const BUNDLES = { en, he, sv, ja, es, ru } as Record<string, Record<string, unknown>>;

function label(lang: string, noun: 'plays' | 'copies', count: number): string {
  const value = countKey(noun, count, lang)
    .split('.')
    .reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), BUNDLES[lang]);
  if (typeof value !== 'string') throw new Error(`${lang}: ${countKey(noun, count, lang)} missing`);
  return value.replace('{count}', String(count));
}

describe('countKey — plural-correct social proof labels', () => {
  it.each(Object.keys(BUNDLES))('%s: every count resolves to an existing non-empty label', (lang) => {
    for (const noun of ['plays', 'copies'] as const) {
      for (const n of [1, 2, 3, 4, 5, 11, 12, 21, 22, 25, 101, 1000000]) {
        const text = label(lang, noun, n);
        expect(text.trim()).not.toBe('');
        expect(text).not.toContain('{count}');
      }
    }
  });

  it('english singular vs plural', () => {
    expect(label('en', 'plays', 1)).toBe('1 play');
    expect(label('en', 'plays', 2)).toBe('2 plays');
    expect(label('en', 'copies', 1)).toBe('1 copy');
    expect(label('en', 'copies', 7)).toBe('7 copies');
  });

  it('russian one / few / many', () => {
    expect(label('ru', 'plays', 1)).toBe('1 запуск');
    expect(label('ru', 'plays', 21)).toBe('21 запуск');
    expect(label('ru', 'plays', 3)).toBe('3 запуска');
    expect(label('ru', 'plays', 22)).toBe('22 запуска');
    expect(label('ru', 'plays', 5)).toBe('5 запусков');
    expect(label('ru', 'plays', 11)).toBe('11 запусков');
    expect(label('ru', 'copies', 1)).toBe('1 копия');
    expect(label('ru', 'copies', 4)).toBe('4 копии');
    expect(label('ru', 'copies', 12)).toBe('12 копий');
  });

  it('hebrew singular is a word form, plural keeps the number', () => {
    expect(label('he', 'plays', 1)).toBe('הפעלה אחת');
    expect(label('he', 'plays', 2)).toBe('2 הפעלות');
    expect(label('he', 'copies', 1)).toBe('העתקה אחת');
    expect(label('he', 'copies', 9)).toBe('9 העתקות');
  });

  it('spanish and swedish singular', () => {
    expect(label('es', 'plays', 1)).toBe('1 partida');
    expect(label('es', 'copies', 1)).toBe('1 copia');
    expect(label('sv', 'copies', 1)).toBe('1 kopia');
    expect(label('sv', 'copies', 3)).toBe('3 kopior');
  });

  it('an unknown locale falls back to the base key', () => {
    expect(countKey('plays', 1, 'xx')).toBe('eduLibrary.card.plays');
  });
});
