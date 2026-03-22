/**
 * friendChallengeHandler tests (Q-1)
 * Covers: sendChallenge, acceptChallenge, declineChallenge, getPendingChallenges, cancelChallenge, auth checks
 */

jest.mock('../../utils/logger', () => {
  const l = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
  return { __esModule: true, default: l, ...l };
});

jest.mock('../../utils/rateLimiter', () => ({
  __esModule: true,
  checkRateLimit: jest.fn().mockReturnValue(true),
}));

jest.mock('../../utils/errorHandler', () => ({
  __esModule: true,
  emitError: jest.fn(),
}));

jest.mock('../../modules/friendsManager');
jest.mock('../../modules/supabaseServer');
jest.mock('../../utils/socialHelpers');
jest.mock('../../modules/pushNotificationTriggers', () => ({
  __esModule: true,
  notifyGameInvite: jest.fn().mockResolvedValue(undefined),
  notifyChallengeAccepted: jest.fn().mockResolvedValue(undefined),
  notifyChallengeDeclined: jest.fn().mockResolvedValue(undefined),
}));

import { registerFriendChallengeHandlers } from '../friendChallengeHandler';
import * as friendsManager from '../../modules/friendsManager';
import { getSupabase } from '../../modules/supabaseServer';
import { getAuthUserId, broadcastToUser, getUserProfile } from '../../utils/socialHelpers';
import { emitError } from '../../utils/errorHandler';
import { checkRateLimit } from '../../utils/rateLimiter';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockBroadcastToUser = broadcastToUser as jest.MockedFunction<typeof broadcastToUser>;
const mockGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;
const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockEmitError = emitError as jest.MockedFunction<typeof emitError>;

function createTestHarness() {
  const handlers = new Map<string, Function>();
  const socket: any = {
    id: 'socket-1',
    emit: jest.fn(),
    on: jest.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
    authUserId: 'user-a',
  };
  const io: any = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  registerFriendChallengeHandlers(io, socket);

  const trigger = (event: string, data?: any) => {
    const handler = handlers.get(event);
    if (!handler) throw new Error(`No handler for ${event}`);
    return handler(data);
  };

  return { socket, io, trigger, handlers };
}

const PROFILE_A = {
  username: 'alice',
  displayName: 'Alice',
  avatar: { emoji: '😀', color: '#ff0000' },
  isOnline: true,
};

const PROFILE_B = {
  username: 'bob',
  displayName: 'Bob',
  avatar: { emoji: '😎', color: '#0000ff' },
  isOnline: false,
};

describe('friendChallengeHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockReturnValue('user-a');
    mockCheckRateLimit.mockReturnValue(true);
    mockGetUserProfile.mockImplementation(async (id: string) => {
      if (id === 'user-a') return PROFILE_A;
      if (id === 'user-b') return PROFILE_B;
      return null;
    });
  });

  it('should register all challenge event handlers', () => {
    const { handlers } = createTestHarness();
    expect(handlers.has('friends:sendChallenge')).toBe(true);
    expect(handlers.has('friends:acceptChallenge')).toBe(true);
    expect(handlers.has('friends:declineChallenge')).toBe(true);
    expect(handlers.has('friends:getPendingChallenges')).toBe(true);
    expect(handlers.has('friends:cancelChallenge')).toBe(true);
  });

  describe('friends:sendChallenge', () => {
    it('should reject unauthenticated users', async () => {
      mockGetAuthUserId.mockReturnValue(null);
      const { trigger } = createTestHarness();
      await trigger('friends:sendChallenge', { friendUserId: 'user-b', challengeType: 'new_game' });
      expect(mockEmitError).toHaveBeenCalled();
    });

    it('should reject missing friendUserId', async () => {
      const { socket, trigger } = createTestHarness();
      await trigger('friends:sendChallenge', { challengeType: 'new_game' });
      expect(socket.emit).toHaveBeenCalledWith('friends:error', expect.objectContaining({
        code: 'VALIDATION_FAILED',
      }));
    });

    it('should reject join_room without roomCode', async () => {
      const { socket, trigger } = createTestHarness();
      await trigger('friends:sendChallenge', { friendUserId: 'user-b', challengeType: 'join_room' });
      expect(socket.emit).toHaveBeenCalledWith('friends:error', expect.objectContaining({
        code: 'VALIDATION_FAILED',
      }));
    });

    it('should send challenge and notify recipient', async () => {
      (friendsManager.sendChallenge as jest.Mock).mockResolvedValue({
        success: true,
        challenge: {
          challengeId: 'ch-1',
          fromUserId: 'user-a',
          toUserId: 'user-b',
          challengeType: 'new_game',
          roomCode: 'ABCDEF',
          status: 'pending',
          createdAt: Date.now(),
          expiresAt: Date.now() + 86400000,
        },
      });

      const { socket, trigger } = createTestHarness();
      await trigger('friends:sendChallenge', {
        friendUserId: 'user-b',
        challengeType: 'new_game',
      });

      expect(socket.emit).toHaveBeenCalledWith('friends:challengeSent', expect.objectContaining({
        fromUserId: 'user-a',
        toUserId: 'user-b',
      }));
      expect(mockBroadcastToUser).toHaveBeenCalledWith(
        expect.anything(),
        'user-b',
        'friends:challengeReceived',
        expect.anything(),
      );
    });
  });

  describe('friends:declineChallenge', () => {
    it('should reject unauthenticated users', async () => {
      mockGetAuthUserId.mockReturnValue(null);
      const { trigger } = createTestHarness();
      await trigger('friends:declineChallenge', { challengeId: 'ch-1' });
      expect(mockEmitError).toHaveBeenCalled();
    });

    it('should reject missing challengeId', async () => {
      const { socket, trigger } = createTestHarness();
      await trigger('friends:declineChallenge', {});
      expect(socket.emit).toHaveBeenCalledWith('friends:error', expect.objectContaining({
        code: 'VALIDATION_FAILED',
      }));
    });

    it('should pass authUserId to declineChallenge for ownership verification', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { challenger_id: 'user-b', challenged_id: 'user-a' },
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockGetSupabase.mockReturnValue({
        from: jest.fn().mockReturnValue({ select: mockSelect }),
      } as any);

      (friendsManager.declineChallenge as jest.Mock).mockResolvedValue({ success: true });

      const { trigger } = createTestHarness();
      await trigger('friends:declineChallenge', { challengeId: 'ch-1' });

      // Verify authUserId was passed for ownership check
      expect(friendsManager.declineChallenge).toHaveBeenCalledWith('ch-1', 'user-a');
    });
  });

  describe('friends:getPendingChallenges', () => {
    it('should reject unauthenticated users', async () => {
      mockGetAuthUserId.mockReturnValue(null);
      const { trigger } = createTestHarness();
      await trigger('friends:getPendingChallenges');
      expect(mockEmitError).toHaveBeenCalled();
    });
  });
});
