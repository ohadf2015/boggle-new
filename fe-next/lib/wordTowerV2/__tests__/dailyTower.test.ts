import { describe, expect, it } from 'vitest';
import {
  MAX_SAVED_FLOORS,
  commitTower,
  dailyTargetM,
  emptySave,
  growthToday,
  loadDailyTower,
  revertToDayStart,
  rollDay,
  saveDailyTower,
  towerSaveKey,
} from '../dailyTower';

function mem(init: Record<string, string> = {}) {
  const store = { ...init };
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    store,
  };
}

const D1 = '2026-09-29';
const D2 = '2026-09-30';

describe('dailyTower — the tower persists across UTC days', () => {
  it('Given a fresh save, when today rolls in, then the baseline is an empty tower', () => {
    const s = rollDay(emptySave('en'), D1);
    expect(s.dayKey).toBe(D1);
    expect(s.dayStart).toEqual({ words: [], carriedM: 0, totalM: 0 });
    expect(growthToday(s)).toBe(0);
  });

  it('Given a tower built on day 1, when day 2 starts, then it is KEPT and the new baseline is its height', () => {
    let s = rollDay(emptySave('en'), D1);
    s = commitTower(s, { words: ['cat', 'house', 'tower'], standingM: 9 });
    const next = rollDay(s, D2);
    expect(next.words).toEqual(['cat', 'house', 'tower']);
    expect(next.dayStart.words).toEqual(['cat', 'house', 'tower']);
    expect(next.dayStart.totalM).toBe(9);
    expect(growthToday(next)).toBe(0);
  });

  it('Given the same day, when rolled again, then nothing changes (idempotent)', () => {
    let s = rollDay(emptySave('en'), D1);
    s = commitTower(s, { words: ['cat'], standingM: 3 });
    expect(rollDay(s, D1)).toBe(s);
  });

  it("Given a tower that grew today, then the daily score is only today's growth", () => {
    let s = rollDay(emptySave('en'), D1);
    s = commitTower(s, { words: ['a1', 'b2', 'c3'], standingM: 9 });
    s = rollDay(s, D2);
    s = commitTower(s, { words: ['a1', 'b2', 'c3', 'd4', 'e5'], standingM: 15 });
    expect(growthToday(s)).toBe(6);
  });

  it('Given a collapse, then the tower reverts to the start-of-day checkpoint, not to zero', () => {
    let s = rollDay(emptySave('en'), D1);
    s = commitTower(s, { words: ['a1', 'b2'], standingM: 6 });
    s = rollDay(s, D2);
    s = commitTower(s, { words: ['a1', 'b2', 'c3', 'd4'], standingM: 12 });
    const reverted = revertToDayStart(s);
    expect(reverted.words).toEqual(['a1', 'b2']);
    expect(reverted.totalM).toBe(6);
    expect(growthToday(reverted)).toBe(0);
  });

  it('Given a tower past the floor cap, then the oldest floors drop off the bottom but the height is carried', () => {
    const words = Array.from({ length: MAX_SAVED_FLOORS + 10 }, (_, i) => `w${i}`);
    const standingM = words.length * 3;
    let s = rollDay(emptySave('en'), D1);
    s = commitTower(s, { words, standingM });
    expect(s.words).toHaveLength(MAX_SAVED_FLOORS);
    expect(s.words[s.words.length - 1]).toBe(`w${words.length - 1}`);
    expect(s.carriedM).toBeCloseTo(30, 5);
    expect(s.totalM).toBeCloseTo(standingM, 5);
  });

  it('Given a later commit on a capped tower, then carried height is preserved in the total', () => {
    const words = Array.from({ length: MAX_SAVED_FLOORS }, (_, i) => `w${i}`);
    let s = rollDay(emptySave('en'), D1);
    s = commitTower(s, { words, standingM: MAX_SAVED_FLOORS * 3 });
    s = rollDay({ ...s, carriedM: 30 }, D2);
    const grown = commitTower(s, { words: [...words.slice(1), 'zz'], standingM: MAX_SAVED_FLOORS * 3 });
    expect(grown.totalM).toBeCloseTo(grown.carriedM + MAX_SAVED_FLOORS * 3, 5);
  });

  it('persists per language and round-trips through storage', () => {
    const storage = mem();
    let s = rollDay(emptySave('he'), D1);
    s = commitTower(s, { words: ['שלום', 'בית'], standingM: 6 });
    saveDailyTower(s, storage);
    expect(storage.store[towerSaveKey('he')]).toBeDefined();
    expect(storage.store[towerSaveKey('en')]).toBeUndefined();
    expect(loadDailyTower('he', storage)).toEqual(s);
    expect(loadDailyTower('en', storage)).toEqual(emptySave('en'));
  });

  it('treats corrupt or forged storage as an empty tower', () => {
    const bad = mem({ [towerSaveKey('en')]: '{"v":1,"words":"nope"}' });
    expect(loadDailyTower('en', bad)).toEqual(emptySave('en'));
    const junk = mem({ [towerSaveKey('en')]: 'not json' });
    expect(loadDailyTower('en', junk)).toEqual(emptySave('en'));
    expect(loadDailyTower('en', null)).toEqual(emptySave('en'));
  });

  it('sanitises words and clamps heights on load', () => {
    const raw = {
      v: 1,
      language: 'en',
      dayKey: D1,
      words: ['ok', 42, 'x'.repeat(80), '<b>bold</b>'],
      carriedM: -5,
      totalM: 1e12,
      dayStart: { words: ['ok'], carriedM: 0, totalM: 3 },
    };
    const s = loadDailyTower('en', mem({ [towerSaveKey('en')]: JSON.stringify(raw) }));
    expect(s.words.every((w) => typeof w === 'string' && w.length <= 15)).toBe(true);
    expect(s.carriedM).toBe(0);
    expect(s.totalM).toBeLessThanOrEqual(1e6);
  });

  it('swallows a full/blocked storage on save', () => {
    const boom = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => saveDailyTower(emptySave('en'), boom)).not.toThrow();
  });
});

describe('dailyTargetM — a goal for today', () => {
  it('is always a reachable positive whole number of metres', () => {
    for (const base of [0, 3, 30, 300, 3000]) {
      const t = dailyTargetM(base, D1);
      expect(Number.isInteger(t)).toBe(true);
      expect(t).toBeGreaterThanOrEqual(6);
    }
  });

  it('is deterministic per day and varies across days', () => {
    expect(dailyTargetM(90, D1)).toBe(dailyTargetM(90, D1));
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'];
    expect(new Set(days.map((d) => dailyTargetM(90, d))).size).toBeGreaterThan(1);
  });

  it('grows with the tower but stays modest so a big tower is not a chore', () => {
    expect(dailyTargetM(600, D1)).toBeGreaterThan(dailyTargetM(0, D1));
    expect(dailyTargetM(600, D1)).toBeLessThanOrEqual(60);
  });
});
