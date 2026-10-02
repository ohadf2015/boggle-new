import { describe, it, expect } from 'vitest';
import { pickMissedPracticeWords, enrichReviewWords, isPlausibleLocalDay } from '@/lib/education/missedPracticePlan';
import type { HardWord } from '@/lib/education/wordMasteryReport';

const hard = (word: string, missed: number): HardWord => ({
  word,
  display: word.toUpperCase() === word ? word : word,
  attempts: missed + 1,
  missed,
  missRate: 50,
  studentsMissing: 1,
  studentsAsked: 2,
});

describe('pickMissedPracticeWords', () => {
  const ranked = [hard('bridge', 4), hard('castle', 2), hard('crystal', 1)];

  it('takes every ranked missed word when the teacher did not narrow the list', () => {
    expect(pickMissedPracticeWords(ranked)).toEqual(['bridge', 'castle', 'crystal']);
  });

  it('keeps only requested words the class actually missed — a client cannot inject new ones', () => {
    expect(pickMissedPracticeWords(ranked, ['castle', 'unicorn'])).toEqual(['castle']);
  });

  it('matches the request case-insensitively', () => {
    expect(pickMissedPracticeWords(ranked, ['BRIDGE'])).toEqual(['bridge']);
  });
});

describe('enrichReviewWords', () => {
  it('carries the teacher\'s own definition across from the source lesson', () => {
    const words = enrichReviewWords(['bridge', 'castle'], [
      { words: [{ word: 'Bridge', definition: 'crosses a river', canIntegrate: true }] },
    ]);
    expect(words[0]).toEqual({ word: 'bridge', definition: 'crosses a river', canIntegrate: true });
    expect(words[1]).toEqual({ word: 'castle', canIntegrate: true });
  });

  it('survives malformed lesson rows', () => {
    expect(enrichReviewWords(['a'], [{ words: null }, { words: 'x' as unknown as [] }])).toEqual([
      { word: 'a', canIntegrate: true },
    ]);
  });
});

describe('isPlausibleLocalDay', () => {
  const now = Date.parse('2026-10-01T22:30:00Z');

  it('accepts the server day and its neighbours (time zones span ±14h)', () => {
    expect(isPlausibleLocalDay('2026-10-01', now)).toBe(true);
    expect(isPlausibleLocalDay('2026-10-02', now)).toBe(true);
    expect(isPlausibleLocalDay('2026-09-30', now)).toBe(true);
  });

  it('refuses a day far from now', () => {
    expect(isPlausibleLocalDay('2026-12-25', now)).toBe(false);
    expect(isPlausibleLocalDay('nonsense', now)).toBe(false);
  });
});
