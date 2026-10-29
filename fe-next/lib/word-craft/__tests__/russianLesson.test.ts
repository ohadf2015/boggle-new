import { describe, it, expect, vi } from 'vitest';
import starter from '@/lib/education/curriculum/data/ru-starter.json';
import { getTileBag, toWordCraftLocale, BLANK_LETTER, TOTAL_TILES } from '../tileBag';
import { homeworkWordCraftLocaleFor, wordCraftHomeworkSupports, lessonTargetsWithDrops, wordCraftLocaleFor } from '../lessonBag';
import { loadWordCraftDictionary } from '../dictionary';
import { alphabetForLocale } from '../wordCraftAlphabet';

const CYRILLIC_CAPITAL = /^[А-Я]$/;

describe('Word Craft Russian bag', () => {
  it('Then every letter is a Cyrillic capital, Ё is folded into Е, and the bag is the standard size', () => {
    const { values, distribution } = getTileBag('ru');
    const letters = Object.keys(distribution).filter((l) => l !== BLANK_LETTER);
    for (const l of letters) {
      expect(l).toMatch(CYRILLIC_CAPITAL);
      expect(values[l]).toBeGreaterThan(0);
    }
    expect(letters).not.toContain('Ё');
    for (const l of ['Ь', 'Ъ', 'Ы', 'Й', 'Щ']) expect(letters).toContain(l);
    expect(Object.values(distribution).reduce((a, b) => a + b, 0)).toBe(TOTAL_TILES);
    expect(alphabetForLocale('ru')).toEqual(letters);
  });

  it('Then the public game keeps mapping a Russian app language to the en bag', () => {
    expect(toWordCraftLocale('ru')).toBe('en');
  });
});

describe('Word Craft homework in a Russian lesson', () => {
  it('Given a Russian lesson, Then homework deals in Russian, seeded, whatever the UI language', () => {
    expect(homeworkWordCraftLocaleFor('ru', 'sv')).toEqual({ locale: 'ru', seeded: true });
    expect(homeworkWordCraftLocaleFor('he', 'en')).toEqual({ locale: 'he', seeded: true });
    expect(homeworkWordCraftLocaleFor('fr', 'sv')).toEqual({ locale: 'sv', seeded: false });
    expect(wordCraftHomeworkSupports('ru')).toBe(true);
  });

  it('Then the live classroom resolver is unchanged (its server deals no Russian)', () => {
    expect(wordCraftLocaleFor('ru', 'sv')).toEqual({ locale: 'sv', seeded: false });
  });

  it('Given real starter words, Then every rack-sized word is a target in its ё-folded form', () => {
    const words = starter.lists[0].words.map((w) => w.word);
    const { targets, dropped } = lessonTargetsWithDrops([...words, 'ёлка', 'объём'], 'ru');
    expect(targets).toEqual(expect.arrayContaining(['ДОМ', 'КОШКА', 'ЕЛКА', 'ОБЪЕМ']));
    for (const d of dropped) expect([...d].length).toBeGreaterThan(7);
  });

  it('Given a lesson round, Then the Russian dictionary is fetched (not en) and matches tile words', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, text: async () => 'кошка\nелка\nдом' });
    const dict = await loadWordCraftDictionary('ru', { fetchFn: fetchFn as never, storage: null as never, exact: true });
    expect(String(fetchFn.mock.calls[0][0])).toBe('/api/dictionary-words?lang=ru');
    expect(dict.has('КОШКА')).toBe(true);
    expect(dict.has('ЕЛКА')).toBe(true);
  });

  it('Given a public caller passing ru, Then the en list is still fetched', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, text: async () => 'cat' });
    await loadWordCraftDictionary('ru', { fetchFn: fetchFn as never, storage: null as never });
    expect(String(fetchFn.mock.calls[0][0])).toBe('/api/dictionary-words?lang=en');
  });
});
