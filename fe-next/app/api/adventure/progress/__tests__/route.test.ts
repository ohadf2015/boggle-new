// @ts-nocheck
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

const mockCheckApiRateLimit = jest.fn().mockReturnValue({ success: true });
jest.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
}));

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

jest.mock('@/utils/sentry', () => ({ captureApiError: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

const mockHeaders = { get: jest.fn().mockReturnValue('127.0.0.1') };

function makeGetRequest(): NextRequest {
  return {
    headers: mockHeaders,
  } as unknown as NextRequest;
}

const mockProgressionRow = {
  user_id: 'user-1',
  player_level: 5,
  xp: 1200,
  current_world: 2,
  current_level: 3,
  total_stars: 15,
  gold: 500,
  upgrades: { sword: 2 },
  skill_points: 10,
  skill_tree: { attack: 3 },
  rune_fragments: 5,
  runes: [],
  endless_high_floor: 12,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

const mockCompletionRows = [
  {
    world: 1,
    level: 1,
    stars: 3,
    best_score: 500,
    best_words: 10,
    completed_at: '2026-01-01T00:00:00Z',
  },
];

// ---------- GET Tests ----------

describe('GET /api/adventure/progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
    });
  });

  describe('Happy path', () => {
    it('returns transformed progression with completions', async () => {
      // mockFrom is called twice in Promise.all — once for player_progression, once for level_completions
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // player_progression
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProgressionRow,
                  error: null,
                }),
              }),
            }),
          };
        }
        // level_completions
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockCompletionRows,
                  error: null,
                }),
              }),
            }),
          }),
        };
      });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(200);
      expect(res.data.userId).toBe('user-1');
      expect(res.data.playerLevel).toBe(5);
      expect(res.data.currentWorld).toBe(2);
      expect(res.data.completions).toHaveLength(1);
      expect(res.data.completions[0].stars).toBe(3);
    });
  });

  describe('Initial state', () => {
    it('returns defaults when no progression exists (PGRST116)', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'No rows' },
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(200);
      expect(res.data.userId).toBe('user-1');
      expect(res.data.playerLevel).toBe(1);
      expect(res.data.xp).toBe(0);
      expect(res.data.currentWorld).toBe(1);
    });
  });

  describe('Database errors', () => {
    it('returns 500 on progression error', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'INTERNAL', message: 'DB down' },
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(500);
      expect(res.data.error).toContain('Failed to fetch progression');
    });

    it('returns 500 on completions error', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProgressionRow,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'INTERNAL', message: 'DB down' },
                }),
              }),
            }),
          }),
        };
      });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(500);
      expect(res.data.error).toContain('Failed to fetch completions');
    });
  });
});

// ---------- POST Tests ----------

describe('POST /api/adventure/progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await POST();
      expect(res.status).toBe(401);
    });
  });

  describe('Happy path', () => {
    it('creates progression and returns 201', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Check existing
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          };
        }
        // Insert
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  user_id: 'user-1',
                  player_level: 1,
                  xp: 0,
                  current_world: 1,
                  current_level: 1,
                  total_stars: 0,
                  gold: 0,
                  upgrades: {},
                  skill_points: 0,
                  skill_tree: {},
                  rune_fragments: 0,
                  runes: [],
                  created_at: '2026-01-01T00:00:00Z',
                  updated_at: '2026-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        };
      });

      const res = await POST();
      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.progression.userId).toBe('user-1');
    });
  });

  describe('Conflict', () => {
    it('returns 409 when progression already exists', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { user_id: 'user-1' },
              error: null,
            }),
          }),
        }),
      });

      const res = await POST();
      expect(res.status).toBe(409);
      expect(res.data.error).toContain('already exists');
    });
  });

  describe('Database errors', () => {
    it('returns 500 on insert error', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Insert failed' },
              }),
            }),
          }),
        };
      });

      const res = await POST();
      expect(res.status).toBe(500);
      expect(res.data.error).toContain('Failed to create progression');
    });
  });
});
