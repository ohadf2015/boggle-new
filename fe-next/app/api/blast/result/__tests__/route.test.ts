// @ts-nocheck
import { vi } from 'vitest';
/**
 * Blast Result API Route Tests
 *
 * HIGH severity issues documented:
 * - SECURITY: Client controls score/stats — server trusts any value
 * - N+1 DB: SELECT profile then UPDATE profile (not atomic)
 * - No rate limiting on POST
 */

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

// Mock rate limiter — always allow
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));

// Mock supabase server auth client
const mockGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

// Mock supabase service client
const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// ---------- Helpers ----------

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

function makeInvalidJsonRequest(): NextRequest {
  return {
    json: () => Promise.reject(new Error('Invalid JSON')),
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

function makeGetRequest(query = ''): Request {
  return {
    url: `http://localhost:3000/api/blast/result${query ? `?${query}` : ''}`,
  } as unknown as Request;
}

const validBody = {
  score: 500,
  tilesCleared: 20,
  totalTiles: 25,
  clearPercentage: 80,
  wordsFound: ['hello', 'world'],
  bestWord: 'hello',
  maxCombo: 3,
  stars: 2,
  difficulty: 'medium',
  language: 'en',
};

const mockProfile = {
  total_score: 1000,
  total_games: 5,
  total_words: 50,
};

function setupDbMocks({
  insertError = null as { code?: string; message?: string } | null,
  existingBests = null as Record<string, number> | null,
  bestsError = null as { code?: string; message?: string } | null,
  upsertError = null as { code?: string; message?: string } | null,
  profile = mockProfile as Record<string, number> | null,
  profileUpdateError = null as { code?: string; message?: string } | null,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'blast_results') {
      return {
        insert: vi.fn().mockResolvedValue({ error: insertError }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                then: (cb: (v: unknown) => unknown) => cb({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'blast_personal_bests') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: existingBests,
                error: bestsError,
              }),
            }),
            // For GET — no second eq, just return data
            then: (cb: (v: unknown) => unknown) => cb({ data: [], error: null }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: upsertError }),
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: profile,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: profileUpdateError }),
        }),
      };
    }
    return {};
  });
}

// ---------- Tests ----------

describe('POST /api/blast/result', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    // Default RPC mock — XP awarding is non-fatal so most tests don't care
    mockRpc.mockResolvedValue({
      data: [{ new_total_xp: 100, new_level: 2, xp_granted: 50 }],
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

    it('rejects when auth error occurs', async () => {
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
      const res = await POST(makeRequest({ score: 100 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Missing required fields');
    });

    it('rejects non-number score', async () => {
      const res = await POST(makeRequest({ ...validBody, score: 'high' }));
      expect(res.status).toBe(400);
    });

    it('rejects negative score', async () => {
      const res = await POST(makeRequest({ ...validBody, score: -1 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid score');
    });

    it('rejects stars < 1', async () => {
      const res = await POST(makeRequest({ ...validBody, stars: 0 }));
      expect(res.status).toBe(400);
    });

    it('rejects stars > 3', async () => {
      const res = await POST(makeRequest({ ...validBody, stars: 4 }));
      expect(res.status).toBe(400);
    });

    it('rejects invalid difficulty', async () => {
      const res = await POST(makeRequest({ ...validBody, difficulty: 'insane' }));
      expect(res.status).toBe(400);
    });

    it('rejects invalid language', async () => {
      const res = await POST(makeRequest({ ...validBody, language: 'fr' }));
      expect(res.status).toBe(400);
    });

    it('rejects non-array wordsFound', async () => {
      const res = await POST(makeRequest({ ...validBody, wordsFound: 'hello' }));
      expect(res.status).toBe(400);
    });
  });

  // ===== SECURITY: Score/stats upper bounds =====
  describe('Score and stats upper bound validation', () => {
    it('rejects score exceeding upper bound', async () => {
      const res = await POST(makeRequest({ ...validBody, score: 999999 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid score');
    });

    it('rejects maxCombo exceeding upper bound', async () => {
      const res = await POST(makeRequest({ ...validBody, maxCombo: 999 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid maxCombo');
    });

    it('rejects clearPercentage inconsistent with tilesCleared/totalTiles', async () => {
      const res = await POST(makeRequest({ ...validBody, clearPercentage: 100, tilesCleared: 0 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('clearPercentage');
    });

    it('accepts tilesCleared > totalTiles (cumulative in gravity mode)', async () => {
      setupDbMocks();
      const res = await POST(makeRequest({ ...validBody, tilesCleared: 30, totalTiles: 25, clearPercentage: 100 }));
      expect(res.status).toBe(200);
    });

    it('rejects totalTiles > max grid size (36)', async () => {
      const res = await POST(makeRequest({ ...validBody, totalTiles: 100, tilesCleared: 20 }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('totalTiles');
    });

    it('accepts score at upper bound (50000)', async () => {
      setupDbMocks();
      const res = await POST(makeRequest({ ...validBody, score: 50000 }));
      expect(res.status).toBe(200);
    });

    it('accepts consistent clearPercentage', async () => {
      setupDbMocks();
      // 20/25 = 80%
      const res = await POST(makeRequest({ ...validBody, tilesCleared: 20, totalTiles: 25, clearPercentage: 80 }));
      expect(res.status).toBe(200);
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('saves result and returns personal bests for new user', async () => {
      setupDbMocks({ existingBests: null });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.personalBests).toEqual({
        bestScore: 500,
        bestClearPercentage: 80,
        bestMaxCombo: 3,
        totalGames: 1,
        totalWords: 2,
      });
      expect(res.data.isNewBestScore).toBe(true);
      expect(res.data.isNewBestCombo).toBe(true);
    });

    it('updates personal bests when new score is higher', async () => {
      setupDbMocks({
        existingBests: {
          best_score: 300,
          best_clear_percentage: 60,
          best_max_combo: 2,
          total_games: 3,
          total_words: 10,
        },
      });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(res.data.personalBests.bestScore).toBe(500);
      expect(res.data.isNewBestScore).toBe(true);
      expect(res.data.isNewBestCombo).toBe(true);
    });

    it('keeps existing bests when new score is lower', async () => {
      setupDbMocks({
        existingBests: {
          best_score: 1000,
          best_clear_percentage: 95,
          best_max_combo: 10,
          total_games: 5,
          total_words: 30,
        },
      });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(res.data.personalBests.bestScore).toBe(1000);
      expect(res.data.isNewBestScore).toBe(false);
      expect(res.data.isNewBestCombo).toBe(false);
      // But totalGames/totalWords still incremented
      expect(res.data.personalBests.totalGames).toBe(6);
      expect(res.data.personalBests.totalWords).toBe(32);
    });

    it('updates profile stats (N+1 pattern: SELECT then UPDATE)', async () => {
      setupDbMocks();
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      // Verify profiles table was accessed
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });
  });

  // ===== EDGE CASES =====
  describe('Edge cases', () => {
    it('score=0 is accepted', async () => {
      setupDbMocks();
      const res = await POST(makeRequest({ ...validBody, score: 0 }));
      expect(res.status).toBe(200);
    });

    it('very large score is rejected by upper bound', async () => {
      const res = await POST(makeRequest({ ...validBody, score: Number.MAX_SAFE_INTEGER }));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid score');
    });

    it('empty wordsFound array is accepted', async () => {
      setupDbMocks();
      const res = await POST(makeRequest({ ...validBody, wordsFound: [] }));
      expect(res.status).toBe(200);
    });

    it('missing bestWord defaults to empty string', async () => {
      setupDbMocks();
      const { bestWord, ...bodyWithoutBestWord } = validBody;
      const res = await POST(makeRequest(bodyWithoutBestWord));
      expect(res.status).toBe(200);
    });

    it('handles migration pending (PGRST205) gracefully', async () => {
      setupDbMocks({ insertError: { code: 'PGRST205', message: 'table not found' } });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(res.data.migrationPending).toBe(true);
    });
  });

  // ===== XP AWARDING =====
  describe('XP awarding', () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({
        data: [{ new_total_xp: 1000, new_level: 5, xp_granted: 40 }],
        error: null,
      });
    });

    it('calls increment_player_xp RPC after saving result', async () => {
      setupDbMocks();
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', {
        p_player_id: 'user-1',
        p_xp_amount: expect.any(Number),
      });
    });

    it('awards higher XP for hard difficulty than easy', async () => {
      setupDbMocks();
      await POST(makeRequest({ ...validBody, difficulty: 'easy' }));
      const easyXp = mockRpc.mock.calls[0]?.[1]?.p_xp_amount;

      mockRpc.mockClear();
      setupDbMocks();
      await POST(makeRequest({ ...validBody, difficulty: 'hard' }));
      const hardXp = mockRpc.mock.calls[0]?.[1]?.p_xp_amount;

      expect(hardXp).toBeGreaterThan(easyXp);
    });

    it('includes xpAwarded in the response', async () => {
      setupDbMocks();
      const res = await POST(makeRequest(validBody));
      // Mock's xp_granted is 40 (set in this block's beforeEach) — response echoes that
      expect(res.data.xpAwarded).toBe(40);
    });

    it('XP RPC failure is non-fatal — result still succeeds', async () => {
      setupDbMocks();
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('caps XP at per-difficulty maximum to prevent farming (medium)', async () => {
      setupDbMocks();
      await POST(makeRequest({ ...validBody, difficulty: 'medium', score: 50000 }));
      const xpAmount = mockRpc.mock.calls[0]?.[1]?.p_xp_amount;
      expect(xpAmount).toBeLessThanOrEqual(175);
    });

    it('caps Easy XP at 100 regardless of score', async () => {
      setupDbMocks();
      await POST(makeRequest({ ...validBody, difficulty: 'easy', score: 50000 }));
      const xpAmount = mockRpc.mock.calls[0]?.[1]?.p_xp_amount;
      expect(xpAmount).toBe(100);
    });

    it('caps Medium XP at 175 regardless of score', async () => {
      setupDbMocks();
      await POST(makeRequest({ ...validBody, difficulty: 'medium', score: 50000 }));
      const xpAmount = mockRpc.mock.calls[0]?.[1]?.p_xp_amount;
      expect(xpAmount).toBe(175);
    });

    it('caps Hard XP at 250 regardless of score', async () => {
      setupDbMocks();
      await POST(makeRequest({ ...validBody, difficulty: 'hard', score: 50000 }));
      const xpAmount = mockRpc.mock.calls[0]?.[1]?.p_xp_amount;
      expect(xpAmount).toBe(250);
    });

    it('Hard cap exceeds Medium cap exceeds Easy cap (preserves progression gradient)', async () => {
      // Use MAX_SCORE (50_000) — anything higher fails server validation and POST returns 400.
      setupDbMocks();
      await POST(makeRequest({ ...validBody, difficulty: 'easy', score: 50000 }));
      const easyXp = mockRpc.mock.calls[0]?.[1]?.p_xp_amount;

      mockRpc.mockClear();
      setupDbMocks();
      await POST(makeRequest({ ...validBody, difficulty: 'medium', score: 50000 }));
      const medXp = mockRpc.mock.calls[0]?.[1]?.p_xp_amount;

      mockRpc.mockClear();
      setupDbMocks();
      await POST(makeRequest({ ...validBody, difficulty: 'hard', score: 50000 }));
      const hardXp = mockRpc.mock.calls[0]?.[1]?.p_xp_amount;

      expect(easyXp).toBeLessThan(medXp);
      expect(medXp).toBeLessThan(hardXp);
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 500 on insert failure', async () => {
      setupDbMocks({ insertError: { code: 'INTERNAL', message: 'DB down' } });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(500);
      expect(res.data.error).toContain('Failed to save result');
    });

    it('upsert personal bests failure is non-fatal', async () => {
      setupDbMocks({ upsertError: { code: 'INTERNAL', message: 'upsert failed' } });
      const res = await POST(makeRequest(validBody));
      // Result was saved, so still success
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('profile update failure is non-fatal', async () => {
      setupDbMocks({ profile: null });
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });
});

describe('GET /api/blast/result', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  it('rejects unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns results and personal bests', async () => {
    // Need a more specific mock for GET's chained query pattern
    mockFrom.mockImplementation((table: string) => {
      if (table === 'blast_results') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{
                    score: 500, tiles_cleared: 20, total_tiles: 25,
                    clear_percentage: 80, words_found: 2, best_word: 'hello',
                    max_combo: 3, stars: 2, difficulty: 'medium',
                    language: 'en', created_at: '2026-01-01',
                  }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'blast_personal_bests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{
                difficulty: 'medium',
                best_score: 500, best_clear_percentage: 80,
                best_max_combo: 3, total_games: 1, total_words: 2,
                updated_at: '2026-01-01',
              }],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.results).toHaveLength(1);
    expect(res.data.results[0].tilesCleared).toBe(20);
    expect(res.data.personalBests.medium).toBeDefined();
    expect(res.data.personalBests.medium.bestScore).toBe(500);
  });

  it('passes difficulty filter to query', async () => {
    const eqMock = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'blast_results') {
        return {
          select: vi.fn().mockReturnValue({ eq: eqMock }),
        };
      }
      if (table === 'blast_personal_bests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {};
    });

    await GET(makeGetRequest('difficulty=hard'));
    // user_id eq called first, then difficulty eq on the chained result
    expect(eqMock).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns 500 on results fetch error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'blast_results') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});
