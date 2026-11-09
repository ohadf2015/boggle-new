import { describe, it, expect } from 'vitest';
import { generateWordWheelPuzzle } from '../wordWheelGeneration';
import { WHEEL_V3_SOURCES, WHEEL_V3_START_DATE, HARD_CENTER_LETTERS } from '../wordWheelSources';
import { HEBREW_WHEEL_V3_SOURCES } from '../wordWheelSourcesHe';
import { getUniqueLetters } from '../wordWheelLetters';
import { MAX_SHARED_LETTERS } from '../wordWheelSchedule';
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

const key = (letters: string[]) => [...letters].sort().join('');
const shared = (a: string[], b: string[]) => a.filter((l) => b.includes(l)).length;
const YEAR = dates(WHEEL_V3_START_DATE, 366);

describe('word wheel v3 daily schedule', () => {
  it('keeps every puzzle before the cutoff exactly as players saw it', () => {
    // Recorded from production code before v3 shipped.
    const played: [Language, string, string][] = [
      ['he', '2026-11-01', 'ושניבחמ'], ['he', '2026-11-09', 'המתדגיל'], ['he', '2026-11-10', 'רתדלבשו'],
      ['en', '2026-11-09', 'LUSDOEH'], ['en', '2026-11-10', 'RWNDHAO'], ['ja', '2026-11-10', 'りしてたあにま'],
      ['es', '2026-11-10', 'NOSLIEC'], ['sv', '2026-11-10', 'RSUTKAL'], ['ru', '2026-11-10', 'КОВАЕЛР'],
    ];
    for (const [lang, date, letters] of played) {
      expect(generateWordWheelPuzzle(date, lang).allLetters.join(''), `${lang} ${date}`).toBe(letters);
    }
  });

  it('never repeats a letter set until the whole pool has been used', () => {
    for (const lang of LANGS) {
      const n = WHEEL_V3_SOURCES[lang].length;
      const days = YEAR.slice(0, n).map((d) => key(generateWordWheelPuzzle(d, lang).allLetters));
      expect(new Set(days).size, lang).toBe(n);
    }
  });

  it('gives Hebrew a fresh wheel every day for 5 months', () => {
    expect(HEBREW_WHEEL_V3_SOURCES.length).toBeGreaterThanOrEqual(150);
    const sets = YEAR.slice(0, 150).map((d) => key(generateWordWheelPuzzle(d, 'he').allLetters));
    expect(new Set(sets).size).toBe(150);
  });

  it('never uses the same center letter two days running', () => {
    for (const lang of LANGS) {
      const centers = YEAR.map((d) => generateWordWheelPuzzle(d, lang).centerLetter);
      for (let i = 1; i < centers.length; i++) expect(centers[i], `${lang} ${YEAR[i]}`).not.toBe(centers[i - 1]);
    }
  });

  it('keeps neighbouring days visibly different', () => {
    for (const lang of ['en', 'he', 'es', 'ru', 'sv'] as const) {
      const wheels = YEAR.map((d) => generateWordWheelPuzzle(d, lang).allLetters);
      let close = 0;
      for (let i = 1; i < wheels.length; i++) {
        const overlap = shared(wheels[i], wheels[i - 1]);
        expect(overlap, `${lang} ${YEAR[i]}`).toBeLessThan(7);
        if (overlap > MAX_SHARED_LETTERS) close++;
      }
      expect(close, lang).toBeLessThanOrEqual(Math.ceil(wheels.length * 0.05));
    }
  });

  it('builds every wheel from 7 distinct letters with a playable center', () => {
    for (const lang of LANGS) {
      const hard = new Set(HARD_CENTER_LETTERS[lang] ?? []);
      for (const d of YEAR) {
        const p = generateWordWheelPuzzle(d, lang);
        expect(new Set(p.allLetters).size).toBe(7);
        expect(p.allLetters[0]).toBe(p.centerLetter);
        expect(hard.has(p.centerLetter)).toBe(false);
      }
    }
  });

  it('only uses Hebrew sources with 7 distinct letters, so the wheel never pads', () => {
    for (const src of HEBREW_WHEEL_V3_SOURCES) expect(getUniqueLetters(src, 'he').length, src).toBeGreaterThanOrEqual(7);
    const sets = HEBREW_WHEEL_V3_SOURCES.map((s) => key(getUniqueLetters(s, 'he').slice(0, 7)));
    expect(new Set(sets).size).toBe(sets.length);
  });

  it('is deterministic and the same far in the future', () => {
    expect(generateWordWheelPuzzle('2028-03-01', 'he')).toEqual(generateWordWheelPuzzle('2028-03-01', 'he'));
  });

  it('gives practice wheels in Hebrew real letters instead of padding', () => {
    for (let i = 0; i < 30; i++) {
      expect(new Set(generateWordWheelPuzzle(`practice-${i}`, 'he').allLetters).size).toBe(7);
    }
  });
});
