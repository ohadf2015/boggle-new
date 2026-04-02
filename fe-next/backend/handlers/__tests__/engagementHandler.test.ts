/**
 * Engagement Handler Tests
 * Tests for daily challenges, calendar rewards, rate limiting, and error handling
 */

import type { Socket, Server } from 'socket.io';

// Mock logger
jest.mock('../../utils/logger', () => {
  const l = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
  return { __esModule: true, default: l, ...l };
});

// Mock safeEmit
jest.mock('../../utils/socketHelpers', () => ({
  safeEmit: jest.fn(),
}));

// Mock rate limiter
jest.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockReturnValue(true),
}));

// Mock dailyChallengesManager
jest.mock('../../modules/dailyChallengesManager', () => ({
  getTodaysChallenges: jest.fn(),
  claimChallengeReward: jest.fn(),
  getChallengeStats: jest.fn(),
  updateChallengeProgress: jest.fn(),
}));

// Mock engagementManager
jest.mock('../../modules/engagementManager', () => ({
  recordLogin: jest.fn(),
  getCalendarStatus: jest.fn(),
  claimCalendarReward: jest.fn(),
  checkComebackBonus: jest.fn(),
  claimComebackBonus: jest.fn(),
  calculateNearMisses: jest.fn(),
  getOneMoreGamePrompt: jest.fn(),
  rollMysteryReward: jest.fn(),
  logMysteryReward: jest.fn(),
  getEngagementStatus: jest.fn(),
}));

// Mock dailyMissionsManager
jest.mock('../../modules/dailyMissionsManager', () => ({
  getDailyMissions: jest.fn(),
  completeMission: jest.fn(),
  checkAndClaimGrandSlam: jest.fn(),
}));

// Mock wordOfTheDayManager
jest.mock('../../modules/wordOfTheDayManager', () => ({
  getWordOfTheDay: jest.fn(),
  recordWotdAttempt: jest.fn(),
  getWotdStats: jest.fn(),
}));

import { registerEngagementHandlers } from '../engagementHandler';
import { safeEmit } from '../../utils/socketHelpers';
import { checkRateLimit } from '../../utils/rateLimiter';
import { getTodaysChallenges, claimChallengeReward } from '../../modules/dailyChallengesManager';
import { getCalendarStatus, recordLogin, checkComebackBonus } from '../../modules/engagementManager';

// Helper to get the registered handler for a given event
function getHandler(mockSocket: jest.Mocked<Socket>, eventName: string) {
  const calls = (mockSocket.on as jest.Mock).mock.calls;
  const call = calls.find(([name]: [string]) => name === eventName);
  if (!call) throw new Error(`Handler for '${eventName}' not registered`);
  return call[1] as (...args: unknown[]) => Promise<void>;
}

describe('registerEngagementHandlers', () => {
  let mockSocket: jest.Mocked<Socket>;
  let mockIo: jest.Mocked<Server>;

  beforeEach(() => {
    jest.clearAllMocks();
    (checkRateLimit as jest.Mock).mockReturnValue(true);

    mockSocket = {
      id: 'socket-abc',
      emit: jest.fn(),
      on: jest.fn(),
    } as unknown as jest.Mocked<Socket>;

    mockIo = {} as jest.Mocked<Server>;

    registerEngagementHandlers(mockIo, mockSocket);
  });

  // ==================== getDailyChallenges ====================

  describe('engagement:getDailyChallenges', () => {
    it('returns transformed challenges on success', async () => {
      // GIVEN: DB returns raw challenge rows
      (getTodaysChallenges as jest.Mock).mockResolvedValue([
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

    it('emits error when playerId is missing', async () => {
      const handler = getHandler(mockSocket, 'engagement:getDailyChallenges');
      await handler({});

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Player ID required' })
      );
      expect(getTodaysChallenges).not.toHaveBeenCalled();
    });

    it('emits error when DB throws', async () => {
      (getTodaysChallenges as jest.Mock).mockRejectedValue(new Error('DB down'));

      const handler = getHandler(mockSocket, 'engagement:getDailyChallenges');
      await handler({ playerId: 'player-1' });

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Failed to get challenges' })
      );
    });

    it('emits rateLimited and returns early when rate limit exceeded', async () => {
      (checkRateLimit as jest.Mock).mockReturnValue(false);

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
      (claimChallengeReward as jest.Mock).mockResolvedValue(reward);

      const handler = getHandler(mockSocket, 'engagement:claimChallengeReward');
      await handler({ playerId: 'player-1', challengeId: 'ch-1' });

      expect(claimChallengeReward).toHaveBeenCalledWith('player-1', 'ch-1');
      expect(safeEmit).toHaveBeenCalledWith(mockSocket, 'engagement:rewardClaimed', reward);
    });

    it('emits error when playerId or challengeId missing', async () => {
      const handler = getHandler(mockSocket, 'engagement:claimChallengeReward');
      await handler({ playerId: 'player-1' }); // no challengeId

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Player ID and Challenge ID required' })
      );
    });

    it('emits error when claim throws', async () => {
      (claimChallengeReward as jest.Mock).mockRejectedValue(new Error('Claim failed'));

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
      (getCalendarStatus as jest.Mock).mockResolvedValue(calendarData);

      const handler = getHandler(mockSocket, 'engagement:getCalendarStatus');
      await handler({ playerId: 'player-1' });

      expect(safeEmit).toHaveBeenCalledWith(mockSocket, 'engagement:calendarStatus', calendarData);
    });

    it('emits error when playerId missing', async () => {
      const handler = getHandler(mockSocket, 'engagement:getCalendarStatus');
      await handler({});

      expect(safeEmit).toHaveBeenCalledWith(
        mockSocket,
        'engagement:error',
        expect.objectContaining({ message: 'Player ID required' })
      );
    });

    it('emits error when DB throws', async () => {
      (getCalendarStatus as jest.Mock).mockRejectedValue(new Error('timeout'));

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
      (recordLogin as jest.Mock).mockResolvedValue({ streak: 7 });
      (checkComebackBonus as jest.Mock).mockResolvedValue({ eligible: true, multiplier: 2 });

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
      (recordLogin as jest.Mock).mockResolvedValue({ streak: 3 });
      (checkComebackBonus as jest.Mock).mockResolvedValue({ eligible: false });

      const handler = getHandler(mockSocket, 'engagement:recordLogin');
      await handler({ playerId: 'player-1' });

      const emitCalls = (safeEmit as jest.Mock).mock.calls;
      const comebackCall = emitCalls.find(([, event]: [unknown, string]) => event === 'engagement:comebackAvailable');
      expect(comebackCall).toBeUndefined();
    });

    it('rate limits when limit exceeded', async () => {
      (checkRateLimit as jest.Mock).mockReturnValue(false);

      const handler = getHandler(mockSocket, 'engagement:recordLogin');
      await handler({ playerId: 'player-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('rateLimited');
      expect(recordLogin).not.toHaveBeenCalled();
    });
  });
});
