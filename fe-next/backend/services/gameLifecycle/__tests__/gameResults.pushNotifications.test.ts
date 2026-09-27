/**
 * TDD tests: push notifications fired from gameResults.ts
 * RED phase — verifies notifyLevelUp and notifyAchievement are called
 * when the corresponding events occur in recordGameResultsToSupabase.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks so vi.mock factory can reference them
const mockNotifyLevelUp = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotifyAchievementsBatch = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetUserLocalesBatch = vi.hoisted(() => vi.fn().mockResolvedValue(new Map()));
const mockProcessGameResults = vi.hoisted(() => vi.fn());
const mockGetSocketById = vi.hoisted(() => vi.fn());
const mockSafeEmit = vi.hoisted(() => vi.fn());
const mockIsSupabaseConfigured = vi.hoisted(() => vi.fn(() => true));
const mockUpdateQuestProgress = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockIncrementWordApproval = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockProcessGameEndEngagement = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockProcessAchievementEngagement = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockUpdateRankedMmr = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../../../modules/pushNotificationTriggers', () => ({
  notifyLevelUp: mockNotifyLevelUp,
  notifyAchievementsBatch: mockNotifyAchievementsBatch,
  getUserLocalesBatch: mockGetUserLocalesBatch,
}));

vi.mock('../../../modules/supabaseServer', () => ({
  processGameResults: mockProcessGameResults,
  isSupabaseConfigured: mockIsSupabaseConfigured,
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

vi.mock('../../../modules/supabase/rankedMmr', () => ({
  updateRankedMmr: mockUpdateRankedMmr,
}));

vi.mock('../../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { recordGameResultsToSupabase } from '../gameResults';


const AUTH_USER_ID = 'auth-user-123';
const USERNAME = 'testplayer';

function makeIo() {
  return {} as any;
}

function makeGame(extra: Record<string, any> = {}) {
  return {
    language: 'en',
    users: {
      [USERNAME]: {
        socketId: 'socket-1',
        authUserId: AUTH_USER_ID,
      },
    },
    gameMode: 'classic',
    ...extra,
  } as any;
}

function makePlayerResult(overrides: Record<string, any> = {}) {
  return {
    username: USERNAME,
    totalScore: 100,
    wordDetails: [],
    achievements: [],
    isBot: false,
    ...overrides,
  };
}

function setupSocket() {
  const socket = { id: 'socket-1', disconnected: false } as any;
  mockGetSocketById.mockReturnValue(socket);
  return socket;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSupabaseConfigured.mockReturnValue(true);
});

describe('gameResults push notifications', () => {
  describe('notifyLevelUp', () => {
    it('calls notifyLevelUp with authUserId and new level when player levels up', async () => {
      setupSocket();
      mockProcessGameResults.mockResolvedValue({
        success: true,
        xpResults: {
          [USERNAME]: {
            socketId: 'socket-1',
            xpEarned: 50,
            xpBreakdown: [],
            newTotalXp: 500,
            newLevel: 5,
            oldLevel: 4,
            levelsGained: 1,
            leveledUp: true,
            newTitles: [],
          },
        },
        lifetimeAchievements: {},
      });

      await recordGameResultsToSupabase(makeIo(), 'GAME1', [makePlayerResult()], makeGame());

      expect(mockNotifyLevelUp).toHaveBeenCalledOnce();
      // Locale is pre-fetched once per game-end and forwarded to avoid
      // per-player getUserLocale round-trips that saturate the Supabase
      // semaphore (Sentry 136). 'en' here = test default (no profile mock).
      expect(mockNotifyLevelUp).toHaveBeenCalledWith(AUTH_USER_ID, 5, 'en');
    });

    it('does NOT call notifyLevelUp when player did not level up', async () => {
      setupSocket();
      mockProcessGameResults.mockResolvedValue({
        success: true,
        xpResults: {
          [USERNAME]: {
            socketId: 'socket-1',
            xpEarned: 10,
            xpBreakdown: [],
            newTotalXp: 100,
            newLevel: 2,
            oldLevel: 2,
            levelsGained: 0,
            leveledUp: false,
            newTitles: [],
          },
        },
        lifetimeAchievements: {},
      });

      await recordGameResultsToSupabase(makeIo(), 'GAME1', [makePlayerResult()], makeGame());

      expect(mockNotifyLevelUp).not.toHaveBeenCalled();
    });

    it('does NOT call notifyLevelUp when authUserId is missing', async () => {
      setupSocket();
      mockProcessGameResults.mockResolvedValue({
        success: true,
        xpResults: {
          [USERNAME]: {
            socketId: 'socket-1',
            xpEarned: 50,
            newLevel: 5,
            oldLevel: 4,
            leveledUp: true,
            newTitles: [],
          },
        },
        lifetimeAchievements: {},
      });

      const gameNoAuth = makeGame();
      delete gameNoAuth.users[USERNAME].authUserId;

      await recordGameResultsToSupabase(makeIo(), 'GAME1', [makePlayerResult()], gameNoAuth);

      expect(mockNotifyLevelUp).not.toHaveBeenCalled();
    });
  });

  describe('notifyAchievementsBatch', () => {
    it('coalesces all lifetime achievement unlocks into a single batched call', async () => {
      setupSocket();
      mockProcessGameResults.mockResolvedValue({
        success: true,
        xpResults: {},
        lifetimeAchievements: {
          [USERNAME]: [
            { key: 'VETERAN', icon: '🎖️' },
            { key: 'WORD_COLLECTOR', icon: '📚' },
          ],
        },
      });

      await recordGameResultsToSupabase(makeIo(), 'GAME1', [makePlayerResult()], makeGame());

      expect(mockNotifyAchievementsBatch).toHaveBeenCalledTimes(1);
      expect(mockNotifyAchievementsBatch).toHaveBeenCalledWith(
        AUTH_USER_ID,
        ['VETERAN', 'WORD_COLLECTOR'],
        'en'
      );
    });

    it('does NOT call notifyAchievementsBatch when no achievements unlocked', async () => {
      setupSocket();
      mockProcessGameResults.mockResolvedValue({
        success: true,
        xpResults: {},
        lifetimeAchievements: { [USERNAME]: [] },
      });

      await recordGameResultsToSupabase(makeIo(), 'GAME1', [makePlayerResult()], makeGame());

      expect(mockNotifyAchievementsBatch).not.toHaveBeenCalled();
    });

    it('does NOT call notifyAchievementsBatch when authUserId is missing', async () => {
      setupSocket();
      mockProcessGameResults.mockResolvedValue({
        success: true,
        xpResults: {},
        lifetimeAchievements: {
          [USERNAME]: [{ key: 'VETERAN', icon: '🎖️' }],
        },
      });

      const gameNoAuth = makeGame();
      delete gameNoAuth.users[USERNAME].authUserId;

      await recordGameResultsToSupabase(makeIo(), 'GAME1', [makePlayerResult()], gameNoAuth);

      expect(mockNotifyAchievementsBatch).not.toHaveBeenCalled();
    });
  });
});
