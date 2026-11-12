import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({
  notifyLevelUp: vi.fn().mockResolvedValue(undefined),
  processGameResults: vi.fn(),
  getSocketById: vi.fn(),
  safeEmit: vi.fn(),
  updateQuestProgress: vi.fn(),
  completeDaily: vi.fn(),
}));

vi.mock('../../../modules/pushNotificationTriggers', () => ({
  notifyLevelUp: m.notifyLevelUp,
  notifyAchievementsBatch: vi.fn().mockResolvedValue(undefined),
  getUserLocalesBatch: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock('../../../modules/supabaseServer', () => ({
  processGameResults: m.processGameResults,
  isSupabaseConfigured: () => true,
}));
vi.mock('../../../utils/socketHelpers', () => ({ getSocketById: m.getSocketById, safeEmit: m.safeEmit }));
vi.mock('../../../modules/weeklyQuestManager', () => ({ updateQuestProgress: m.updateQuestProgress }));
vi.mock('../../../modules/dailyMissionsManager', () => ({
  completeDailyQuestsForResult: (...a: unknown[]) => m.completeDaily(...a),
}));
vi.mock('../../../redis/wordApproval', () => ({ incrementWordApproval: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../handlers/engagementHandler', () => ({
  processGameEndEngagement: vi.fn().mockResolvedValue(undefined),
  processAchievementEngagement: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../modules/supabase/rankedMmr', () => ({ updateRankedMmr: vi.fn(), fetchRankedBaselines: vi.fn() }));
vi.mock('../../../utils/logger', () => ({ default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { recordGameResultsToSupabase } from '../gameResults';

const USER = 'auth-1';
const NAME = 'alice';
const socket = { id: 'socket-1', disconnected: false };

function game(mode = 'classic') {
  return {
    language: 'en',
    gameMode: mode,
    users: {
      [NAME]: { socketId: 'socket-1', authUserId: USER },
      Botty: { isBot: true },
    },
  } as never;
}

const scores = [
  { username: NAME, totalScore: 120, wordDetails: [], achievements: [] },
  { username: 'Botty', totalScore: 80, wordDetails: [], achievements: [] },
] as never;

function gameXp(oldLevel: number, newLevel: number) {
  return {
    success: true,
    lifetimeAchievements: {},
    xpResults: {
      [NAME]: {
        socketId: 'socket-1', xpEarned: 50, xpBreakdown: {}, newTotalXp: 500,
        oldLevel, newLevel, levelsGained: newLevel - oldLevel, leveledUp: newLevel > oldLevel, newTitles: [],
      },
    },
  };
}

const levelUpEmits = () => m.safeEmit.mock.calls.filter((c) => c[1] === 'levelUp').map((c) => c[2]);
const settle = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};

beforeEach(() => {
  vi.clearAllMocks();
  m.getSocketById.mockReturnValue(socket);
  m.updateQuestProgress.mockResolvedValue(null);
  m.completeDaily.mockResolvedValue(null);
});

describe('multiplayer game end announces quest and mission level-ups', () => {
  it('announces a level the daily missions reached after the game XP did not level up (bot room)', async () => {
    m.processGameResults.mockResolvedValue(gameXp(4, 4));
    m.completeDaily.mockResolvedValue({ xpEarned: 100, levelUp: { oldLevel: 4, newLevel: 5 } });
    await recordGameResultsToSupabase({} as never, 'G1', scores, game());
    await settle();
    expect(levelUpEmits()).toEqual([expect.objectContaining({ oldLevel: 4, newLevel: 5 })]);
    expect(m.notifyLevelUp).toHaveBeenCalledWith(USER, 5, 'en');
  });

  it('spans game, weekly and mission XP in one follow-up announcement', async () => {
    m.processGameResults.mockResolvedValue(gameXp(4, 5));
    m.updateQuestProgress.mockResolvedValue({ completed: true, xpGrant: { xpEarned: 300, newTotalXp: 1, oldLevel: 5, newLevel: 6, leveledUp: true } });
    m.completeDaily.mockResolvedValue({ xpEarned: 100, levelUp: { oldLevel: 6, newLevel: 7 } });
    await recordGameResultsToSupabase({} as never, 'G2', scores, game());
    await settle();
    expect(levelUpEmits()).toEqual([
      expect.objectContaining({ oldLevel: 4, newLevel: 5 }),
      expect.objectContaining({ oldLevel: 4, newLevel: 7, levelsGained: 3 }),
    ]);
    expect(m.notifyLevelUp).toHaveBeenLastCalledWith(USER, 7, 'en');
  });

  it('sends no second announcement when the quests only added XP inside the level', async () => {
    m.processGameResults.mockResolvedValue(gameXp(4, 5));
    m.completeDaily.mockResolvedValue({ xpEarned: 100, levelUp: null });
    await recordGameResultsToSupabase({} as never, 'G3', scores, game());
    await settle();
    expect(levelUpEmits()).toHaveLength(1);
    expect(m.notifyLevelUp).toHaveBeenCalledTimes(1);
  });

  it('still announces the weekly quest level-up when the mission credit fails', async () => {
    m.processGameResults.mockResolvedValue(gameXp(4, 4));
    m.updateQuestProgress.mockResolvedValue({ completed: true, xpGrant: { xpEarned: 300, newTotalXp: 1, oldLevel: 4, newLevel: 5, leveledUp: true } });
    m.completeDaily.mockRejectedValue(new Error('db down'));
    await recordGameResultsToSupabase({} as never, 'G4', scores, game());
    await settle();
    expect(levelUpEmits()).toEqual([expect.objectContaining({ oldLevel: 4, newLevel: 5 })]);
  });

  it('announces nothing for a repeat persist of the same round', async () => {
    const g = game();
    m.processGameResults.mockResolvedValue(gameXp(4, 4));
    await recordGameResultsToSupabase({} as never, 'G5', scores, g);
    await settle();
    m.completeDaily.mockResolvedValue({ xpEarned: 100, levelUp: { oldLevel: 4, newLevel: 5 } });
    await recordGameResultsToSupabase({} as never, 'G5', scores, g);
    await settle();
    expect(levelUpEmits()).toHaveLength(0);
  });
});
