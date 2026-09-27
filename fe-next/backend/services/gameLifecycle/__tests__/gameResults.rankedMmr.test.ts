/**
 * TDD tests: ranked MMR baseline is fetched and passed to updateRankedMmr.
 * Previously, gameResults built RankedParticipant[] without currentMmr/rd/
 * gamesPlayed, causing updateRankedMmr to default every player to 1000.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProcessGameResults = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ success: true, xpResults: {}, lifetimeAchievements: {} })
);
const mockIsSupabaseConfigured = vi.hoisted(() => vi.fn(() => true));
const mockUpdateRankedMmr = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockFetchRankedBaselines = vi.hoisted(() => vi.fn());
const mockGetSocketById = vi.hoisted(() => vi.fn());
const mockSafeEmit = vi.hoisted(() => vi.fn());
const mockUpdateQuestProgress = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockIncrementWordApproval = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockProcessGameEndEngagement = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockProcessAchievementEngagement = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotifyLevelUp = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotifyAchievement = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../../../modules/supabaseServer', () => ({
  processGameResults: mockProcessGameResults,
  isSupabaseConfigured: mockIsSupabaseConfigured,
}));
vi.mock('../../../modules/supabase/rankedMmr', () => ({
  updateRankedMmr: mockUpdateRankedMmr,
  fetchRankedBaselines: mockFetchRankedBaselines,
}));
vi.mock('../../../utils/socketHelpers', () => ({
  getSocketById: mockGetSocketById,
  safeEmit: mockSafeEmit,
}));
vi.mock('../../../modules/weeklyQuestManager', () => ({
  updateQuestProgress: mockUpdateQuestProgress,
}));
vi.mock('../../../redis/wordApproval', () => ({
  incrementWordApproval: mockIncrementWordApproval,
}));
vi.mock('../../../handlers/engagementHandler', () => ({
  processGameEndEngagement: mockProcessGameEndEngagement,
  processAchievementEngagement: mockProcessAchievementEngagement,
}));
vi.mock('../../../modules/pushNotificationTriggers', () => ({
  notifyLevelUp: mockNotifyLevelUp,
  notifyAchievement: mockNotifyAchievement,
}));
vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { recordGameResultsToSupabase } from '../gameResults';

const AUTH_A = 'auth-a';
const AUTH_B = 'auth-b';

function makeGame() {
  return {
    language: 'en',
    isRanked: true,
    timerSeconds: 60,
    gameMode: 'classic',
    users: {
      alice: { socketId: 's1', authUserId: AUTH_A },
      bob: { socketId: 's2', authUserId: AUTH_B },
    },
  } as any;
}

const io = {} as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSupabaseConfigured.mockReturnValue(true);
});

describe('gameResults — ranked MMR baseline', () => {
  it('fetches existing MMR for each player and forwards it to updateRankedMmr', async () => {
    mockFetchRankedBaselines.mockResolvedValue(
      new Map([
        [AUTH_A, { currentMmr: 1350, peakMmr: 1400, rd: 200, gamesPlayed: 12 }],
        [AUTH_B, { currentMmr: 1180, peakMmr: 1200, rd: 250, gamesPlayed: 6 }],
      ])
    );

    const scores = [
      { username: 'alice', totalScore: 200, wordDetails: [], achievements: [] },
      { username: 'bob', totalScore: 120, wordDetails: [], achievements: [] },
    ];

    await recordGameResultsToSupabase(io, 'G1', scores as any, makeGame());

    expect(mockFetchRankedBaselines).toHaveBeenCalledWith(
      expect.arrayContaining([AUTH_A, AUTH_B])
    );
    expect(mockUpdateRankedMmr).toHaveBeenCalledOnce();
    const passed = mockUpdateRankedMmr.mock.calls[0][0] as any[];
    const alice = passed.find(p => p.playerId === AUTH_A);
    const bob = passed.find(p => p.playerId === AUTH_B);
    expect(alice).toMatchObject({ currentMmr: 1350, peakMmr: 1400, rd: 200, gamesPlayed: 12, placement: 1 });
    expect(bob).toMatchObject({ currentMmr: 1180, peakMmr: 1200, rd: 250, gamesPlayed: 6, placement: 2 });
  });

  it('falls back to DEFAULT_RATING (1000) for players without a baseline row', async () => {
    mockFetchRankedBaselines.mockResolvedValue(new Map());

    const scores = [
      { username: 'alice', totalScore: 200, wordDetails: [], achievements: [] },
      { username: 'bob', totalScore: 120, wordDetails: [], achievements: [] },
    ];

    await recordGameResultsToSupabase(io, 'G1', scores as any, makeGame());

    expect(mockUpdateRankedMmr).toHaveBeenCalledOnce();
    const passed = mockUpdateRankedMmr.mock.calls[0][0] as any[];
    for (const p of passed) {
      expect(p.currentMmr).toBe(1000);
      expect(p.gamesPlayed).toBe(0);
    }
  });
});
