import { describe, it, expect, beforeEach } from 'vitest';
import { readBestStars, recordBestStars } from '../bestStars';

describe('bestStars (local personal best per level)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns 0 for a level never cleared', () => {
    expect(readBestStars('en', 5)).toBe(0);
  });

  it('records and reads back a best star rating', () => {
    const res = recordBestStars('en', 5, 2);
    expect(res).toEqual({ best: 2, isNewBest: true });
    expect(readBestStars('en', 5)).toBe(2);
  });

  it('keeps the higher rating and flags only genuine improvements', () => {
    recordBestStars('en', 5, 2);
    const same = recordBestStars('en', 5, 2);
    expect(same).toEqual({ best: 2, isNewBest: false });

    const worse = recordBestStars('en', 5, 1);
    expect(worse).toEqual({ best: 2, isNewBest: false });
    expect(readBestStars('en', 5)).toBe(2);

    const better = recordBestStars('en', 5, 3);
    expect(better).toEqual({ best: 3, isNewBest: true });
    expect(readBestStars('en', 5)).toBe(3);
  });

  it('keeps best per (locale, level) separately', () => {
    recordBestStars('en', 5, 3);
    recordBestStars('he', 5, 1);
    expect(readBestStars('en', 5)).toBe(3);
    expect(readBestStars('he', 5)).toBe(1);
    expect(readBestStars('en', 6)).toBe(0);
  });

  it('is SSR-safe: returns 0 / no-throw when storage is unavailable', () => {
    const original = globalThis.localStorage;
    // @ts-expect-error simulate server (no localStorage)
    delete globalThis.localStorage;
    expect(readBestStars('en', 1)).toBe(0);
    expect(() => recordBestStars('en', 1, 3)).not.toThrow();
    globalThis.localStorage = original;
  });
});
