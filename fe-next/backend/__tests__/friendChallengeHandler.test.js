/**
 * Friend Challenge Handler Tests — auth gate emits typed AUTH_REQUIRED
 */

vi.mock('../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
vi.mock('../utils/errorHandler', async () => {
  const actual = await vi.importActual('../utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});
vi.mock('../modules/friendsManager', () => ({}));
vi.mock('../modules/pushNotificationTriggers', () => ({
  notifyGameInvite: vi.fn(),
  notifyChallengeAccepted: vi.fn(),
  notifyChallengeDeclined: vi.fn(),
}));
vi.mock('../modules/supabaseServer', () => ({ getSupabase: vi.fn() }));
vi.mock('../utils/socialHelpers', () => ({
  getAuthUserId: vi.fn(),
  broadcastToUser: vi.fn(),
  getUserProfile: vi.fn(),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { registerFriendChallengeHandlers } from '../handlers/friendChallengeHandler';
import { emitError, ErrorCodes } from '../utils/errorHandler';
import { getAuthUserId } from '../utils/socialHelpers';

describe('Friend Challenge Handler — auth gate', () => {
  let mockSocket;
  let eventHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = {};
    mockSocket = {
      id: 'socket-x',
      on: vi.fn((evt, h) => { eventHandlers[evt] = h; }),
      emit: vi.fn(),
    };
    getAuthUserId.mockReturnValue(null);
    registerFriendChallengeHandlers({ to: vi.fn().mockReturnThis(), emit: vi.fn() }, mockSocket);
  });

  const events = [
    ['friends:sendChallenge', { friendUserId: 'u', challengeType: 'new_game' }],
    ['friends:acceptChallenge', { challengeId: 'c' }],
    ['friends:declineChallenge', { challengeId: 'c' }],
    ['friends:getPendingChallenges', {}],
    ['friends:cancelChallenge', { challengeId: 'c' }],
  ];

  for (const [evt, payload] of events) {
    it(`${evt} emits AUTH_REQUIRED when unauthenticated`, async () => {
      await eventHandlers[evt](payload);
      const call = emitError.mock.calls[0];
      expect(call[0]).toBe(mockSocket);
      expect(call[1]).toBe(ErrorCodes.AUTH_REQUIRED);
    });
  }
});
