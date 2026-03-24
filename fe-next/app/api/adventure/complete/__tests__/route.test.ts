// @ts-nocheck
/**
 * Adventure Complete API Route Tests
 *
 * Security-focused: verifies gold values from client are clamped/validated.
 * Covers auth, validation, happy path, edge cases, DB errors.
 */

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

// Mock rate limiter — always allow
jest.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: jest.fn().mockReturnValue({ success: true }),
}));

// Mock supabase server auth client
const mockGetUser = jest.fn();
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

// Mock supabase service client
const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock getLevelFromXp
jest.mock('@/shared/utils/adventureXpUtils', () => ({
  getLevelFromXp: jest.fn((xp: number) => Math.floor(xp / 100) + 1),
}));

// Mock upgradeConfig — getUpgradeEffect returns 0 by default (no upgrades)
const mockGetUpgradeEffect = jest.fn().mockReturnValue(0);
jest.mock('@/lib/adventure/upgradeConfig', () => ({
  getUpgradeEffect: (...args: unknown[]) => mockGetUpgradeEffect(...args),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';

// ---------- Helpers ----------

const mockHeaders = { get: jest.fn().mockReturnValue('127.0.0.1') };

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: mockHeaders,
  } as unknown as NextRequest;
}

function makeInvalidJsonRequest(): NextRequest {
  return {
    json: () => Promise.reject(new Error('Invalid JSON')),
    headers: mockHeaders,
  } as unknown as NextRequest;
}

const validBody = { world: 1, level: 1, stars: 3, score: 500, words: 10 };

const mockProgression = {
  user_id: 'user-1',
  player_level: 1,
  xp: 0,
  current_world: 1,
  current_level: 1,
  total_stars: 0,
  gold: 100,
};

function setupDbMocks({
  progressionData = mockProgression,
  progressionError = null as { code?: string; message?: string } | null,
  completionData = null as Record<string, unknown> | null,
  completionError = null as { code?: string; message?: string } | null,
  upsertData = null as Record<string, unknown> | null,
  upsertError = null as { code?: string; message?: string } | null,
  updateError = null as { code?: string; message?: string } | null,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'player_progression') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: progressionData,
              error: progressionError,
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updateError ? null : (progressionData ?? mockProgression),
                  error: updateError,
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'level_completions') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: completionData,
                  error: completionError,
                }),
              }),
            }),
          }),
        }),
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: upsertData ?? {
                world: 1, level: 1, stars: 3,
                best_score: 500, best_words: 10,
                completed_at: '2026-01-01T00:00:00Z',
              },
              error: upsertError,
            }),
          }),
        }),
      };
    }
    return {};
  });
}

// ---------- Tests ----------

describe('POST /api/adventure/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  // ===== AUTH =====
  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(401);
    });

    it('rejects when auth returns error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(401);
    });
  });

  // ===== INPUT VALIDATION =====
  describe('Input validation', () => {
    it('rejects invalid JSON', async () => {
      const res = await POST(makeInvalidJsonRequest());
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid JSON body');
    });

    it('rejects missing required fields', async () => {
      const res = await POST(makeRequest({ world: 1 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Missing required fields');
    });

    it('rejects world out of range (0)', async () => {
      const res = await POST(makeRequest({ ...validBody, world: 0 }));
      expect(res.status).toBe(400);
    });

    it('rejects world out of range (11)', async () => {
      const res = await POST(makeRequest({ ...validBody, world: 11 }));
      expect(res.status).toBe(400);
    });

    it('rejects level out of range', async () => {
      const res = await POST(makeRequest({ ...validBody, level: 0 }));
      expect(res.status).toBe(400);
    });

    it('rejects stars > 3', async () => {
      const res = await POST(makeRequest({ ...validBody, stars: 4 }));
      expect(res.status).toBe(400);
    });

    it('rejects negative score', async () => {
      const res = await POST(makeRequest({ ...validBody, score: -1 }));
      expect(res.status).toBe(400);
    });

    it('rejects negative words', async () => {
      const res = await POST(makeRequest({ ...validBody, words: -1 }));
      expect(res.status).toBe(400);
    });

    it('ignores client-provided goldEarned (server calculates gold)', async () => {
      setupDbMocks({
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      // Client sends goldEarned but server ignores it
      const res = await POST(makeRequest({ ...validBody, goldEarned: 999999 }));
      expect(res.status).toBe(200);
      // Server formula: (10 + 1*3) * 3 + 50 = 89 (not 999999)
      expect(res.data.goldEarned).toBe(89);
    });
  });

  // ===== SECURITY: GOLD MANIPULATION =====
  describe('SECURITY: Gold value handling', () => {
    it('ignores client goldEarned and calculates server-side', async () => {
      setupDbMocks({
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      // Attacker sends goldEarned=999999 but server ignores it
      const res = await POST(makeRequest({ ...validBody, goldEarned: 999999 }));
      expect(res.status).toBe(200);
      // Server formula: (10+3)*3 + 50 = 89 (client value ignored)
      expect(res.data.goldEarned).toBe(89);
    });

    it('calculates gold server-side on first completion (3 stars = 80)', async () => {
      setupDbMocks({
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      const res = await POST(makeRequest({ ...validBody, stars: 3 }));
      expect(res.status).toBe(200);
      // (10 + 1*3) * 3 + 50 (perfect bonus) = 89
      expect(res.data.goldEarned).toBe(89);
    });

    it('awards gold on repeat completion (not just first)', async () => {
      setupDbMocks({
        completionData: { stars: 2, best_score: 300, best_words: 8 },
      });

      const res = await POST(makeRequest({ ...validBody, stars: 3 }));
      expect(res.status).toBe(200);
      // Repeat completion: (10+3)*3 + 50 = 89 (same formula as first)
      expect(res.data.goldEarned).toBe(89);
    });

    it('awards gold on repeat with same stars', async () => {
      setupDbMocks({
        completionData: { stars: 3, best_score: 600, best_words: 12 },
      });

      const res = await POST(makeRequest({ ...validBody, stars: 2 }));
      expect(res.status).toBe(200);
      // (10+3)*2 = 26 (no perfect bonus for 2 stars)
      expect(res.data.goldEarned).toBe(26);
    });

    it('server gold formula: 0 stars = 0 gold', async () => {
      setupDbMocks({
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      const res = await POST(makeRequest({ ...validBody, stars: 0 }));
      expect(res.status).toBe(200);
      expect(res.data.goldEarned).toBe(0);
    });

    it('server gold formula: 2 stars = 26 gold (no perfect bonus)', async () => {
      setupDbMocks({
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      const res = await POST(makeRequest({ ...validBody, stars: 2 }));
      expect(res.status).toBe(200);
      // (10 + 1*3) * 2 = 26
      expect(res.data.goldEarned).toBe(26);
    });

    it('applies luckyPickaxe upgrade bonus from DB', async () => {
      mockGetUpgradeEffect.mockReturnValue(0.25); // 25% bonus
      setupDbMocks({
        progressionData: { ...mockProgression, upgrades: { luckyPickaxe: 2 } },
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      const res = await POST(makeRequest({ ...validBody, stars: 3 }));
      expect(res.status).toBe(200);
      // base=89, with 25% bonus = round(89*1.25) = 111
      expect(res.data.goldEarned).toBe(111);
      expect(mockGetUpgradeEffect).toHaveBeenCalledWith({ luckyPickaxe: 2 }, 'luckyPickaxe');
      mockGetUpgradeEffect.mockReturnValue(0); // reset
    });

    it('applies longWordGold bonus from cargoBay upgrade', async () => {
      // cargoBay gives per-long-word gold bonus
      mockGetUpgradeEffect.mockImplementation((_state: unknown, id: string) =>
        id === 'cargoBay' ? 5 : 0
      );
      setupDbMocks({
        progressionData: { ...mockProgression, upgrades: { cargoBay: 1 } },
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      // 3 long words (6+ letters)
      const res = await POST(makeRequest({ ...validBody, stars: 2, longWords: 3 }));
      expect(res.status).toBe(200);
      // base=(10+3)*2=26, longWordBonus=5*3=15, total=41
      expect(res.data.goldEarned).toBe(41);
      mockGetUpgradeEffect.mockReturnValue(0);
    });

    it('caps gold at 500 per level', async () => {
      mockGetUpgradeEffect.mockReturnValue(10); // 1000% bonus
      setupDbMocks({
        progressionData: { ...mockProgression, upgrades: { luckyPickaxe: 4 } },
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      const res = await POST(makeRequest({ ...validBody, stars: 3 }));
      expect(res.status).toBe(200);
      // base=80, with 1000% bonus = 880, but capped at 500
      expect(res.data.goldEarned).toBe(500);
      mockGetUpgradeEffect.mockReturnValue(0); // reset
    });
  });

  // ===== SECURITY: LEVEL SKIP-AHEAD =====
  describe('SECURITY: Level skip-ahead prevention', () => {
    it('rejects completing a level in a world the player has not reached', async () => {
      setupDbMocks({
        progressionData: { ...mockProgression, current_world: 1, current_level: 3 },
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      // Player is at W1L3 but tries to complete W5L1
      const res = await POST(makeRequest({ ...validBody, world: 5, level: 1 }));
      expect(res.status).toBe(403);
      expect(res.data.error).toContain('not unlocked');
    });

    it('rejects completing a level ahead of current in same world', async () => {
      setupDbMocks({
        progressionData: { ...mockProgression, current_world: 3, current_level: 2 },
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      // Player is at W3L2 but tries to complete W3L5
      const res = await POST(makeRequest({ ...validBody, world: 3, level: 5 }));
      expect(res.status).toBe(403);
    });

    it('allows completing the current level', async () => {
      setupDbMocks({
        progressionData: { ...mockProgression, current_world: 2, current_level: 3 },
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      const res = await POST(makeRequest({ ...validBody, world: 2, level: 3 }));
      expect(res.status).toBe(200);
    });

    it('allows replaying a previously completed level', async () => {
      setupDbMocks({
        progressionData: { ...mockProgression, current_world: 5, current_level: 1 },
        // Level already completed
        completionData: { stars: 2, best_score: 300, best_words: 8 },
      });

      // Replay W1L1 (earlier than current)
      const res = await POST(makeRequest({ ...validBody, world: 1, level: 1 }));
      expect(res.status).toBe(200);
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('completes a new level successfully', async () => {
      setupDbMocks({
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.xpEarned).toBe(50 + 3 * 25); // BASE + stars * XP_PER_STAR
      expect(res.data.starsGained).toBe(3);
      expect(res.data.completion.world).toBe(1);
      expect(res.data.completion.level).toBe(1);
    });

    it('creates progression when none exists', async () => {
      setupDbMocks({
        progressionData: null,
        progressionError: { code: 'PGRST116', message: 'not found' },
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });

  // ===== EDGE CASES =====
  describe('Edge cases', () => {
    it('replaying a level with fewer stars awards 0 XP but still awards gold', async () => {
      setupDbMocks({
        completionData: { stars: 3, best_score: 600, best_words: 12 },
      });

      const res = await POST(makeRequest({ ...validBody, stars: 1, score: 100, words: 3 }));
      expect(res.status).toBe(200);
      expect(res.data.xpEarned).toBe(0);
      expect(res.data.starsGained).toBe(0);
      // Gold is always awarded: (10+3)*1 = 13
      expect(res.data.goldEarned).toBe(13);
    });

    it('improving stars on existing completion awards only new stars XP', async () => {
      setupDbMocks({
        completionData: { stars: 1, best_score: 200, best_words: 5 },
      });

      const res = await POST(makeRequest({ ...validBody, stars: 3 }));
      expect(res.status).toBe(200);
      // starsGained = 3 - 1 = 2, xpEarned = 2 * 25 = 50
      expect(res.data.xpEarned).toBe(50);
      expect(res.data.starsGained).toBe(2);
    });

    it('completing world 10 level 10 caps next world/level', async () => {
      setupDbMocks({
        progressionData: { ...mockProgression, current_world: 10, current_level: 10 },
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
      });

      const res = await POST(makeRequest({ ...validBody, world: 10, level: 10 }));
      expect(res.status).toBe(200);
      expect(res.data.progression.currentWorld).toBe(10);
      expect(res.data.progression.currentLevel).toBe(10);
    });
  });

  // ===== SECURITY: CONCURRENT GOLD FARMING =====
  describe('SECURITY: Optimistic lock on gold', () => {
    it('returns 409 when gold was modified concurrently (optimistic lock)', async () => {
      // Simulate optimistic lock failure: update returns 0 rows (gold changed between read and write)
      let updateCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'player_progression') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProgression,
                  error: null,
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      // null data = 0 rows updated (optimistic lock conflict)
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'level_completions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116', message: 'not found' },
                    }),
                  }),
                }),
              }),
            }),
            upsert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    world: 1, level: 1, stars: 3,
                    best_score: 500, best_words: 10,
                    completed_at: '2026-01-01T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(409);
      expect(res.data.error).toContain('Concurrent');
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 500 on progression fetch error', async () => {
      setupDbMocks({
        progressionError: { code: 'INTERNAL', message: 'DB down' },
      });

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(500);
    });

    it('returns 500 on completion upsert error', async () => {
      setupDbMocks({
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
        upsertError: { code: 'INTERNAL', message: 'write failed' },
      });

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(500);
    });

    it('returns 500 on progression update error', async () => {
      setupDbMocks({
        completionData: null,
        completionError: { code: 'PGRST116', message: 'not found' },
        updateError: { code: 'INTERNAL', message: 'update failed' },
      });

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(500);
    });

    it('retries without gold column if gold column missing', async () => {
      // First update fails with gold error (via optimistic lock chain),
      // retry succeeds (simple .eq() without gold lock)
      let updateCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'player_progression') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProgression,
                  error: null,
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation(() => {
                updateCallCount++;
                if (updateCallCount === 1) {
                  // First call: optimistic lock chain → gold column error
                  return {
                    eq: jest.fn().mockReturnValue({
                      select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                          data: null,
                          error: { code: 'PGRST204', message: 'gold column not found' },
                        }),
                      }),
                    }),
                  };
                }
                // Second call: simple retry without gold lock → success
                return Promise.resolve({ error: null });
              }),
            }),
          };
        }
        if (table === 'level_completions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116', message: 'not found' },
                    }),
                  }),
                }),
              }),
            }),
            upsert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    world: 1, level: 1, stars: 3,
                    best_score: 500, best_words: 10,
                    completed_at: '2026-01-01T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(updateCallCount).toBe(2);
    });
  });
});
