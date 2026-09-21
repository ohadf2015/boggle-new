import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fnv1aHash } from '@/lib/rng/seededRandom';
import { dailyBestKey } from '@/lib/wordTower/dailyBest';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import {
  hasPlayedV2DailyToday,
  playedOnDailyBoard,
  rankFromDailyBoard,
  recordV2DailyClimb,
  v2DailyNumericSeed,
  v2DailySeed,
  v2DailySwing,
} from '../daily';

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

const DAY = new Date('2026-09-21T12:00:00Z');

describe('v2 daily', () => {
  it('given a UTC day and language, when the numeric seed is asked, then it is FNV-1a of utcTodayKey + language', () => {
    expect(v2DailyNumericSeed(DAY, 'en')).toBe(fnv1aHash('2026-09-21en'));
    expect(v2DailyNumericSeed(DAY, 'he')).toBe(fnv1aHash('2026-09-21he'));
    expect(v2DailyNumericSeed(DAY, 'en')).not.toBe(v2DailyNumericSeed(DAY, 'he'));
    expect(v2DailyNumericSeed(DAY, 'en')).toBe(v2DailyNumericSeed(new Date('2026-09-21T23:59:59Z'), 'en'));
  });

  it('given a UTC day and language, when the wheel seed is asked, then it is unique per language', () => {
    expect(v2DailySeed(DAY, 'en')).toBe('daily-2026-09-21-en');
    expect(v2DailySeed(DAY, 'he')).toBe('daily-2026-09-21-he');
  });

  it('given the same seed and drop, when the swing is asked twice, then every player gets the same scripted swing', () => {
    const seed = v2DailyNumericSeed(DAY, 'en');
    expect(v2DailySwing(seed, 3)).toEqual(v2DailySwing(seed, 3));
    expect(v2DailySwing(seed, 0)).not.toEqual(v2DailySwing(seed, 1));
    expect(v2DailySwing(v2DailyNumericSeed(DAY, 'he'), 3)).not.toEqual(v2DailySwing(seed, 3));
  });

  it('given no stored climb, when asked, then today is unplayed', () => {
    expect(hasPlayedV2DailyToday(mem(), DAY)).toBe(false);
  });

  it('given a stored climb, when asked, then today is played', () => {
    const storage = mem({ [dailyBestKey(utcDateKey(DAY))]: '12' });
    expect(hasPlayedV2DailyToday(storage, DAY)).toBe(true);
  });

  it('given a first climb, when recorded, then a submit body is returned and the marker is written', () => {
    const storage = mem();
    const body = recordV2DailyClimb(
      { climbM: 8.4, floors: 3, longestWord: 'tower' },
      { language: 'en', guestFingerprint: 'g_1', storage, date: DAY },
    );
    expect(body).toMatchObject({
      heightM: 8,
      floors: 3,
      longestWord: 'tower',
      language: 'en',
      guestFingerprint: 'g_1',
    });
    expect(storage.store[dailyBestKey(utcDateKey(DAY))]).toBe('8');
    expect(hasPlayedV2DailyToday(storage, DAY)).toBe(true);
  });

  it('given a worse climb, when recorded, then nothing is submitted', () => {
    const storage = mem({ [dailyBestKey(utcDateKey(DAY))]: '20' });
    expect(
      recordV2DailyClimb({ climbM: 4, floors: 1, longestWord: 'hi' }, { language: 'en', guestFingerprint: null, storage, date: DAY }),
    ).toBeNull();
  });

  it('given a v2 climb, when mapped, then the body matches the existing daily score POST contract', () => {
    const body = recordV2DailyClimb(
      { climbM: 12.9, floors: 5, longestWord: 'crane' },
      { language: 'sv', guestFingerprint: null, storage: mem(), date: DAY },
    );
    expect(body).toEqual(
      expect.objectContaining({
        heightM: expect.any(Number),
        floors: expect.any(Number),
        longestWord: expect.any(String),
        language: expect.any(String),
        guestFingerprint: null,
      }),
    );
    expect(body!.heightM).toBeGreaterThan(0);
  });

  it('given the existing daily score route, when v2 posts those fields, then the route still reads them', () => {
    const src = readFileSync(join(__dirname, '../../../app/api/word-tower/daily/score/route.ts'), 'utf8');
    expect(src).toContain('body.heightM');
    expect(src).toContain('body.floors');
    expect(src).toContain('body.longestWord');
    expect(src).toContain('daily_word_tower_leaderboard');
    expect(src).toContain('daily_word_tower_attempts');
  });

  it('given WordTowerV2 daily, when the run ends, then restart is gated and the crate/swing seed is the hashed UTC key', () => {
    const src = readFileSync(join(__dirname, '../../../components/wordTowerV2/WordTowerV2.tsx'), 'utf8');
    expect(src).toContain('v2DailyNumericSeed');
    expect(src).toContain('scriptedSwing: daily');
    expect(src).toContain('if (dailyLocked) return;');
    expect(src).toContain('{!dailyLocked ? (');
    const runSrc = readFileSync(join(__dirname, '../../../components/wordTowerV2/useTowerRun.ts'), 'utf8');
    expect(runSrc).toContain('v2DailySwing');
    expect(runSrc).toContain('createRun(dailySeed ?? Date.now())');
  });

  it('given a leaderboard with the viewer at rank 4, when asked, then that rank is returned', () => {
    expect(
      rankFromDailyBoard([
        { isYou: false, rank: 1 },
        { isYou: true, rank: 4 },
      ]),
    ).toBe(4);
    expect(playedOnDailyBoard([{ isYou: true, rank: 4 }])).toBe(true);
    expect(playedOnDailyBoard([{ isYou: false, rank: 1 }])).toBe(false);
    expect(rankFromDailyBoard([])).toBeNull();
  });
});
