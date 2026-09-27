import { vi } from 'vitest';
// @ts-nocheck
/**
 * record-game leaderboard weighting + daily double-count fix.
 *
 *  - Casual single-player credits a DOWN-WEIGHTED amount to total_score
 *    (CASUAL_LEADERBOARD_WEIGHT) so the Daily Challenge stays dominant.
 *  - Daily games (mode 'daily-challenge' / isDailyChallenge) must NOT write
 *    total_score / total_games here — the validated /word-hunt/submit route
 *    owns daily competitive stats. Recording them here too double-counts.
 *  - XP is still awarded for daily (submit does not award XP).
 */
import { CASUAL_LEADERBOARD_WEIGHT } from '@/backend/modules/leaderboardScoring';

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })) },
}));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn().mockReturnValue({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/modules/achievementManager', () => ({ checkLifetimeAchievements: vi.fn(() => []) }));
vi.mock('@/backend/modules/weeklyQuestManager', () => ({ updateQuestProgress: vi.fn().mockResolvedValue(null) }));

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const profileRow = {
  total_games: 10, total_score: 1000, total_words: 50, total_time_played: 0,
  total_xp: 500, current_level: 3, player_title: null, longest_word: '', longest_word_length: 0,
  last_game_at: null, unique_days_played: 2, achievement_counts: {},
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: profileRow, error: null }) })) })),
      update: (...args: unknown[]) => mockUpdate(...args),
    })),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

import { POST } from '../route';

function makeRequest(body: unknown) {
  return { json: () => Promise.resolve(body), headers: { get: vi.fn().mockReturnValue('127.0.0.1') } } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
  mockRpc.mockResolvedValue({ data: [{ new_total_xp: 600, new_level: 3, xp_granted: 100 }], error: null });
});

/** The first profiles.update call carries the stat increments. */
function firstStatUpdate() {
  return mockUpdate.mock.calls.map((c) => c[0]).find((u) => u && ('total_score' in u || 'last_game_at' in u));
}

describe('POST /api/stats/record-game — leaderboard weighting', () => {
  it('down-weights casual single-player total_score', async () => {
    await POST(makeRequest({ score: 100, wordCount: 8, mode: 'solo-bots' }));
    const upd = firstStatUpdate();
    expect(upd.total_score).toBe(1000 + Math.round(100 * CASUAL_LEADERBOARD_WEIGHT));
    expect(upd.total_games).toBe(11);
  });

  it('does NOT write total_score / total_games for the daily challenge (no double-count)', async () => {
    await POST(makeRequest({ score: 100, wordCount: 8, mode: 'daily-challenge', isDailyChallenge: true }));
    const upd = firstStatUpdate();
    expect(upd).toBeDefined();
    expect('total_score' in upd).toBe(false);
    expect('total_games' in upd).toBe(false);
  });

  it('still awards XP for the daily challenge', async () => {
    await POST(makeRequest({ score: 100, wordCount: 8, mode: 'daily-challenge', isDailyChallenge: true }));
    expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', expect.objectContaining({ p_player_id: 'u-1' }));
  });
});
