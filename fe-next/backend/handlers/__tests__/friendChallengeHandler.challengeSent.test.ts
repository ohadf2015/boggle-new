/**
 * Friend Challenge Handler — challenge_sent event tracking
 *
 * Verifies that trackGrowthEvent('challenge_sent') is fired when
 * a challenge is sent successfully, and NOT fired on failure.
 */

import { vi, type Mock } from 'vitest';
import type { Server, Socket } from 'socket.io';

// Mock dependencies
const { mockCheckRateLimit, mockGetAuthUserId, mockFriendsSendChallenge, mockGetUserProfile, mockBroadcastToUser, mockNotifyGameInvite, mockGetPostHogServer, mockPostHogCapture } = vi.hoisted(() => {
  const mockCheckRateLimit = vi.fn().mockReturnValue(true);
  const mockGetAuthUserId = vi.fn().mockReturnValue('user-123');
  const mockFriendsSendChallenge = vi.fn();
  const mockGetUserProfile = vi.fn();
  const mockBroadcastToUser = vi.fn();
  const mockNotifyGameInvite = vi.fn().mockResolvedValue(undefined);
  const mockPostHogCapture = vi.fn();
  const mockGetPostHogServer = vi.fn().mockReturnValue({
    capture: mockPostHogCapture,
  });

  return {
    mockCheckRateLimit,
    mockGetAuthUserId,
    mockFriendsSendChallenge,
    mockGetUserProfile,
    mockBroadcastToUser,
    mockNotifyGameInvite,
    mockGetPostHogServer,
    mockPostHogCapture,
  };
});

vi.mock('../../utils/rateLimiter.js', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock('../../utils/socialHelpers.js', () => ({
  getAuthUserId: (...args: unknown[]) => mockGetAuthUserId(...args),
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
  broadcastToUser: (...args: unknown[]) => mockBroadcastToUser(...args),
}));

vi.mock('../../modules/friendsManager.js', () => ({
  sendChallenge: (...args: unknown[]) => mockFriendsSendChallenge(...args),
}));

vi.mock('../../modules/pushNotificationTriggers.js', () => ({
  notifyGameInvite: (...args: unknown[]) => mockNotifyGameInvite(...args),
  notifyChallengeAccepted: vi.fn(),
  notifyChallengeDeclined: vi.fn(),
}));

vi.mock('../../modules/supabaseServer.js', () => ({
  getSupabase: vi.fn(),
}));

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: (...args: unknown[]) => mockGetPostHogServer(...args),
}));

vi.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { registerFriendChallengeHandlers } from '../friendChallengeHandler';

function createMockSocket(id = 'socket-1'): Socket {
  const handlers: Record<string, Function> = {};
  return {
    id,
    on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
    emit: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
  } as unknown as Socket;
}

function createMockServer(): Server {
  return {
    on: vi.fn(),
  } as unknown as Server;
}

describe('friendChallengeHandler — challenge_sent event tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetAuthUserId.mockReturnValue('user-sender');
    mockGetPostHogServer.mockReturnValue({
      capture: mockPostHogCapture,
    });
  });

  it('fires PostHog capture for challenge_sent on successful send', async () => {
    const io = createMockServer();
    const socket = createMockSocket();

    mockFriendsSendChallenge.mockResolvedValue({
      success: true,
      challenge: { challengeId: 'room-ABC123' },
    });

    mockGetUserProfile.mockResolvedValueOnce({ username: 'sender', displayName: 'Sender', avatar: null });
    mockGetUserProfile.mockResolvedValueOnce({ username: 'recipient', displayName: 'Recipient', avatar: null });

    registerFriendChallengeHandlers(io, socket);

    // Get the handler that was registered
    const handlers = (socket.on as Mock).mock.calls;
    const sendChallengeCall = handlers.find((call: unknown[]) => call[0] === 'friends:sendChallenge');
    const sendChallengeHandler = sendChallengeCall?.[1];

    if (!sendChallengeHandler) {
      throw new Error('friends:sendChallenge handler not registered');
    }

    await sendChallengeHandler({
      friendUserId: 'user-recipient',
      challengeType: 'new_game',
      gameSettings: { mode: 'classic' },
    });

    // Verify PostHog capture was called with challenge_sent event
    expect(mockPostHogCapture).toHaveBeenCalledWith({
      distinctId: 'user-sender',
      event: 'challenge_sent',
      properties: {
        challengeType: 'new_game',
      },
    });
  });

  it('does NOT fire PostHog capture on failed challenge send', async () => {
    const io = createMockServer();
    const socket = createMockSocket();

    mockFriendsSendChallenge.mockResolvedValue({
      success: false,
      errorCode: 'NOT_FRIENDS',
    });

    registerFriendChallengeHandlers(io, socket);

    const handlers = (socket.on as Mock).mock.calls;
    const sendChallengeCall = handlers.find((call: unknown[]) => call[0] === 'friends:sendChallenge');
    const sendChallengeHandler = sendChallengeCall?.[1];

    if (!sendChallengeHandler) {
      throw new Error('friends:sendChallenge handler not registered');
    }

    await sendChallengeHandler({
      friendUserId: 'user-recipient',
      challengeType: 'new_game',
    });

    // Verify PostHog capture was NOT called
    expect(mockPostHogCapture).not.toHaveBeenCalled();
  });
});
