import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * Adventure State API Route Tests
 *
 * Covers auth, happy path (with data + empty), DB errors.
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

// Mock supabase server client (auth + data queries on the same client)
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock sentry
vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';

// ---------- Helpers ----------

const mockHeaders = { get: vi.fn().mockReturnValue('127.0.0.1') };

function makeGetRequest() {
  return { headers: mockHeaders } as unknown as NextRequest;
}

const mockProgressionRow = {
  user_id: 'user-1',
  player_level: 5,
  xp: 450,
  current_world: 3,
  current_level: 2,
  total_stars: 30,
  gold: 500,
  upgrades: { luckyPickaxe: 1 },
  skill_points: 2,
  skill_tree: {},
  rune_fragments: 0,
  runes: [],
  chapter_quest_progress: {},
  word_album: ['hello'],
  word_album_claimed_milestones: [10],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

const mockCompletionRows = [
  {
    world: 1,
    level: 1,
    stars: 3,
    best_score: 500,
    best_words: 12,
    completed_at: '2026-01-10T00:00:00Z',
  },
  {
    world: 1,
    level: 2,
    stars: 2,
    best_score: 300,
    best_words: 8,
    completed_at: '2026-01-11T00:00:00Z',
  },
];

const mockAttemptRows = [
  {
    world: 3,
    level: 2,
    best_words: 5,
    best_score: 200,
    best_time_remaining: 30,
    objective_progress: {},
    attempt_count: 3,
    consecutive_failures: 1,
    first_attempt_at: '2026-03-01T00:00:00Z',
    last_attempt_at: '2026-03-01T12:00:00Z',
  },
];

function setupDbMocks({
  progressionData = mockProgressionRow as Record<string, unknown> | null,
  progressionError = null as { code?: string; message?: string } | null,
  completionsData = mockCompletionRows as Record<string, unknown>[] | null,
  completionsError = null as { code?: string; message?: string } | null,
  attemptsData = mockAttemptRows as Record<string, unknown>[] | null,
  attemptsError = null as { code?: string; message?: string } | null,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'player_progression') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: progressionData,
              error: progressionError,
            }),
          }),
        }),
      };
    }
    if (table === 'level_completions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: completionsData,
                error: completionsError,
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'level_attempts') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: attemptsData,
                error: attemptsError,
              }),
            }),
          }),
        }),
      };
    }
    return {};
  });
}

// ---------- Tests ----------

describe('GET /api/adventure/state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  // ===== AUTH =====
  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await GET();
      expect(res.status).toBe(401);
      expect(res.data.error).toBe('Unauthorized');
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('returns 200 with progression, completions, and attempts', async () => {
      setupDbMocks();

      const res = await GET();
      expect(res.status).toBe(200);

      // Progression transformed correctly
      expect(res.data.progression.userId).toBe('user-1');
      expect(res.data.progression.playerLevel).toBe(5);
      expect(res.data.progression.xp).toBe(450);
      expect(res.data.progression.currentWorld).toBe(3);
      expect(res.data.progression.currentLevel).toBe(2);
      expect(res.data.progression.totalStars).toBe(30);
      expect(res.data.progression.gold).toBe(500);
      expect(res.data.progression.upgrades).toEqual({ luckyPickaxe: 1 });

      // Completions transformed correctly
      expect(res.data.progression.completions).toHaveLength(2);
      expect(res.data.progression.completions[0].world).toBe(1);
      expect(res.data.progression.completions[0].level).toBe(1);
      expect(res.data.progression.completions[0].stars).toBe(3);
      expect(res.data.progression.completions[0].bestScore).toBe(500);

      // Attempts transformed correctly
      expect(res.data.attempts).toHaveLength(1);
      expect(res.data.attempts[0].world).toBe(3);
      expect(res.data.attempts[0].level).toBe(2);
      expect(res.data.attempts[0].attemptCount).toBe(3);
    });

    it('returns 200 with initial state for new user (no progression)', async () => {
      setupDbMocks({
        progressionData: null,
        progressionError: { code: 'PGRST116', message: 'not found' },
        completionsData: [],
        attemptsData: [],
      });

      const res = await GET();
      expect(res.status).toBe(200);

      // Initial state for new user
      expect(res.data.progression.playerLevel).toBe(1);
      expect(res.data.progression.xp).toBe(0);
      expect(res.data.progression.currentWorld).toBe(1);
      expect(res.data.progression.currentLevel).toBe(1);
      expect(res.data.progression.totalStars).toBe(0);
      expect(res.data.progression.gold).toBe(0);
      expect(res.data.progression.completions).toEqual([]);
      expect(res.data.attempts).toEqual([]);
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 500 on progression fetch error', async () => {
      setupDbMocks({
        progressionError: { code: 'INTERNAL', message: 'DB down' },
      });

      const res = await GET();
      expect(res.status).toBe(500);
      expect(res.data.error).toBe('Failed to fetch progression');
    });

    it('returns 500 on completions fetch error', async () => {
      setupDbMocks({
        completionsError: { code: 'INTERNAL', message: 'DB down' },
      });

      const res = await GET();
      expect(res.status).toBe(500);
      expect(res.data.error).toBe('Failed to fetch completions');
    });

    it('gracefully handles attempts fetch error (returns empty attempts)', async () => {
      setupDbMocks({
        attemptsError: { code: 'INTERNAL', message: 'table missing' },
      });

      const res = await GET();
      expect(res.status).toBe(200);
      expect(res.data.attempts).toEqual([]);
    });
  });
});
