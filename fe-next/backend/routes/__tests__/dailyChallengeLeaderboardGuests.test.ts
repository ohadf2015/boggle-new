/**
 * Tests verifying guest players are visible in the daily challenge leaderboard.
 *
 * The `daily_puzzle_leaderboard` view includes both authenticated players
 * (player_id NOT NULL) and guest players (guest_fingerprint NOT NULL).
 * The leaderboard response MUST include both groups so guests can see their rank
 * and compete against the complete field.
 *
 * The bug: a `.not('player_id', 'is', null)` filter on the leaderboard SELECT
 * dropped every guest row. The fix removed that line.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Track whether .not('player_id', 'is', null) was called
let notPlayerIdNullWasCalled = false;

const { mockSupabaseFrom } = vi.hoisted(() => {
  const mockSupabaseFrom = vi.fn();
  return { mockSupabaseFrom };
});

vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../redisClient', () => ({
  getCachedDailyLeaderboard: vi.fn(async () => null),
  cacheDailyLeaderboard: vi.fn(async () => {}),
  getCachedDailyPuzzle: vi.fn(async () => null),
  cacheDailyPuzzle: vi.fn(async () => {}),
}));

vi.mock('../../utils/requestCoalescing', () => ({
  coalesce: vi.fn(async (_key, fn) => fn()),
}));

import dailyChallengeRouter from '../dailyChallenge';

type RouteHandler = (req: unknown, res: unknown) => Promise<void> | void;

// Extract the GET /leaderboard/:date/:language handler from the router
const leaderboardHandler: RouteHandler = (() => {
  const router = dailyChallengeRouter as unknown as {
    stack: Array<{ route?: { path: string; stack: Array<{ handle: RouteHandler }> } }>;
  };
  const layer = router.stack.find((l) => l.route?.path === '/leaderboard/:date/:language');
  if (!layer?.route) {
    throw new Error('GET /leaderboard/:date/:language route not found');
  }
  // Get the last handler in the stack (skip middleware)
  return layer.route.stack[layer.route.stack.length - 1].handle;
})();

interface LeaderboardResponse {
  data: unknown[];
  totalParticipants: number;
  totalAttempts: number;
  guestPlayerCount: number;
  date: string;
  language: string;
}

async function callLeaderboard(date: string, language: string): Promise<{
  status: number | null;
  body: unknown;
}> {
  let capturedStatus: number | null = 200; // Default to 200 like Express does
  let capturedBody: unknown = null;

  const res = {
    headersSent: false,
    status(code: number) {
      capturedStatus = code;
      this.headersSent = true;
      return this;
    },
    setHeader() {
      return this;
    },
    json(payload: unknown) {
      capturedBody = payload;
      // If status was never set explicitly, it defaults to 200
      if (capturedStatus === 200) {
        this.headersSent = true;
      }
      return this;
    },
  };

  const req = {
    params: { date, language },
    query: {},
  };

  try {
    await leaderboardHandler(req, res);
  } catch (e) {
    console.error('Handler error:', e);
    throw e;
  }
  return { status: capturedStatus, body: capturedBody };
}

describe('daily challenge leaderboard includes guests', () => {
  beforeEach(() => {
    notPlayerIdNullWasCalled = false;
    vi.clearAllMocks();

    // Setup the mock for daily_puzzle_leaderboard queries
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'daily_puzzle_leaderboard') {
        // Build all the rows we might return
        const allRows = [
          {
            player_id: 'auth-player-1',
            guest_fingerprint: null,
            display_name: 'Alice',
            score: 950,
            word_count: 8,
            time_seconds: 120,
            rank_position: 1,
          },
          {
            player_id: null,
            guest_fingerprint: 'guest-abc',
            display_name: 'Guest Player',
            score: 900,
            word_count: 7,
            time_seconds: 140,
            rank_position: 2,
          },
        ];

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          not: vi.fn((col, op, val) => {
            // Track if .not('player_id', 'is', null) was called
            if (col === 'player_id' && op === 'is' && val === null) {
              notPlayerIdNullWasCalled = true;
            }
            return {
              order: vi.fn().mockReturnThis(),
              limit: vi.fn((n) => ({
                then: (cb) => {
                  // If .not('player_id', 'is', null) was called, filter out guests
                  const filtered = notPlayerIdNullWasCalled
                    ? allRows.filter((r) => r.player_id !== null)
                    : allRows;
                  cb({ data: filtered.slice(0, n), error: null });
                  return Promise.resolve();
                },
              })),
            };
          }),
          limit: vi.fn((n) => ({
            then: (cb) => {
              // Return all rows if .not() was NOT called
              cb({ data: allRows.slice(0, n), error: null });
              return Promise.resolve();
            },
          })),
        };
      } else if (table === 'daily_puzzle_attempts') {
        // Count queries
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            then: (cb) => {
              cb({ count: 5, error: null });
              return Promise.resolve();
            },
          })),
        };
      }

      throw new Error(`Unmocked table: ${table}`);
    });
  });

  it('returns both authenticated players and guest players in leaderboard data', async () => {
    const result = await callLeaderboard('2024-01-01', 'en');

    expect(result.status).toBe(200);

    const body = result.body as LeaderboardResponse;
    expect(body).toBeDefined();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);

    // CRITICAL: Should have 2 rows when the fix is present (no .not() filter)
    expect(body.data.length).toBe(2);

    // Auth player must be present
    expect(body.data).toContainEqual(
      expect.objectContaining({
        player_id: 'auth-player-1',
        display_name: 'Alice',
      })
    );

    // GUEST PLAYER ASSERTION: This fails if .not('player_id', 'is', null) is in the code
    expect(body.data).toContainEqual(
      expect.objectContaining({
        player_id: null,
        guest_fingerprint: 'guest-abc',
        display_name: 'Guest Player',
      })
    );
  });
});
