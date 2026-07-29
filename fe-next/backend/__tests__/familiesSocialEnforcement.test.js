/**
 * Families Policy — server-side social enforcement.
 * Child / unknown-age sockets must be rejected at the handler before any
 * freeform exchange (chat broadcast, DM send, friend add/search) happens.
 */

vi.mock('../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
vi.mock('../middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock('../utils/errorHandler', async () => {
  const actual = await vi.importActual('../utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});
vi.mock('../utils/metrics', () => ({ inc: vi.fn() }));
vi.mock('../utils/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../handlers/shared', () => ({ isSocketMigrating: vi.fn().mockReturnValue(false) }));
vi.mock('../utils/socketValidation', () => ({
  validatePayload: vi.fn(() => ({ success: true, data: { message: 'hi', gameCode: 'ABC' } })),
  chatMessageSchema: {},
}));
vi.mock('../modules/gameStateManager', () => ({
  getGame: vi.fn(() => ({ hostSocketId: 'other', chatHistory: [] })),
  getGameBySocketId: vi.fn(() => 'ABC'),
  getUsernameBySocketId: vi.fn(() => 'Bob'),
}));
const broadcastToRoom = vi.fn();
vi.mock('../utils/socketHelpers', () => ({
  broadcastToRoom: (...a) => broadcastToRoom(...a),
  getGameRoom: vi.fn((c) => `room:${c}`),
}));
vi.mock('../utils/profanityFilter', () => ({ cleanProfanity: (s) => s }));
vi.mock('../utils/sanitize', () => ({ sanitizeHtml: (s) => s }));
vi.mock('../modules/friendsManager', () => ({ sendMessage: vi.fn() }));
vi.mock('../modules/supabaseServer', () => ({ getSupabase: vi.fn() }));
vi.mock('../modules/pushNotificationTriggers', () => ({
  notifyDirectMessage: vi.fn(),
  notifyFriendRequest: vi.fn(),
  notifyFriendAccepted: vi.fn(),
}));
vi.mock('../utils/socialHelpers', () => ({
  getAuthUserId: vi.fn(() => 'auth-user-1'),
  broadcastToUser: vi.fn(),
  getUserProfile: vi.fn(),
}));
vi.mock('../utils/socialPolicyServer', () => ({
  ensureSocialCapability: vi.fn(),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { registerChatHandlers } from '../handlers/chatHandler';
import { registerFriendMessagingHandlers } from '../handlers/friendMessagingHandler';
import { registerFriendsHandlers } from '../handlers/friendsHandler';
import { emitError, ErrorCodes } from '../utils/errorHandler';
import { ensureSocialCapability } from '../utils/socialPolicyServer';
import * as friendsManager from '../modules/friendsManager';

function wire(register) {
  const handlers = {};
  const socket = {
    id: 'sock-1',
    data: { verifiedUserId: 'auth-user-1' },
    on: vi.fn((evt, h) => { handlers[evt] = h; }),
    emit: vi.fn(),
  };
  const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
  register(io, socket);
  return { handlers, socket };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('chatHandler.chatMessage — publicRoomChat gate', () => {
  it('rejects a restricted user with SOCIAL_RESTRICTED and never broadcasts', async () => {
    ensureSocialCapability.mockResolvedValue(false);
    const { handlers } = wire(registerChatHandlers);
    await handlers['chatMessage']({ message: 'hi', gameCode: 'ABC' });
    expect(ensureSocialCapability).toHaveBeenCalledWith(expect.anything(), 'publicRoomChat');
    expect(emitError).toHaveBeenCalledWith(expect.anything(), ErrorCodes.SOCIAL_RESTRICTED);
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });

  it('allows an adult user to broadcast', async () => {
    ensureSocialCapability.mockResolvedValue(true);
    const { handlers } = wire(registerChatHandlers);
    await handlers['chatMessage']({ message: 'hi', gameCode: 'ABC' });
    expect(broadcastToRoom).toHaveBeenCalled();
  });
});

describe('friendMessagingHandler.friends:sendMessage — friendMessaging gate', () => {
  it('rejects a restricted user and never calls the messaging manager', async () => {
    ensureSocialCapability.mockResolvedValue(false);
    const { handlers } = wire(registerFriendMessagingHandlers);
    await handlers['friends:sendMessage']({ recipientUserId: 'r1', message: 'hey' });
    expect(ensureSocialCapability).toHaveBeenCalledWith(expect.anything(), 'friendMessaging');
    expect(emitError).toHaveBeenCalledWith(
      expect.anything(),
      ErrorCodes.SOCIAL_RESTRICTED,
      expect.anything(),
    );
    expect(friendsManager.sendMessage).not.toHaveBeenCalled();
  });
});

describe('friendsHandler — friendManagement gate', () => {
  it('rejects friend requests from a restricted user', async () => {
    ensureSocialCapability.mockResolvedValue(false);
    const { handlers } = wire(registerFriendsHandlers);
    await handlers['friends:sendRequest']({ targetUserId: 'u2' });
    expect(ensureSocialCapability).toHaveBeenCalledWith(expect.anything(), 'friendManagement');
    expect(emitError).toHaveBeenCalledWith(
      expect.anything(),
      ErrorCodes.SOCIAL_RESTRICTED,
      expect.anything(),
    );
  });

  it('rejects user search from a restricted user', async () => {
    ensureSocialCapability.mockResolvedValue(false);
    const { handlers } = wire(registerFriendsHandlers);
    await handlers['friends:searchUsers']({ query: 'bob' });
    expect(ensureSocialCapability).toHaveBeenCalledWith(expect.anything(), 'friendManagement');
    expect(emitError).toHaveBeenCalledWith(
      expect.anything(),
      ErrorCodes.SOCIAL_RESTRICTED,
      expect.anything(),
    );
  });
});
