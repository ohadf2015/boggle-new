const { sorted } = vi.hoisted(() => ({ sorted: new Map<string, Map<string, number>>() }));

vi.mock('ioredis', () => {
  class MockRedis {
    zadd = vi.fn((key: string, score: number, member: string) => {
      if (!sorted.has(key)) sorted.set(key, new Map());
      sorted.get(key)!.set(member, score);
      return Promise.resolve(1);
    });
    zrevrange = vi.fn(
      (key: string, start: number, stop: number, withScores?: string) => {
        const entries = sorted.get(key);
        if (!entries) return Promise.resolve([]);
        const arr = [...entries.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(start, stop + 1);
        if (withScores === 'WITHSCORES')
          return Promise.resolve(
            arr.flatMap(([k, v]) => [k, String(v)])
          );
        return Promise.resolve(arr.map(([k]) => k));
      }
    );
    zrevrank = vi.fn((key: string, member: string) => {
      const entries = sorted.get(key);
      if (!entries || !entries.has(member)) return Promise.resolve(null);
      const arr = [...entries.entries()].sort((a, b) => b[1] - a[1]);
      return Promise.resolve(arr.findIndex(([k]) => k === member));
    });
    zscore = vi.fn((key: string, member: string) => {
      const entries = sorted.get(key);
      if (!entries || !entries.has(member)) return Promise.resolve(null);
      return Promise.resolve(String(entries.get(member)));
    });
    quit = vi.fn(() => Promise.resolve());
  }
  return { default: MockRedis };
});

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  updateLeaderboardScore,
  getTopPlayers,
  getPlayerRank,
  getPlayerScore,
} from '../../cache/leaderboardCache';

describe('leaderboardCache', () => {
  beforeEach(() => {
    sorted.clear();
  });

  it('stores and retrieves top players sorted by score desc', async () => {
    await updateLeaderboardScore('daily', 'user1', 100);
    await updateLeaderboardScore('daily', 'user2', 200);
    await updateLeaderboardScore('daily', 'user3', 150);

    const top = await getTopPlayers('daily', 10);
    expect(top).toHaveLength(3);
    expect(top[0].userId).toBe('user2');
    expect(top[0].score).toBe(200);
    expect(top[0].rank).toBe(1);
    expect(top[1].userId).toBe('user3');
    expect(top[2].userId).toBe('user1');
  });

  it('returns player rank (1-indexed)', async () => {
    await updateLeaderboardScore('weekly', 'userA', 50);
    await updateLeaderboardScore('weekly', 'userB', 100);

    const rank = await getPlayerRank('weekly', 'userA');
    expect(rank).toBe(2);

    const topRank = await getPlayerRank('weekly', 'userB');
    expect(topRank).toBe(1);
  });

  it('returns null rank for unknown player', async () => {
    const rank = await getPlayerRank('daily', 'ghost');
    expect(rank).toBeNull();
  });

  it('returns player score', async () => {
    await updateLeaderboardScore('monthly', 'userX', 999);
    const score = await getPlayerScore('monthly', 'userX');
    expect(score).toBe(999);
  });

  it('returns null score for unknown player', async () => {
    const score = await getPlayerScore('monthly', 'nobody');
    expect(score).toBeNull();
  });
});
