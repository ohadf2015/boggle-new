/**
 * Today's terminal Word Bridge daily result, persisted so a revisit lands on
 * the results screen instead of restarting the day from scratch.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dailyResultKey, loadDailyResult, saveDailyResult } from '../dailyResultStore';

describe('dailyResultStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('keys the result by UTC date and language', () => {
    expect(dailyResultKey('2026-10-14', 'he')).toBe('connections-daily-result-2026-10-14-he');
  });

  it('given a saved result, when loaded for the same day and language, then it round-trips', () => {
    saveDailyResult('2026-10-14', 'en', { kind: 'regular', score: 120 });
    expect(loadDailyResult('2026-10-14', 'en')).toEqual({ kind: 'regular', score: 120 });
  });

  it('given a result saved for another day or language, then nothing is loaded', () => {
    saveDailyResult('2026-10-13', 'en', { kind: 'regular', score: 1 });
    saveDailyResult('2026-10-14', 'he', { kind: 'regular', score: 1 });
    expect(loadDailyResult('2026-10-14', 'en')).toBeNull();
  });

  it('given corrupt JSON, then load returns null instead of throwing', () => {
    window.localStorage.setItem(dailyResultKey('2026-10-14', 'en'), '{nope');
    expect(loadDailyResult('2026-10-14', 'en')).toBeNull();
  });

  it('given storage that throws, then save and load are silent no-ops', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveDailyResult('2026-10-14', 'en', { a: 1 })).not.toThrow();
    expect(loadDailyResult('2026-10-14', 'en')).toBeNull();
  });
});
