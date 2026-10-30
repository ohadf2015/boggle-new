/**
 * Today's terminal Word Bridge daily result, persisted so a revisit lands on
 * the results screen instead of restarting the day from scratch.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  dailyResultKey,
  legacyDailyResultKey,
  loadDailyResult,
  patchDailyResult,
  saveDailyResult,
} from '../dailyResultStore';

describe('dailyResultStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('keys the result by UTC date only — one daily per day, whatever the language', () => {
    expect(dailyResultKey('2026-10-14')).toBe('connections-daily-result-2026-10-14');
  });

  it('round-trips a result and stamps the language it was played in', () => {
    saveDailyResult('2026-10-14', 'en', { kind: 'regular', score: 120 });
    expect(loadDailyResult('2026-10-14', 'he')).toEqual({ kind: 'regular', score: 120, language: 'en' });
  });

  it('reads a result stored before the key dropped the language', () => {
    window.localStorage.setItem(legacyDailyResultKey('2026-10-14', 'he'), '{"kind":"regular","score":7}');
    expect(loadDailyResult('2026-10-14', 'he')).toEqual({ kind: 'regular', score: 7, language: 'he' });
  });

  it('returns null for another day', () => {
    saveDailyResult('2026-10-13', 'en', { kind: 'regular', score: 1 });
    expect(loadDailyResult('2026-10-14', 'en')).toBeNull();
  });

  it('treats a corrupt entry as nothing stored', () => {
    window.localStorage.setItem(dailyResultKey('2026-10-14'), '{nope');
    expect(loadDailyResult('2026-10-14', 'en')).toBeNull();
  });

  it('patches fields onto the stored result', () => {
    saveDailyResult('2026-10-14', 'en', { kind: 'regular', score: 1, rank: null });
    patchDailyResult('2026-10-14', { rank: 4 });
    expect(loadDailyResult('2026-10-14', 'en')).toMatchObject({ score: 1, rank: 4 });
  });

  it('never throws when storage is blocked', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveDailyResult('2026-10-14', 'en', { a: 1 })).not.toThrow();
    expect(loadDailyResult('2026-10-14', 'en')).toBeNull();
  });
});
