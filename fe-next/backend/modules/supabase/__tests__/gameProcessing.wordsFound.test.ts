/**
 * Test: recorded multiplayer results must carry the REAL words each player found.
 *
 * Regression guard for the admin game-logs dashboard. The per-player `words`
 * list (game_sessions.words_found shape) used to never be threaded from the
 * scoring word details into the persisted result, so guest games showed
 * "0 words found" and no longest word. recordGameResultsToSupabase must now
 * build that list (validated words only) and pass it to processGameResults,
 * which forwards it to logGameSession.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { processGameResults } = vi.hoisted(() => ({
  processGameResults: vi.fn(async () => ({ xpResults: {}, lifetimeAchievements: {} })),
}));

vi.mock('../../../modules/supabaseServer', () => ({
  processGameResults,
  isSupabaseConfigured: () => true,
}));
vi.mock('../../../modules/pushNotificationTriggers', () => ({
  notifyLevelUp: vi.fn(),
  notifyAchievementsBatch: vi.fn(),
  getUserLocalesBatch: vi.fn(async () => new Map()),
}));
vi.mock('../../../handlers/engagementHandler', () => ({
  processGameEndEngagement: vi.fn(async () => {}),
  processAchievementEngagement: vi.fn(async () => {}),
}));
vi.mock('../../../modules/weeklyQuestManager', () => ({ updateQuestProgress: vi.fn(async () => {}) }));
vi.mock('../../../modules/dailyMissionsManager', () => ({ completeMissionForMode: vi.fn(async () => {}) }));
vi.mock('../../../modules/supabase/rankedMmr', () => ({
  updateRankedMmr: vi.fn(async () => {}),
  fetchRankedBaselines: vi.fn(async () => new Map()),
}));
vi.mock('../../../redis/wordApproval', () => ({ incrementWordApproval: vi.fn(async () => {}) }));
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => null }));
vi.mock('../../../utils/socketHelpers', () => ({
  getSocketById: () => null,
  safeEmit: vi.fn(),
  getGameRoom: () => 'room',
  broadcastToRoom: vi.fn(),
}));
vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { recordGameResultsToSupabase } from '../../../services/gameLifecycle/gameResults';

function gameWith(users: Record<string, { isBot?: boolean; authUserId?: string; guestSessionId?: string }>) {
  return { users, language: 'en', isRanked: false, timerSeconds: 90, gameMode: 'classic' } as never;
}

describe('recordGameResultsToSupabase — words threading', () => {
  beforeEach(() => vi.clearAllMocks());

  it('threads validated words into the mapped scores passed to processGameResults', async () => {
    const scores = [
      {
        username: 'Alice',
        totalScore: 120,
        achievements: [],
        wordDetails: [
          { word: 'cat', score: 30, validated: true, timestamp: 1 },
          { word: 'house', score: 90, validated: true, timestamp: 2 },
        ],
      },
    ];

    await recordGameResultsToSupabase(
      {} as never,
      'GAME1',
      scores as never,
      gameWith({ Alice: { authUserId: 'user-alice' } })
    );

    expect(processGameResults).toHaveBeenCalledTimes(1);
    const mapped = (processGameResults.mock.calls[0] as unknown[])[1] as Array<{ username: string; words?: unknown }>;
    expect(mapped[0].words).toEqual([
      { word: 'cat', points: 30, length: 3, timestamp: 1 },
      { word: 'house', points: 90, length: 5, timestamp: 2 },
    ]);
  });

  it('excludes non-validated words from the persisted words list', async () => {
    const scores = [
      {
        username: 'Bob',
        totalScore: 30,
        achievements: [],
        wordDetails: [
          { word: 'cat', score: 30, validated: true, timestamp: 1 },
          { word: 'zzz', score: 0, validated: false, timestamp: 2 },
        ],
      },
    ];

    await recordGameResultsToSupabase(
      {} as never,
      'GAME2',
      scores as never,
      gameWith({ Bob: { guestSessionId: 'guest-bob' } })
    );

    const mapped = (processGameResults.mock.calls[0] as unknown[])[1] as Array<{ words?: Array<{ word: string }> }>;
    expect(mapped[0].words).toEqual([{ word: 'cat', points: 30, length: 3, timestamp: 1 }]);
  });
});
