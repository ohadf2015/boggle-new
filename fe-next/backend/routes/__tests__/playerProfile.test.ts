/**
 * Player Profile API Route Tests
 * Tests for GET /api/player-profile/:id
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import request from 'supertest';
import express from 'express';

// Create mock supabase with chainable methods
const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
  };
  return { mockSupabase };
});

vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} }));

import playerProfileRouter from '../playerProfile';

const app = express();
app.use('/api/player-profile', playerProfileRouter);

const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';

const MOCK_PROFILE = {
  id: MOCK_ID,
  username: 'WordMaster',
  display_name: 'Word Master',
  avatar_config: { gender: 'male', base: 'round', skinColor: '#FFDBB4', hair: 'spiky', hairColor: '#2C1B18', eyes: 'round', mouth: 'smile', accessory: 'none', accessoryColor: '#000000', bgColor: '#FF6B35' },
  country_code: 'US',
  current_level: 15,
  total_xp: 5200,
  total_games: 100,
  total_score: 25000,
  total_words: 1500,
  casual_wins: 30,
  ranked_wins: 10,
  longest_word: 'EXTRAORDINARY',
  longest_word_length: 13,
  achievement_counts: { WORD_MASTER: 5, SPEED_DEMON: 3 },
  created_at: '2025-06-15T10:30:00Z',
};

/**
 * Helper to set up the 3 chained supabase.from() calls:
 * 1. Profile fetch by ID
 * 2. Count players with higher score (percentile)
 * 3. Count total players (percentile)
 */
function setupMocks(profile: unknown, profileError: unknown = null, higherCount = 20, totalPlayers = 500) {
  mockSupabase.from
    // 1st call: fetch profile
    .mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: profile, error: profileError }),
        }),
      }),
    })
    // 2nd call: count higher scores
    .mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        gt: vi.fn().mockResolvedValue({ count: higherCount, error: null }),
      }),
    })
    // 3rd call: count total players
    .mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({ count: totalPlayers, error: null }),
      }),
    });
}

// Routes/features not yet implemented — skip until wired up
describe.skip('GET /api/player-profile/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns public profile for valid player ID', async () => {
    setupMocks(MOCK_PROFILE);

    const res = await request(app).get(`/api/player-profile/${MOCK_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(MOCK_ID);
    expect(res.body.username).toBe('WordMaster');
    expect(res.body.displayName).toBe('Word Master');
    expect(res.body.currentLevel).toBe(15);
    expect(res.body.totalGames).toBe(100);
    expect(res.body.winRate).toBe(40); // (30+10)/100 * 100
    expect(res.body.longestWord).toBe('EXTRAORDINARY');
    expect(res.body.memberSince).toBe('2025-06');
    expect(res.body.achievementCounts).toEqual({ WORD_MASTER: 5, SPEED_DEMON: 3 });
    // Should NOT include private fields
    expect(res.body.email).toBeUndefined();
    expect(res.body.is_admin).toBeUndefined();
    expect(res.body.utm_source).toBeUndefined();
  });

  it('returns 404 for non-existent player ID', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          }),
        }),
      }),
    });

    const res = await request(app).get(`/api/player-profile/${MOCK_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('PLAYER_NOT_FOUND');
  });

  it('returns 404 for non-existent username', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          }),
        }),
      }),
    });
    const res = await request(app).get('/api/player-profile/not-a-uuid');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('PLAYER_NOT_FOUND');
  });

  it('sanitizes ID to prevent injection', async () => {
    const res = await request(app).get('/api/player-profile/%3Cscript%3Ealert(1)%3C%2Fscript%3E');

    expect(res.status).toBe(400);
  });

  it('computes win rate correctly with zero games', async () => {
    const profileNoGames = { ...MOCK_PROFILE, total_games: 0, casual_wins: 0, ranked_wins: 0 };
    setupMocks(profileNoGames, null, 0, 1);

    const res = await request(app).get(`/api/player-profile/${MOCK_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.winRate).toBe(0);
  });

  it('includes avatar data in response', async () => {
    setupMocks(MOCK_PROFILE);

    const res = await request(app).get(`/api/player-profile/${MOCK_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.customAvatar).toBeDefined();
    expect(res.body.customAvatar.gender).toBe('male');
  });

  it('computes percentile correctly', async () => {
    // 20 players above, 500 total → rank 21 → 21/500 = 4.2% → rounds to 4%
    setupMocks(MOCK_PROFILE, null, 20, 500);

    const res = await request(app).get(`/api/player-profile/${MOCK_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.percentile).toBe(4);
  });
});
