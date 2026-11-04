import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import STARTER_LESSON_PACKS from './starterLessonPacks';
import { loadThemedPacks } from './themedPacks';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const DICTS: Record<string, unknown> = { en, he, sv, ja, es, ru };
const SCRIPT: Record<'he' | 'ja' | 'ru', RegExp> = {
  he: /[֐-׿]/,
  ja: /[぀-ヿ一-鿿]/,
  ru: /[Ѐ-ӿ]/,
};
const ENGLISH_RUN = /[A-Za-z]{3,}/;

function lookup(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), dict);
}

function isNative(locale: keyof typeof SCRIPT, text: string): boolean {
  return SCRIPT[locale].test(text) && !ENGLISH_RUN.test(text);
}

describe('lesson packs speak the class language, with no English fallback', () => {
  it.each(LOCALES)('%s has a starter pack and its themed packs load', async (locale) => {
    expect(STARTER_LESSON_PACKS.some((p) => p.language === locale)).toBe(true);
    const packs = await loadThemedPacks(locale);
    expect(packs.length).toBeGreaterThan(0);
    for (const pack of packs) expect(pack.words.length).toBeGreaterThan(0);
  });

  it.each(['he', 'ja', 'ru'] as const)('every %s starter word, definition and hint is in that language', (locale) => {
    for (const pack of STARTER_LESSON_PACKS.filter((p) => p.language === locale)) {
      for (const w of pack.words) {
        for (const text of [w.word, w.definition, w.hint]) {
          expect(isNative(locale, text ?? ''), `${pack.nameKey}: "${text}"`).toBe(true);
        }
      }
    }
  });

  it.each(['he', 'ja', 'ru'] as const)('every starter pack name and blurb is translated for %s', (locale) => {
    for (const pack of STARTER_LESSON_PACKS) {
      for (const key of [pack.nameKey, pack.descriptionKey]) {
        const text = lookup(DICTS[locale], key);
        expect(typeof text, key).toBe('string');
        expect(text, key).not.toBe(lookup(en, key));
      }
    }
  });

  it.each(['he', 'ja', 'ru'] as const)('every %s curriculum and themed list is written in that language', (locale) => {
    const dir = join(__dirname, 'curriculum', 'data');
    const files = readdirSync(dir).filter((f) => f.startsWith(`${locale}`) && f.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const seed = JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
        lists: { code: string; name: string; description: string; words: { word: string; definition?: string }[] }[];
      };
      for (const list of seed.lists) {
        for (const text of [list.name, list.description]) expect(isNative(locale, text), `${file} ${list.code}: "${text}"`).toBe(true);
        for (const w of list.words) {
          expect(isNative(locale, w.word), `${file} ${list.code}: "${w.word}"`).toBe(true);
          if (w.definition) expect(isNative(locale, w.definition), `${file} ${list.code}: "${w.definition}"`).toBe(true);
        }
      }
    }
  });
});
