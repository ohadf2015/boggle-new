/**
 * Tests for player-detail service: composes profile + recent games +
 * aggregates + season score for the admin drill-down page.
 */

const { profileSingle, gamesLimit, seasonLimit, sessionsLimit, mockSupabase } = vi.hoisted(() => {
  const profileSingle = vi.fn();
  const gamesLimit = vi.fn();
  const seasonLimit = vi.fn();
  const sessionsLimit = vi.fn();

  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({ single: profileSingle }),
          }),
        };
      }
      if (table === 'game_results') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({ limit: gamesLimit }),
            }),
          }),
        };
      }
      if (table === 'season_leaderboards') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({ limit: seasonLimit }),
            }),
          }),
        };
      }
      if (table === 'game_sessions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({ limit: sessionsLimit }),
            }),
          }),
        };
      }
      return {} as never;
    }),
  };

  return { profileSingle, gamesLimit, seasonLimit, sessionsLimit, mockSupabase };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

import { vi } from 'vitest';
import { fetchPlayerDetail } from '../playerDetailRoutes';

const PROFILE_ROW = {
  id: 'p1', username: 'alice', display_name: 'Alice',
  avatar_emoji: null, avatar_color: null, avatar_image: null, avatar_config: null,
  total_score: 1234, total_games: 50, total_words: 600, total_time_played: 7200,
  total_xp: 9500, current_level: 12,
  casual_games: 30, ranked_games: 20, casual_wins: 18, ranked_wins: 11,
  ranked_mmr: 1450, peak_mmr: 1500,
  longest_word: 'lexicographer', longest_word_length: 13,
  total_coins: 200, lifetime_coins_earned: 1500, total_hints_used: 4,
  prestige_level: 0, prestige_multiplier: 1,
  country_code: 'IL', referral_count: 2, user_role: 'player', is_admin: false, blast_access: false,
  daily_email_subscribed: true,
  last_seen_at: '2026-05-04T10:00:00Z',
  last_game_at: '2026-05-04T09:30:00Z',
  created_at: '2026-01-01T00:00:00Z',
  utm_source: 'google', utm_medium: null, utm_campaign: null, referrer: null,
};

const GAME_ROWS = [
  { id: 'g1', game_code: 'ABCD', score: 200, word_count: 25, placement: 1, is_ranked: true, language: 'en', time_played: 180, created_at: '2026-05-04T09:30:00Z' },
  { id: 'g2', game_code: 'EFGH', score: 150, word_count: 18, placement: 2, is_ranked: false, language: 'en', time_played: 120, created_at: '2026-05-03T18:00:00Z' },
  { id: 'g3', game_code: 'IJKL', score: 90, word_count: 12, placement: 4, is_ranked: false, language: 'he', time_played: 90, created_at: '2026-05-02T12:00:00Z' },
];

describe('fetchPlayerDetail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns profile + recent games + aggregates + season', async () => {
    profileSingle.mockResolvedValue({ data: PROFILE_ROW, error: null });
    gamesLimit.mockResolvedValue({ data: GAME_ROWS, error: null });
    seasonLimit.mockResolvedValue({ data: [{ season_id: 5, season_score: 880 }], error: null });
    sessionsLimit.mockResolvedValue({ data: [], error: null });

    const result = await fetchPlayerDetail(mockSupabase as never, 'p1');

    expect(result.profile?.id).toBe('p1');
    expect(result.recentGames).toHaveLength(3);

    expect(result.aggregates.games).toBe(3);
    expect(result.aggregates.totalScore).toBe(440);
    expect(result.aggregates.avgScore).toBe(147);
    expect(result.aggregates.ranked).toBe(1);
    expect(result.aggregates.casual).toBe(2);
    expect(result.aggregates.byLanguage).toEqual([
      { language: 'en', count: 2 },
      { language: 'he', count: 1 },
    ]);

    expect(result.season).toEqual({ id: 5, score: 880 });
  });

  it('aggregates game_sessions into a per-mode breakdown', async () => {
    profileSingle.mockResolvedValue({ data: PROFILE_ROW, error: null });
    gamesLimit.mockResolvedValue({ data: GAME_ROWS, error: null });
    seasonLimit.mockResolvedValue({ data: [], error: null });
    sessionsLimit.mockResolvedValue({
      data: [
        { mode: 'singleplayer', score: 100, duration_seconds: 60, completed: true },
        { mode: 'singleplayer', score: 200, duration_seconds: 90, completed: true },
        { mode: 'multiplayer', score: 150, duration_seconds: 120, completed: true },
        { mode: 'daily_challenge', score: 80, duration_seconds: 45, completed: false },
      ],
      error: null,
    });

    const result = await fetchPlayerDetail(mockSupabase as never, 'p1');

    expect(result.modeBreakdown).toEqual([
      // sorted by count desc
      { mode: 'singleplayer', count: 2, totalScore: 300, avgScore: 150, completed: 2 },
      { mode: 'multiplayer', count: 1, totalScore: 150, avgScore: 150, completed: 1 },
      { mode: 'daily_challenge', count: 1, totalScore: 80, avgScore: 80, completed: 0 },
    ]);
  });

  it('returns empty modeBreakdown when game_sessions table errors', async () => {
    profileSingle.mockResolvedValue({ data: PROFILE_ROW, error: null });
    gamesLimit.mockResolvedValue({ data: [], error: null });
    seasonLimit.mockResolvedValue({ data: [], error: null });
    sessionsLimit.mockResolvedValue({ data: null, error: { message: 'no such table' } });

    const result = await fetchPlayerDetail(mockSupabase as never, 'p1');

    expect(result.modeBreakdown).toEqual([]);
  });

  it('returns empty aggregates when there are no games', async () => {
    profileSingle.mockResolvedValue({ data: PROFILE_ROW, error: null });
    gamesLimit.mockResolvedValue({ data: [], error: null });
    seasonLimit.mockResolvedValue({ data: [], error: null });
    sessionsLimit.mockResolvedValue({ data: [], error: null });

    const result = await fetchPlayerDetail(mockSupabase as never, 'p1');

    expect(result.recentGames).toEqual([]);
    expect(result.aggregates.games).toBe(0);
    expect(result.aggregates.avgScore).toBe(0);
    expect(result.aggregates.byLanguage).toEqual([]);
    expect(result.season).toBeNull();
    expect(result.modeBreakdown).toEqual([]);
  });

  it('returns null profile when the player is not found', async () => {
    profileSingle.mockResolvedValue({ data: null, error: { message: 'PGRST116' } });
    gamesLimit.mockResolvedValue({ data: [], error: null });
    seasonLimit.mockResolvedValue({ data: [], error: null });
    sessionsLimit.mockResolvedValue({ data: [], error: null });

    const result = await fetchPlayerDetail(mockSupabase as never, 'nope');

    expect(result.profile).toBeNull();
  });

  it('does not fail when the season_leaderboards table errors', async () => {
    profileSingle.mockResolvedValue({ data: PROFILE_ROW, error: null });
    gamesLimit.mockResolvedValue({ data: GAME_ROWS, error: null });
    seasonLimit.mockResolvedValue({ data: null, error: { message: 'relation does not exist' } });
    sessionsLimit.mockResolvedValue({ data: [], error: null });

    const result = await fetchPlayerDetail(mockSupabase as never, 'p1');

    expect(result.profile?.id).toBe('p1');
    expect(result.season).toBeNull();
    expect(result.aggregates.games).toBe(3);
  });
});
