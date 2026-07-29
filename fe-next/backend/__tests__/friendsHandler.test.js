/**
 * Friends Handler Tests — auth gate emits typed AUTH_REQUIRED
 */

vi.mock('../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
vi.mock('../utils/errorHandler', async () => {
  const actual = await vi.importActual('../utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});
vi.mock('../modules/friendsManager', () => ({}));
vi.mock('../modules/supabaseServer', () => ({ getSupabase: vi.fn() }));
vi.mock('../modules/pushNotificationTriggers', () => ({
  notifyFriendRequest: vi.fn(),
  notifyFriendRequestAccepted: vi.fn(),
}));
vi.mock('../utils/socialHelpers', () => ({
  getAuthUserId: vi.fn(),
  broadcastToUser: vi.fn(),
  getUserProfile: vi.fn(),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { registerFriendsHandlers } from '../handlers/friendsHandler';
import { emitError, ErrorCodes } from '../utils/errorHandler';
import { getAuthUserId } from '../utils/socialHelpers';

describe('Friends Handler — auth gate', () => {
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
    registerFriendsHandlers({ to: vi.fn().mockReturnThis(), emit: vi.fn() }, mockSocket);
  });

  const events = [
    ['friends:sendRequest', { targetUserId: 'u' }],
    ['friends:acceptRequest', { requestId: 'r' }],
    ['friends:declineRequest', { requestId: 'r' }],
    ['friends:unfriend', { friendUserId: 'u' }],
    ['friends:searchUsers', { query: 'a' }],
    ['friends:getPendingRequests', {}],
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
