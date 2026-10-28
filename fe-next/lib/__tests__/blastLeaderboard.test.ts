/**
 * blastLeaderboard — weekly Redis ZSET leaderboard for blast mode.
 *
 * Tests the key derivation, ZADD semantics, and percentile math.
 * Redis client is mocked — no live connection required.
 */
import {
  getWeekKey,
  addToWeeklyLeaderboard,
  getLeaderboardPercentile,
  getWeeklyStanding,
  getWeeklyScoresAbove,
} from '../blastLeaderboard';
import { getSharedRedisClient } from '@/backend/redis/connection';

// Mock the backend redis client accessor (vitest via jest-compat shim)
vi.mock('@/backend/redis/connection', () => ({
  getSharedRedisClient: vi.fn(),
}));

const mockZadd = vi.fn();
const mockExpire = vi.fn();
const mockZrevrank = vi.fn();
const mockZcard = vi.fn();
const mockZrangebyscore = vi.fn();
const mockZscore = vi.fn();

const fakeClient = {
  zadd: mockZadd,
  expire: mockExpire,
  zrevrank: mockZrevrank,
  zcard: mockZcard,
  zrangebyscore: mockZrangebyscore,
  zscore: mockZscore,
};

const mockedGetRedisClient = getSharedRedisClient as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockZadd.mockReset().mockResolvedValue(1);
  mockExpire.mockReset().mockResolvedValue(1);
  mockZrevrank.mockReset();
  mockZcard.mockReset();
  mockZrangebyscore.mockReset();
  mockZscore.mockReset().mockResolvedValue('480');
  mockedGetRedisClient.mockReset().mockReturnValue(fakeClient);
});

describe('getWeekKey', () => {
  it('builds a key with lang, difficulty, and ISO week', () => {
    // Thursday 2026-04-09 → ISO week 15 of 2026
    const date = new Date('2026-04-09T12:00:00Z');
    expect(getWeekKey('en', 'medium', date)).toBe('blast:lb:en:medium:2026-W15');
  });

  it('normalizes Monday to the same week as Sunday of that week', () => {
    const monday = new Date('2026-04-06T00:00:00Z');
    const sunday = new Date('2026-04-12T23:59:00Z');
    expect(getWeekKey('en', 'hard', monday)).toBe(
      getWeekKey('en', 'hard', sunday),
    );
  });

  it('handles year boundary — Jan 1 2027 is ISO week 53 of 2026', () => {
    // Fri Jan 1 2027 belongs to ISO week 53 of 2026
    const date = new Date('2027-01-01T12:00:00Z');
    expect(getWeekKey('he', 'easy', date)).toBe('blast:lb:he:easy:2026-W53');
  });
});

describe('addToWeeklyLeaderboard', () => {
  it('ZADDs with GT flag and sets 14-day expiry', async () => {
    await addToWeeklyLeaderboard('user-1', 5000, 'en', 'medium', new Date('2026-04-09T12:00:00Z'));

    expect(mockZadd).toHaveBeenCalledWith(
      'blast:lb:en:medium:2026-W15',
      'GT',
      5000,
      'user-1',
    );
    expect(mockExpire).toHaveBeenCalledWith(
      'blast:lb:en:medium:2026-W15',
      14 * 24 * 60 * 60,
    );
  });

  it('is a silent no-op when Redis is unavailable', async () => {
    mockedGetRedisClient.mockReturnValueOnce(null);

    await expect(
      addToWeeklyLeaderboard('user-1', 5000, 'en', 'medium'),
    ).resolves.toBeUndefined();

    expect(mockZadd).not.toHaveBeenCalled();
  });

  it('swallows Redis errors so the caller never throws', async () => {
    mockZadd.mockRejectedValueOnce(new Error('ECONNRESET'));

    await expect(
      addToWeeklyLeaderboard('user-1', 5000, 'en', 'medium'),
    ).resolves.toBeUndefined();
  });
});

describe('getLeaderboardPercentile', () => {
  it('returns 100 for the top-ranked player', async () => {
    mockZrevrank.mockResolvedValue(0);
    mockZcard.mockResolvedValue(100);

    const pct = await getLeaderboardPercentile('user-1', 'en', 'medium');
    expect(pct).toBe(100);
  });

  it('returns ~50 for the median player', async () => {
    mockZrevrank.mockResolvedValue(50);
    mockZcard.mockResolvedValue(100);

    const pct = await getLeaderboardPercentile('user-1', 'en', 'medium');
    expect(pct).toBe(50);
  });

  it('returns 1 for the last-placed player', async () => {
    mockZrevrank.mockResolvedValue(99);
    mockZcard.mockResolvedValue(100);

    const pct = await getLeaderboardPercentile('user-1', 'en', 'medium');
    expect(pct).toBe(1);
  });

  it('returns null when the user is not on the board', async () => {
    mockZrevrank.mockResolvedValue(null);
    mockZcard.mockResolvedValue(100);

    const pct = await getLeaderboardPercentile('user-1', 'en', 'medium');
    expect(pct).toBeNull();
  });

  it('returns null when Redis is unavailable', async () => {
    mockedGetRedisClient.mockReturnValueOnce(null);

    const pct = await getLeaderboardPercentile('user-1', 'en', 'medium');
    expect(pct).toBeNull();
  });

  it('returns null and does not throw on Redis errors', async () => {
    mockZrevrank.mockRejectedValue(new Error('boom'));
    mockZcard.mockResolvedValue(100);

    const pct = await getLeaderboardPercentile('user-1', 'en', 'medium');
    expect(pct).toBeNull();
  });
});

describe('getWeeklyStanding', () => {
  it('returns a 1-based rank, the board size and the stored best score', async () => {
    mockZrevrank.mockResolvedValue(4);
    mockZcard.mockResolvedValue(37);

    await expect(getWeeklyStanding('user-1', 'en', 'medium')).resolves.toEqual({ rank: 5, total: 37, score: 480 });
  });

  it('returns null when the user is not on the board yet', async () => {
    mockZrevrank.mockResolvedValue(null);
    mockZcard.mockResolvedValue(10);

    await expect(getWeeklyStanding('user-1', 'en', 'medium')).resolves.toBeNull();
  });

  it('returns null when Redis is down or errors', async () => {
    mockedGetRedisClient.mockReturnValueOnce(null);
    await expect(getWeeklyStanding('user-1', 'en', 'medium')).resolves.toBeNull();

    mockZrevrank.mockRejectedValue(new Error('boom'));
    await expect(getWeeklyStanding('user-1', 'en', 'medium')).resolves.toBeNull();
  });

  it('fails open to null when Redis hangs', async () => {
    vi.useFakeTimers();
    mockZrevrank.mockReturnValue(new Promise(() => {}));
    mockZcard.mockReturnValue(new Promise(() => {}));
    mockZscore.mockReturnValue(new Promise(() => {}));
    const pending = getWeeklyStanding('user-1', 'en', 'medium');
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBeNull();
    vi.useRealTimers();
  });
});

describe('getWeeklyScoresAbove', () => {
  it('returns the closest scores strictly above, nearest first', async () => {
    mockZrangebyscore.mockResolvedValue(['u-a', '520', 'u-b', '610']);

    const rows = await getWeeklyScoresAbove(500, 'en', 'medium', 2, new Date('2026-04-09T12:00:00Z'));

    expect(mockZrangebyscore).toHaveBeenCalledWith(
      'blast:lb:en:medium:2026-W15', '(500', '+inf', 'WITHSCORES', 'LIMIT', 0, 2,
    );
    expect(rows).toEqual([{ userId: 'u-a', score: 520 }, { userId: 'u-b', score: 610 }]);
  });

  it('returns [] when Redis is down or errors', async () => {
    mockedGetRedisClient.mockReturnValueOnce(null);
    await expect(getWeeklyScoresAbove(500, 'en', 'medium')).resolves.toEqual([]);

    mockZrangebyscore.mockRejectedValue(new Error('boom'));
    await expect(getWeeklyScoresAbove(500, 'en', 'medium')).resolves.toEqual([]);
  });
});
