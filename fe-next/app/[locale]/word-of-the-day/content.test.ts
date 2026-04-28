import { describe, it, expect } from 'vitest';
import {
  getWordByDate,
  getRotatedTodayWord,
  wordsByLocale,
  type Locale,
} from './content';

describe('getWordByDate', () => {
  it('returns the HE entry for an existing dateKey', () => {
    const entry = getWordByDate('he', '2026-03-10');
    expect(entry).not.toBeNull();
    expect(entry?.word).toBe('דקדקן');
    expect(entry?.dateKey).toBe('2026-03-10');
  });

  it('returns the EN entry for an existing dateKey', () => {
    const entry = getWordByDate('en', '2026-03-10');
    expect(entry?.word).toBe('Quixotic');
  });

  it('returns null when the dateKey has no entry in that locale', () => {
    expect(getWordByDate('he', '1999-01-01')).toBeNull();
    expect(getWordByDate('he', '2026-04-28')).toBeNull();
  });

  it('falls back to en words when locale unknown', () => {
    const entry = getWordByDate('xx' as Locale, '2026-03-10');
    expect(entry?.word).toBe('Quixotic');
  });

  it('rejects malformed date keys', () => {
    expect(getWordByDate('he', 'not-a-date')).toBeNull();
    expect(getWordByDate('he', '2026/03/10')).toBeNull();
    expect(getWordByDate('he', '')).toBeNull();
  });
});

describe('getRotatedTodayWord', () => {
  it('returns the exact-match entry when one exists for that date', () => {
    const entry = getRotatedTodayWord('he', '2026-03-08');
    expect(entry.word).toBe('תעלומה');
  });

  it('returns a deterministic entry when no exact match (day-of-year rotation)', () => {
    const a = getRotatedTodayWord('he', '2026-04-28');
    const b = getRotatedTodayWord('he', '2026-04-28');
    expect(a.word).toBe(b.word);
  });

  it('rotates across days so consecutive days yield different words when locale has >1 entries', () => {
    const seen = new Set<string>();
    const heCount = wordsByLocale.he.length;
    for (let i = 0; i < heCount; i++) {
      const date = new Date(Date.UTC(2026, 5, 1 + i));
      const key = date.toISOString().slice(0, 10);
      seen.add(getRotatedTodayWord('he', key).word);
    }
    expect(seen.size).toBe(heCount);
  });

  it('returns the first entry when locale list is empty after fallback', () => {
    const entry = getRotatedTodayWord('en', '2026-04-28');
    expect(entry).toBeDefined();
    expect(typeof entry.word).toBe('string');
  });
});
