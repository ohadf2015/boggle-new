import { vi, type Mock, } from 'vitest';
// @ts-nocheck

// --- Mock next/server ---
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

// --- Mock rate limiter ---
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));

// --- Mock sentry ---
vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

// --- Mock customPuzzle utils ---
vi.mock('@/utils/customPuzzle', () => ({
  isValidPuzzleCode: vi.fn((code: string) => /^[a-z0-9]{8}$/.test(code)),
  calculateCustomPuzzleScore: vi.fn(() => 120),
}));

// --- Supabase mock ---
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
// total_plays is incremented here (moved off the unauthenticated GET, which was
// CSRF-able). Held at module scope so tests can assert on the write.
const mockUpdatePlays = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { calculateCustomPuzzleScore } from '@/utils/customPuzzle';

// --- Helpers ---

function makeRequest(body: unknown, ip = '127.0.0.1'): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: { get: vi.fn().mockReturnValue(ip) },
  } as unknown as NextRequest;
}

function makeParams(puzzleCode = 'abcd1234') {
  return { params: Promise.resolve({ puzzleCode }) };
}

const validBody = {
  displayName: 'TestPlayer',
  solved: true,
  attemptsUsed: 3,
  targetWord: 'APPLE',
  attemptWords: [
    { word: 'GRAPE', feedback: [], timestamp: 1000 },
    { word: 'AROSE', feedback: [], timestamp: 2000 },
    { word: 'APPLE', feedback: [], timestamp: 3000 },
  ],
};

const mockPuzzle = {
  id: 'puzzle-uuid-1',
  puzzle_code: 'abcd1234',
  target_word: 'APPLE',
  creator_id: 'creator-user-id',
  creator_guest_fingerprint: null,
  creator_efficiency_score: 100,
  total_plays: 7,
};

const mockAttemptData = {
  id: 'attempt-uuid-1',
  puzzle_id: 'puzzle-uuid-1',
  display_name: 'TestPlayer',
  solved: true,
  attempts_used: 3,
  efficiency_score: 120,
};

function setupDefaultMocks({
  puzzle = mockPuzzle,
  puzzleError = null,
  insertError = null,
  insertData = mockAttemptData,
  profileData = null,
  user = { id: 'user-1' },
  playCountError = null as { message: string } | null,
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'custom_puzzles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: puzzle, error: puzzleError }),
        update: (values: unknown) => {
          mockUpdatePlays(values);
          return { eq: vi.fn().mockResolvedValue({ error: playCountError }) };
        },
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: profileData, error: null }),
      };
    }
    if (table === 'custom_puzzle_attempts') {
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: insertData, error: insertError }),
      };
    }
    return {};
  });
}

describe('POST /api/custom-puzzle/[puzzleCode]/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {

      checkApiRateLimit.mockReturnValueOnce({ success: false });

      const res = await POST(makeRequest(validBody), makeParams());
      expect(res.status).toBe(429);
      expect(res.data.error).toBe('Too many requests');
    });
  });

  describe('Input validation', () => {
    it('returns 400 for invalid puzzle code format', async () => {
      // Given: puzzle code with invalid characters (uppercase)
      const res = await POST(makeRequest(validBody), makeParams('INVALID!'));
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid puzzle code format');
    });

    it('returns 400 when displayName is missing', async () => {
      const { displayName, ...bodyWithoutName } = validBody;
      const res = await POST(makeRequest(bodyWithoutName), makeParams());
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Missing required fields');
    });

    it('returns 400 when targetWord is missing', async () => {
      const { targetWord, ...body } = validBody;
      const res = await POST(makeRequest(body), makeParams());
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Missing required fields');
    });

    it('returns 400 when attemptsUsed is missing', async () => {
      const { attemptsUsed, ...body } = validBody;
      const res = await POST(makeRequest(body), makeParams());
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Missing required fields');
    });

    it('returns 400 when attemptsUsed is 0', async () => {
      const res = await POST(makeRequest({ ...validBody, attemptsUsed: 0 }), makeParams());
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Attempts must be between 1 and 10');
    });

    it('returns 400 when attemptsUsed exceeds 10', async () => {
      const res = await POST(makeRequest({ ...validBody, attemptsUsed: 11 }), makeParams());
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Attempts must be between 1 and 10');
    });
  });

  describe('Puzzle lookup', () => {
    it('returns 404 when puzzle does not exist', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'custom_puzzles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const res = await POST(makeRequest(validBody), makeParams());
      expect(res.status).toBe(404);
      expect(res.data.error).toBe('Puzzle not found');
    });

    it('returns 400 when targetWord does not match puzzle', async () => {
      setupDefaultMocks({ puzzle: { ...mockPuzzle, target_word: 'GRAPE' } });

      const res = await POST(makeRequest(validBody), makeParams()); // body has targetWord: APPLE
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('Invalid target word');
    });
  });

  // total_plays used to be incremented by the unauthenticated GET, which made it
  // CSRF-able from any third-party <img src> and re-fired on prefetch. It now
  // lives here, on the rate-limited POST that runs once per real play.
  describe('Play counter', () => {
    it('increments total_plays on a successful submission', async () => {
      setupDefaultMocks();

      const res = await POST(makeRequest(validBody), makeParams());

      expect(res.status).toBe(200);
      expect(mockUpdatePlays).toHaveBeenCalledWith({ total_plays: 8 }); // fixture has 7
    });

    it('still returns 200 when the counter write fails — the attempt is already saved', async () => {
      setupDefaultMocks({ playCountError: { message: 'db down' } });

      const res = await POST(makeRequest(validBody), makeParams());

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });

  describe('Successful submission', () => {
    it('returns success with efficiency score and beatCreator flag', async () => {
      setupDefaultMocks();

      const res = await POST(makeRequest(validBody), makeParams());
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.efficiencyScore).toBe(120); // from mock calculateCustomPuzzleScore
      expect(res.data.beatCreator).toBe(true); // 120 > creator_efficiency_score(100)
    });

    it('marks beatCreator as false when efficiency score does not exceed creator score', async () => {

      calculateCustomPuzzleScore.mockReturnValueOnce(80); // below creator's 100

      setupDefaultMocks();

      const res = await POST(makeRequest(validBody), makeParams());
      expect(res.status).toBe(200);
      expect(res.data.beatCreator).toBe(false);
    });

    it('returns alreadySubmitted true on unique constraint violation', async () => {
      setupDefaultMocks({ insertError: { code: '23505', message: 'duplicate key' }, insertData: null });

      const res = await POST(makeRequest(validBody), makeParams());
      expect(res.status).toBe(200);
      expect(res.data.alreadySubmitted).toBe(true);
    });

    it('server recalculates efficiency score ignoring client value', async () => {

      setupDefaultMocks();

      await POST(makeRequest({ ...validBody, efficiencyScore: 9999 }), makeParams());

      // calculateCustomPuzzleScore should have been called server-side
      expect(calculateCustomPuzzleScore).toHaveBeenCalled();
    });

    it('works for guest user (unauthenticated)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'custom_puzzles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPuzzle, error: null }),
          };
        }
        if (table === 'custom_puzzle_attempts') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockAttemptData, error: null }),
          };
        }
        return {};
      });

      const res = await POST(
        makeRequest({ ...validBody, guestFingerprint: 'guest-fp-123' }),
        makeParams()
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });

  describe('Database errors', () => {
    it('returns 500 on non-duplicate insert error', async () => {
      setupDefaultMocks({ insertError: { code: 'INTERNAL', message: 'db down' }, insertData: null });

      const res = await POST(makeRequest(validBody), makeParams());
      expect(res.status).toBe(500);
      expect(res.data.error).toContain('Failed to submit attempt');
    });
  });

  describe('Survival mode fields', () => {
    it('accepts optional survival mode fields', async () => {
      setupDefaultMocks();

      const survivalBody = {
        ...validBody,
        wordsDiscovered: [{ word: 'cat', timestamp: 1000, lifeGained: 1, tokensGained: 2 }],
        lifeRemaining: 30,
        clueTokensEarned: 5,
        clueTokensSpent: 2,
        hintsUnlocked: 1,
      };

      const res = await POST(makeRequest(survivalBody), makeParams());
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });
});
