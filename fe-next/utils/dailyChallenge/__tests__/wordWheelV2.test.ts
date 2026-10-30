import { describe, it, expect } from 'vitest';
import { generateWordWheelPuzzle } from '../wordWheelGeneration';
import { WHEEL_V2_SOURCES, HARD_CENTER_LETTERS, LEGACY_WHEEL_SOURCES, WHEEL_V2_START_DATE } from '../wordWheelSources';
import type { Language } from '@/types';

const LANGS: Language[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

function dates(from: string, days: number): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const V2 = WHEEL_V2_START_DATE;
const DAY_BEFORE_V2 = new Date(Date.parse(`${V2}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

const unique = (word: string) => new Set([...word.toUpperCase()]).size;

describe('word wheel v2 (puzzles from WHEEL_V2_START_DATE)', () => {
  it('never puts a hard letter in the center', () => {
    for (const lang of LANGS) {
      const hard = new Set(HARD_CENTER_LETTERS[lang] ?? []);
      for (const date of dates(V2, 400)) {
        const p = generateWordWheelPuzzle(date, lang);
        expect(hard.has(p.centerLetter), `${date} ${lang} center ${p.centerLetter}`).toBe(false);
      }
    }
  });

  it('keeps Q/J/X/Z out of the center for every Latin-alphabet language', () => {
    for (const lang of ['en', 'sv', 'es'] as const) {
      for (const l of ['Q', 'J', 'X', 'Z']) expect(HARD_CENTER_LETTERS[lang]).toContain(l);
    }
  });

  it('draws 7 letters straight from a source word, so the wheel never pads (except Hebrew, unchanged)', () => {
    for (const lang of ['en', 'sv', 'ja', 'es', 'ru'] as const) {
      for (const src of WHEEL_V2_SOURCES[lang]) expect(unique(src), `${lang} ${src}`).toBeGreaterThanOrEqual(7);
    }
  });

  it('drops the malformed English sources', () => {
    for (const bad of ['SCOLARING', 'THUMBSCRW', 'FULCRTIPS', 'NEURALKIT', 'LEVITAING', 'NIGHTWARE', 'JUMBOSIZE']) {
      expect(WHEEL_V2_SOURCES.en).not.toContain(bad);
    }
    expect(WHEEL_V2_SOURCES.en.length).toBeGreaterThan(LEGACY_WHEEL_SOURCES.en.length);
  });

  it('builds the Japanese wheel from hiragana, the script the dictionary is in', () => {
    for (const date of dates(V2, 60)) {
      for (const l of generateWordWheelPuzzle(date, 'ja').allLetters) expect(l).toMatch(/^[ぁ-ゖ]$/);
    }
  });

  it('keeps the Hebrew daily exactly as before (same sources, no hard letters)', () => {
    expect(WHEEL_V2_SOURCES.he).toEqual(LEGACY_WHEEL_SOURCES.he);
    expect(HARD_CENTER_LETTERS.he ?? []).toEqual([]);
  });

  it('is deterministic per date + language', () => {
    expect(generateWordWheelPuzzle(V2, 'en')).toEqual(generateWordWheelPuzzle(V2, 'en'));
  });

  it('switches only at the cutoff date', () => {
    const before = generateWordWheelPuzzle(DAY_BEFORE_V2, 'ja');
    const after = generateWordWheelPuzzle(V2, 'ja');
    expect(before.allLetters.some(l => /[一-鿿]/.test(l))).toBe(true);
    expect(after.allLetters.every(l => /^[ぁ-ゖ]$/.test(l))).toBe(true);
  });
});
