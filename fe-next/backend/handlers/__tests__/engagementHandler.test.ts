/**
 * Engagement Handler Tests
 * Tests for daily challenges, calendar rewards, rate limiting, and error handling
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Socket, Server } from 'socket.io';

// Mock logger
vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});

// Mock safeEmit
vi.mock('../../utils/socketHelpers', () => ({
  safeEmit: vi.fn(),
}));

// Mock rate limiter
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true), default: {
  checkRateLimit: vi.fn().mockReturnValue(true),
} }));

// Mock dailyChallengesManager
vi.mock('../../modules/dailyChallengesManager', () => ({
  getTodaysChallenges: vi.fn(),
  claimChallengeReward: vi.fn(),
  getChallengeStats: vi.fn(),
  updateChallengeProgress: vi.fn(),
}));

// Mock engagementManager
vi.mock('../../modules/engagementManager', () => ({
  recordLogin: vi.fn(),
  getCalendarStatus: vi.fn(),
  claimCalendarReward: vi.fn(),
  checkComebackBonus: vi.fn(),
  claimComebackBonus: vi.fn(),
  calculateNearMisses: vi.fn(),
  getOneMoreGamePrompt: vi.fn(),
  rollMysteryReward: vi.fn(),
  logMysteryReward: vi.fn(),
  getEngagementStatus: vi.fn(),
}));

// Mock dailyMissionsManager
vi.mock('../../modules/dailyMissionsManager', () => ({
  getDailyMissions: vi.fn(),
  completeMission: vi.fn(),
  checkAndClaimGrandSlam: vi.fn(),
}));

// Mock wordOfTheDayManager
vi.mock('../../modules/wordOfTheDayManager', () => ({
  getWordOfTheDay: vi.fn(),
  recordWotdAttempt: vi.fn(),
  getWotdStats: vi.fn(),
}));

import { registerEngagementHandlers } from '../engagementHandler';
import { safeEmit } from '../../utils/socketHelpers';
import { checkRateLimit } from '../../utils/rateLimiter';
import { getTodaysChallenges, claimChallengeReward } from '../../modules/dailyChallengesManager';
import { getCalendarStatus, recordLogin, checkComebackBonus } from '../../modules/engagementManager';

// Helper to get the registered handler for a given event
function getHandler(mockSocket: Mocked<Socket>, eventName: string) {
  const calls = (mockSocket.on as Mock).mock.calls;
  const call = calls.find(([name]: [string]) => name === eventName);
  if (!call) throw new Error(`Handler for '${eventName}' not registered`);
  return call[1] as (...args: unknown[]) => Promise<void>;
}

describe('registerEngagementHandlers', () => {
  let mockSocket: Mocked<Socket>;
  let mockIo: Mocked<Server>;

  beforeEach(() => {
    vi.clearAllMocks();
    (checkRateLimit as Mock).mockReturnValue(true);

    mockSocket = {
      id: 'socket-abc',
      emit: vi.fn(),
      on: vi.fn(),
      data: { verifiedUserId: 'player-1' },
    } as unknown as Mocked<Socket>;

    mockIo = {} as Mocked<Server>;

    registerEngagementHandlers(mockIo, mockSocket);
  });

  // ==================== getDailyChallenges ====================

  describe('engagement:getDailyChallenges', () => {
    it('returns transformed challenges on success', async () => {
      // GIVEN: DB returns raw challenge rows
      (getTodaysChallenges as Mock).mockResolvedValue([
        {
          id: 'ch-1',
          challenge_type: 'score',
          title: 'Score 200',
          description: 'Reach 200 points',
          target_value: 200,
          current_value: 50,
          challenge_tier: 'bronze',
          xp_reward: 50,
          completed: false,
          claimed: false,
        },
      ]);

      // WHEN: Event fires with a valid playerId
      const handler = getHandler(mockSocket, 'engagement:getDailyChallenges');
      await handler({ playerId: 'player-1' });

      // THEN: safeEmit called with transformed challenges
      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:dailyChallenges',
        expect.objectContaining({
          challenges: expect.arrayContaining([
            expect.objectContaining({
              id: 'ch-1',
              type: 'score',
              title: 'Score 200',
              target: 200,
              current: 50,
              tier: 'bronze',
              xpReward: 50,
              completed: false,
              claimed: false,
            }),
          ]),
        })
      );
    });

    it('emits error when socket is not authenticated', async () => {
      (mockSocket.data as { verifiedUserId?: string }).verifiedUserId = undefined;
      const handler = getHandler(mockSocket, 'engagement:getDailyChallenges');
      await handler({});

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Authentication required' })
      );
      expect(getTodaysChallenges).not.toHaveBeenCalled();
    });

    it('emits error when DB throws', async () => {
      (getTodaysChallenges as Mock).mockRejectedValue(new Error('DB down'));

      const handler = getHandler(mockSocket, 'engagement:getDailyChallenges');
      await handler({ playerId: 'player-1' });

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Failed to get challenges' })
      );
    });

    it('emits rateLimited and returns early when rate limit exceeded', async () => {
      (checkRateLimit as Mock).mockReturnValue(false);

      const handler = getHandler(mockSocket, 'engagement:getDailyChallenges');
      await handler({ playerId: 'player-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('rateLimited');
      expect(getTodaysChallenges).not.toHaveBeenCalled();
    });
  });

  // ==================== claimChallengeReward ====================

  describe('engagement:claimChallengeReward', () => {
    it('emits rewardClaimed on success', async () => {
      const reward = { success: true, reward: { totalXp: 100 } };
      (claimChallengeReward as Mock).mockResolvedValue(reward);

      const handler = getHandler(mockSocket, 'engagement:claimChallengeReward');
      await handler({ playerId: 'player-1', challengeId: 'ch-1' });

      expect(claimChallengeReward).toHaveBeenCalledWith('player-1', 'ch-1');
      expect(safeEmit).toHaveBeenCalledWith(mockSocket, 'engagement:rewardClaimed', reward);
    });

    it('emits error when challengeId missing', async () => {
      const handler = getHandler(mockSocket, 'engagement:claimChallengeReward');
      await handler({}); // no challengeId

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Challenge ID required' })
      );
    });

    it('emits error when socket is not authenticated', async () => {
      (mockSocket.data as { verifiedUserId?: string }).verifiedUserId = undefined;
      const handler = getHandler(mockSocket, 'engagement:claimChallengeReward');
      await handler({ challengeId: 'ch-1' });

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Authentication required' })
      );
      expect(claimChallengeReward).not.toHaveBeenCalled();
    });

    it('emits error when claim throws', async () => {
      (claimChallengeReward as Mock).mockRejectedValue(new Error('Claim failed'));

      const handler = getHandler(mockSocket, 'engagement:claimChallengeReward');
      await handler({ playerId: 'player-1', challengeId: 'ch-1' });

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Failed to claim reward' })
      );
    });
  });

  // ==================== getCalendarStatus ====================

  describe('engagement:getCalendarStatus', () => {
    it('returns calendar status on success', async () => {
      const calendarData = {
        currentDay: 5,
        claimedDays: [1, 2, 3, 4],
        todayClaimable: true,
        rewards: [],
      };
      (getCalendarStatus as Mock).mockResolvedValue(calendarData);

      const handler = getHandler(mockSocket, 'engagement:getCalendarStatus');
      await handler({ playerId: 'player-1' });

      expect(safeEmit).toHaveBeenCalledWith(mockSocket, 'engagement:calendarStatus', calendarData);
    });

    it('emits error when socket is not authenticated', async () => {
      (mockSocket.data as { verifiedUserId?: string }).verifiedUserId = undefined;
      const handler = getHandler(mockSocket, 'engagement:getCalendarStatus');
      await handler({});

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Authentication required' })
      );
    });

    it('emits error when DB throws', async () => {
      (getCalendarStatus as Mock).mockRejectedValue(new Error('timeout'));

      const handler = getHandler(mockSocket, 'engagement:getCalendarStatus');
      await handler({ playerId: 'player-1' });

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Failed to get calendar status' })
      );
    });
  });

  // ==================== recordLogin (comeback bonus side-effect) ====================

  describe('engagement:recordLogin', () => {
    it('emits loginResult and comebackAvailable when eligible', async () => {
      (recordLogin as Mock).mockResolvedValue({ streak: 7 });
      (checkComebackBonus as Mock).mockResolvedValue({ eligible: true, multiplier: 2 });

      const handler = getHandler(mockSocket, 'engagement:recordLogin');
      await handler({ playerId: 'player-1' });

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:loginResult',
        expect.objectContaining({ streak: 7 })
      );
      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:comebackAvailable',
        expect.objectContaining({ eligible: true })
      );
    });

    it('does NOT emit comebackAvailable when not eligible', async () => {
      (recordLogin as Mock).mockResolvedValue({ streak: 3 });
      (checkComebackBonus as Mock).mockResolvedValue({ eligible: false });

      const handler = getHandler(mockSocket, 'engagement:recordLogin');
      await handler({ playerId: 'player-1' });

      const emitCalls = (safeEmit as Mock).mock.calls;
      const comebackCall = emitCalls.find(([, event]: [unknown, string]) => event === 'engagement:comebackAvailable');
      expect(comebackCall).toBeUndefined();
    });

    it('rate limits when limit exceeded', async () => {
      (checkRateLimit as Mock).mockReturnValue(false);

      const handler = getHandler(mockSocket, 'engagement:recordLogin');
      await handler({ playerId: 'player-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('rateLimited');
      expect(recordLogin).not.toHaveBeenCalled();
    });
  });
});
