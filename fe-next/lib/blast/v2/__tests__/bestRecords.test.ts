import { describe, it, expect, beforeEach } from 'vitest';
import { readBestRecord, recordBestRun } from '../bestRecords';
import { readBestStars, recordBestStars, BEST_STARS_KEY } from '../bestStars';

describe('bestRecords (stars + bonus + fastest)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the empty record for an un-played level', () => {
    expect(readBestRecord('en', 7)).toEqual({ stars: 0, bonusBest: 0, fastestSeconds: 0 });
  });

  it('records a new best across all three axes on first run', () => {
    const { record, newBests } = recordBestRun('en', 7, {
      stars: 2,
      bonusWords: 1,
      timeSeconds: 40,
    });
    expect(record).toEqual({ stars: 2, bonusBest: 1, fastestSeconds: 40 });
    expect(newBests).toEqual({ stars: true, bonus: true, time: true });
  });

  it('keeps the higher stars, higher bonus, lower time independently', () => {
    recordBestRun('en', 7, { stars: 2, bonusWords: 2, timeSeconds: 40 });
    const { record, newBests } = recordBestRun('en', 7, {
      stars: 3,         // improves
      bonusWords: 1,    // worse
      timeSeconds: 60,  // worse
    });
    expect(record).toEqual({ stars: 3, bonusBest: 2, fastestSeconds: 40 });
    expect(newBests).toEqual({ stars: true, bonus: false, time: false });
  });

  it('a faster time only beats fastestSeconds when > 0 prior or first time', () => {
    recordBestRun('en', 7, { stars: 2, bonusWords: 0, timeSeconds: 30 });
    const { record, newBests } = recordBestRun('en', 7, {
      stars: 2,
      bonusWords: 0,
      timeSeconds: 25,
    });
    expect(record.fastestSeconds).toBe(25);
    expect(newBests.time).toBe(true);
  });

  it('ignores invalid timeSeconds (0 or negative) — never crowns them as the fastest', () => {
    recordBestRun('en', 7, { stars: 1, bonusWords: 0, timeSeconds: 50 });
    const { record, newBests } = recordBestRun('en', 7, {
      stars: 1,
      bonusWords: 0,
      timeSeconds: 0,
    });
    expect(record.fastestSeconds).toBe(50);
    expect(newBests.time).toBe(false);
  });

  it('bestStars legacy API still reads the stars field after recordBestRun', () => {
    recordBestRun('en', 8, { stars: 3, bonusWords: 0, timeSeconds: 22 });
    expect(readBestStars('en', 8)).toBe(3);
  });

  it('recordBestStars (legacy) still functions and round-trips', () => {
    const r = recordBestStars('en', 9, 2);
    expect(r.best).toBe(2);
    expect(readBestRecord('en', 9).stars).toBe(2);
  });

  it('reads an old-shape payload (plain number) without crashing', () => {
    // Simulate an upgrade from the prior schema where the value was just a number.
    localStorage.setItem(BEST_STARS_KEY, JSON.stringify({ 'en:9': 3 }));
    const rec = readBestRecord('en', 9);
    expect(rec.stars).toBe(3);
    expect(rec.bonusBest).toBe(0);
    expect(rec.fastestSeconds).toBe(0);
  });

  it('SSR-safe: no throw without localStorage', () => {
    const original = globalThis.localStorage;
    // @ts-expect-error simulate server
    delete globalThis.localStorage;
    expect(() => readBestRecord('en', 1)).not.toThrow();
    expect(() => recordBestRun('en', 1, { stars: 1, bonusWords: 0, timeSeconds: 0 })).not.toThrow();
    globalThis.localStorage = original;
  });
});
