import { vi, type Mock, } from 'vitest';
// @ts-nocheck

// --- Mock next/server ---
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200, headers: init?.headers })),
  },
}));

// --- Mock customPuzzle utils ---
vi.mock('@/utils/customPuzzle', () => ({
  isValidPuzzleCode: vi.fn((code: string) => /^[a-z0-9]{8}$/.test(code)),
}));

// --- Supabase mock ---
const mockFrom = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { GET } from '../route';

// --- Helpers ---

function makeRequest(puzzleCode = 'abcd1234', query = ''): Request {
  return {
    url: `http://localhost:3000/api/custom-puzzle/${puzzleCode}/stats${query ? `?${query}` : ''}`,
  } as unknown as Request;
}

function makeParams(puzzleCode = 'abcd1234') {
  return { params: Promise.resolve({ puzzleCode }) };
}

const mockStats = {
  puzzle_code: 'abcd1234',
  creator_display_name: 'Creator',
  target_word: 'APPLE',
  language: 'en',
  created_at: '2026-01-01T00:00:00Z',
  creator_efficiency_score: 100,
  total_attempts: 50,
  total_solved: 30,
  solve_rate: 0.6,
  avg_attempts_solved: 3.5,
  avg_efficiency_score: 90,
  max_efficiency_score: 150,
  avg_life_remaining: 20,
  avg_words_discovered: 4,
  beat_creator_count: 10,
  solved_in_1: 5, solved_in_2: 8, solved_in_3: 10,
  solved_in_4: 4, solved_in_5: 2, solved_in_6: 1,
  solved_in_7: 0, solved_in_8: 0, solved_in_9: 0, solved_in_10: 0,
};

describe('GET /api/custom-puzzle/[puzzleCode]/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input validation', () => {
    it('returns 400 for invalid puzzle code format', async () => {
      const res = await GET(makeRequest('INVALID!'), makeParams('INVALID!'));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid puzzle code format');
    });

    it('returns 400 for puzzle code too short', async () => {
      const res = await GET(makeRequest('abc'), makeParams('abc'));
      expect(res.status).toBe(400);
    });
  });

  describe('Puzzle not found / no attempts', () => {
    it('returns 404 when puzzle not found and no stats', async () => {
      // Given: stats view error + puzzle not found
      mockFrom.mockImplementation((table: string) => {
        if (table === 'custom_puzzle_stats') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'no rows' } }),
          };
        }
        if (table === 'custom_puzzles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const res = await GET(makeRequest(), makeParams());
      expect(res.status).toBe(404);
      expect(res.data.error).toBe('Puzzle not found');
    });

    it('returns empty stats when puzzle exists but has no attempts', async () => {
      const mockPuzzleRow = {
        puzzle_code: 'abcd1234',
        creator_display_name: 'Creator',
        target_word: 'APPLE',
        created_at: '2026-01-01T00:00:00Z',
        creator_efficiency_score: 100,
        language: 'en',
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'custom_puzzle_stats') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'no rows' } }),
          };
        }
        if (table === 'custom_puzzles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPuzzleRow, error: null }),
          };
        }
        return {};
      });

      const res = await GET(makeRequest(), makeParams());
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.stats.totalAttempts).toBe(0);
      expect(res.data.stats.totalSolved).toBe(0);
      expect(res.data.stats.solveRate).toBe(0);
      expect(res.data.stats.beatCreatorCount).toBe(0);
      expect(res.data.stats.attemptDistribution).toEqual({});
    });
  });

  describe('Successful response', () => {
    beforeEach(() => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'custom_puzzle_stats') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockStats, error: null }),
          };
        }
        return {};
      });
    });

    it('returns correct stats structure', async () => {
      const res = await GET(makeRequest(), makeParams());

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);

      const { stats } = res.data;
      expect(stats.puzzleCode).toBe('abcd1234');
      expect(stats.creatorDisplayName).toBe('Creator');
      expect(stats.targetWord).toBe('APPLE');
      expect(stats.language).toBe('en');
      expect(stats.totalAttempts).toBe(50);
      expect(stats.totalSolved).toBe(30);
      expect(stats.solveRate).toBe(0.6);
      expect(stats.avgAttemptsSolved).toBe(3.5);
      expect(stats.avgEfficiencyScore).toBe(90);
      expect(stats.maxEfficiencyScore).toBe(150);
      expect(stats.beatCreatorCount).toBe(10);
    });

    it('builds attemptDistribution from solved_in_N fields', async () => {
      const res = await GET(makeRequest(), makeParams());
      const { stats } = res.data;

      expect(stats.attemptDistribution).toEqual({
        '1': 5, '2': 8, '3': 10, '4': 4, '5': 2,
        '6': 1, '7': 0, '8': 0, '9': 0, '10': 0,
      });
    });

    it('includes cache-control headers', async () => {
      const res = await GET(makeRequest(), makeParams());
      expect(res.headers?.['Cache-Control']).toContain('s-maxage=10');
    });
  });

  describe('Personal stats (playerId query param)', () => {
    it('includes yourStats when playerId provided and player has solved', async () => {
      const mockAttempt = {
        solved: true,
        attempts_used: 3,
        efficiency_score: 130,
        completed_at: '2026-01-02T00:00:00Z',
      };
      const mockRank = { rank_position: 2 };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'custom_puzzle_stats') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockStats, error: null }),
          };
        }
        if (table === 'custom_puzzle_attempts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockAttempt, error: null }),
          };
        }
        if (table === 'custom_puzzle_leaderboard') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockRank, error: null }),
          };
        }
        return {};
      });

      const res = await GET(makeRequest('abcd1234', 'playerId=user-1'), makeParams());
      expect(res.status).toBe(200);
      expect(res.data.stats.yourStats).toBeDefined();
      expect(res.data.stats.yourStats.solved).toBe(true);
      expect(res.data.stats.yourStats.efficiencyScore).toBe(130);
      expect(res.data.stats.yourStats.rank).toBe(2);
      expect(res.data.stats.yourStats.beatCreator).toBe(true); // 130 > 100
    });

    it('includes yourStats without rank when player did not solve', async () => {
      const mockAttempt = {
        solved: false,
        attempts_used: 6,
        efficiency_score: 0,
        completed_at: '2026-01-02T00:00:00Z',
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'custom_puzzle_stats') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockStats, error: null }),
          };
        }
        if (table === 'custom_puzzle_attempts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockAttempt, error: null }),
          };
        }
        if (table === 'custom_puzzle_leaderboard') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const res = await GET(makeRequest('abcd1234', 'playerId=user-1'), makeParams());
      expect(res.status).toBe(200);
      expect(res.data.stats.yourStats.solved).toBe(false);
      expect(res.data.stats.yourStats.beatCreator).toBe(false);
    });

    it('does not include yourStats when no playerId or guestFingerprint provided', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'custom_puzzle_stats') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockStats, error: null }),
          };
        }
        return {};
      });

      const res = await GET(makeRequest(), makeParams());
      expect(res.status).toBe(200);
      expect(res.data.stats.yourStats).toBeUndefined();
    });

    it('looks up by guestFingerprint when provided', async () => {
      const mockAttempt = {
        solved: true,
        attempts_used: 4,
        efficiency_score: 90,
        completed_at: '2026-01-02T00:00:00Z',
      };

      const eqMock = vi.fn().mockReturnThis();
      eqMock.mockImplementation(() => ({
        eq: eqMock,
        single: vi.fn().mockResolvedValue({ data: mockAttempt, error: null }),
      }));

      mockFrom.mockImplementation((table: string) => {
        if (table === 'custom_puzzle_stats') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockStats, error: null }),
          };
        }
        if (table === 'custom_puzzle_attempts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockAttempt, error: null }),
          };
        }
        if (table === 'custom_puzzle_leaderboard') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const res = await GET(makeRequest('abcd1234', 'guestFingerprint=fp-abc'), makeParams());
      expect(res.status).toBe(200);
      expect(res.data.stats.yourStats).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('returns 500 on unexpected error', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('unexpected');
      });

      const res = await GET(makeRequest(), makeParams());
      expect(res.status).toBe(500);
      expect(res.data.error).toContain('Internal server error');
    });
  });
});
