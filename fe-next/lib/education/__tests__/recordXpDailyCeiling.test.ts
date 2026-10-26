import { beforeEach, describe, expect, it, vi } from 'vitest';

const counters = new Map<string, number>();
const expiries = new Map<string, number>();
let available = true;
let broken = false;
vi.mock('@/backend/redis/connection', () => ({
  getSharedRedisClient: () =>
    available
      ? {
          incrby: async (k: string, by: number) => {
            if (broken) throw new Error('connection reset');
            const next = (counters.get(k) ?? 0) + by;
            counters.set(k, next);
            return next;
          },
          expire: async (k: string, sec: number) => {
            expiries.set(k, sec);
            return 1;
          },
        }
      : null,
}));

import { reserveDailyXp } from '../recordXpDailyCeiling';

describe('reserveDailyXp', () => {
  beforeEach(() => {
    counters.clear();
    expiries.clear();
    available = true;
    broken = false;
  });

  it('grants the full amount while the day is under the ceiling', async () => {
    expect(await reserveDailyXp('u1', '2026-10-26', 40, 100)).toBe(40);
    expect(await reserveDailyXp('u1', '2026-10-26', 40, 100)).toBe(40);
  });

  it('grants only what is left on the call that crosses the ceiling, then nothing', async () => {
    await reserveDailyXp('u1', '2026-10-26', 90, 100);
    expect(await reserveDailyXp('u1', '2026-10-26', 30, 100)).toBe(10);
    expect(await reserveDailyXp('u1', '2026-10-26', 30, 100)).toBe(0);
  });

  it('keeps a separate budget per user and per day, and lets the counter expire', async () => {
    await reserveDailyXp('u1', '2026-10-26', 100, 100);
    expect(await reserveDailyXp('u2', '2026-10-26', 50, 100)).toBe(50);
    expect(await reserveDailyXp('u1', '2026-10-27', 50, 100)).toBe(50);
    expect([...expiries.values()].every((sec) => sec >= 24 * 60 * 60)).toBe(true);
  });

  it('reports the store as unavailable instead of granting blind', async () => {
    available = false;
    expect(await reserveDailyXp('u1', '2026-10-26', 40, 100)).toBe('unavailable');
    available = true;
    broken = true;
    expect(await reserveDailyXp('u1', '2026-10-26', 40, 100)).toBe('unavailable');
  });
});
