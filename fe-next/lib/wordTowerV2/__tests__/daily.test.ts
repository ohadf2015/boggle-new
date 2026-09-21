import { describe, expect, it } from 'vitest';
import { dailyBestKey } from '@/lib/wordTower/dailyBest';
import { dailyTowerGameCode, utcDateKey } from '@/lib/wordTower/dailySeed';
import { hasPlayedV2DailyToday, recordV2DailyClimb, v2DailySeed } from '../daily';

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

describe('v2 daily', () => {
  it('given a UTC day, when the seed is asked, then it matches v1 dailyTowerGameCode', () => {
    const d = new Date('2026-09-21T12:00:00Z');
    expect(v2DailySeed(d)).toBe(dailyTowerGameCode(d));
    expect(v2DailySeed(d)).toBe('daily-2026-09-21');
  });

  it('given no stored climb, when asked, then today is unplayed', () => {
    expect(hasPlayedV2DailyToday(mem(), new Date('2026-09-21T12:00:00Z'))).toBe(false);
  });

  it('given a stored climb, when asked, then today is played', () => {
    const d = new Date('2026-09-21T12:00:00Z');
    const storage = mem({ [dailyBestKey(utcDateKey(d))]: '12' });
    expect(hasPlayedV2DailyToday(storage, d)).toBe(true);
  });

  it('given a first climb, when recorded, then a submit body is returned and the marker is written', () => {
    const d = new Date('2026-09-21T12:00:00Z');
    const storage = mem();
    const body = recordV2DailyClimb(
      { climbM: 8.4, floors: 3, longestWord: 'tower' },
      { language: 'en', guestFingerprint: 'g_1', storage, date: d },
    );
    expect(body).toMatchObject({ heightM: 8, floors: 3, longestWord: 'tower', language: 'en' });
    expect(storage.store[dailyBestKey(utcDateKey(d))]).toBe('8');
    expect(hasPlayedV2DailyToday(storage, d)).toBe(true);
  });

  it('given a worse climb, when recorded, then nothing is submitted', () => {
    const d = new Date('2026-09-21T12:00:00Z');
    const storage = mem({ [dailyBestKey(utcDateKey(d))]: '20' });
    expect(
      recordV2DailyClimb({ climbM: 4, floors: 1, longestWord: 'hi' }, { language: 'en', guestFingerprint: null, storage, date: d }),
    ).toBeNull();
  });
});
