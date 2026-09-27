/**
 * Chat Handler Tests
 * Tests for chat message handling and chat history functionality
 */

// Must mock before requiring the module
vi.mock('../modules/gameStateManager');
vi.mock('../utils/socketHelpers');
vi.mock('../utils/profanityFilter');
vi.mock('../utils/errorHandler');
vi.mock('../utils/rateLimiter', () => ({ default: { checkRateLimit: vi.fn().mockReturnValue(true), checkRateLimitDetailed: vi.fn().mockReturnValue({ allowed: true }), initRateLimit: vi.fn(), getIpFromSocket: vi.fn().mockReturnValue('127.0.0.1') }, checkRateLimit: vi.fn().mockReturnValue(true), checkRateLimitDetailed: vi.fn().mockReturnValue({ allowed: true }), initRateLimit: vi.fn(), getIpFromSocket: vi.fn().mockReturnValue('127.0.0.1') }));
vi.mock('../utils/metrics');
vi.mock('../handlers/shared');
vi.mock('../utils/socketValidation');
vi.mock('../utils/sanitize', () => ({
  sanitizeHtml: vi.fn((text) => text),
}));
vi.mock('../middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock('../utils/socialPolicyServer', () => ({
  ensureSocialCapability: vi.fn().mockResolvedValue(true),
  getSocialCapabilities: vi.fn().mockResolvedValue({
    publicRoomChat: true,
    friendMessaging: true,
    friendManagement: true,
    customDisplayName: true,
    emojiReactions: true,
  }),
  resolveSocketSocialContext: vi.fn().mockResolvedValue({
    tier: 'adult',
    caps: {
      publicRoomChat: true,
      friendMessaging: true,
      friendManagement: true,
      customDisplayName: true,
      emojiReactions: true,
    },
  }),
  clearSocketSocialContextCache: vi.fn(),
}));

import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { registerChatHandlers } from '../handlers/chatHandler';
import { getGame, getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers';
import { cleanProfanity } from '../utils/profanityFilter';
import { emitError, ErrorCodes } from '../utils/errorHandler';
import { checkRateLimit } from '../utils/rateLimiter';
import { inc } from '../utils/metrics';
import { isSocketMigrating } from '../handlers/shared';
import { validatePayload, chatMessageSchema } from '../utils/socketValidation';
describe('Chat Handler', () => {
  let mockIo;
  let mockSocket;
  let eventHandlers;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup event handler capture
    eventHandlers = {};
    mockSocket = {
      id: 'socket-123',
      on: vi.fn((event, handler) => {
        eventHandlers[event] = handler;
      }),
      emit: vi.fn()
    };
    mockIo = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn()
    };

    // Default mock implementations
    getGameBySocketId.mockReturnValue('ABCDEF');
    getUsernameBySocketId.mockReturnValue('TestUser');
    getGameRoom.mockImplementation(code => `game:${code}`);
    cleanProfanity.mockImplementation(text => text);
    checkRateLimit.mockReturnValue(true);
    isSocketMigrating.mockReturnValue(false);
    validatePayload.mockImplementation((schema, data) => ({ success: true, data }));
    getGame.mockReturnValue({
      hostSocketId: 'host-socket',
      users: { TestUser: {} }
    });

    // Register handlers
    registerChatHandlers(mockIo, mockSocket);
  });

  describe('chatMessage event', () => {
    it('should register chatMessage handler', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('chatMessage', expect.any(Function));
    });

    it('should broadcast chat message to room', async () => {
      const game = { hostSocketId: 'host-socket', users: {} };
      getGame.mockReturnValue(game);

      await eventHandlers.chatMessage({
        message: 'Hello world',
        gameCode: 'ABCDEF'
      });

      expect(broadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'game:ABCDEF',
        'chatMessage',
        expect.objectContaining({
          username: 'TestUser',
          message: 'Hello world',
          isHost: false
        })
      );
    });

    it('should store message in game chat history', async () => {
      const game = { hostSocketId: 'host-socket', users: {} };
      getGame.mockReturnValue(game);

      await eventHandlers.chatMessage({
        message: 'Hello world',
        gameCode: 'ABCDEF'
      });

      expect(game.chatHistory).toBeDefined();
      expect(game.chatHistory.length).toBe(1);
      expect(game.chatHistory[0]).toMatchObject({
        username: 'TestUser',
        message: 'Hello world',
        isHost: false
      });
    });

    it('should mark host messages correctly', async () => {
      const game = { hostSocketId: 'socket-123', users: {} };
      getGame.mockReturnValue(game);

      await eventHandlers.chatMessage({
        message: 'Hello from host',
        gameCode: 'ABCDEF'
      });

      expect(broadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'game:ABCDEF',
        'chatMessage',
        expect.objectContaining({
          username: 'Host',
          isHost: true
        })
      );
    });

    it('should limit chat history to 100 messages', async () => {
      const existingHistory = Array(100).fill(null).map((_, i) => ({
        message: `old-${i}`,
        username: 'User',
        timestamp: i,
        isHost: false
      }));
      const game = {
        hostSocketId: 'host-socket',
        users: {},
        chatHistory: existingHistory
      };
      getGame.mockReturnValue(game);

      await eventHandlers.chatMessage({
        message: 'New message',
        gameCode: 'ABCDEF'
      });

      expect(game.chatHistory.length).toBe(100);
      expect(game.chatHistory[99].message).toBe('New message');
    });

    it('should emit GAME_NOT_FOUND when game lookup fails', async () => {
      getGame.mockReturnValue(null);

      await eventHandlers.chatMessage({
        message: 'Hello',
        gameCode: 'INVALID'
      });

      expect(emitError).toHaveBeenCalledWith(mockSocket, ErrorCodes.GAME_NOT_FOUND);
      expect(broadcastToRoom).not.toHaveBeenCalled();
    });

    it('should emit VALIDATION_INVALID_PAYLOAD when schema validation fails', async () => {
      validatePayload.mockReturnValue({ success: false, error: 'bad shape' });

      await eventHandlers.chatMessage({});

      expect(emitError).toHaveBeenCalledWith(
        mockSocket,
        ErrorCodes.VALIDATION_INVALID_PAYLOAD,
        expect.objectContaining({ message: expect.stringContaining('bad shape') })
      );
    });

    it('should emit PLAYER_NOT_IN_GAME when game/username unresolved', async () => {
      getGameBySocketId.mockReturnValue(null);
      getUsernameBySocketId.mockReturnValue(null);

      await eventHandlers.chatMessage({ message: 'Hello' });

      expect(emitError).toHaveBeenCalledWith(mockSocket, ErrorCodes.PLAYER_NOT_IN_GAME);
    });

    it('should check rate limit and block if exceeded', () => {
      checkRateLimit.mockReturnValue(false);

      eventHandlers.chatMessage({
        message: 'Hello',
        gameCode: 'ABCDEF'
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('rateLimited');
      expect(broadcastToRoom).not.toHaveBeenCalled();
    });

    it('should not process when socket is migrating', () => {
      isSocketMigrating.mockReturnValue(true);

      eventHandlers.chatMessage({
        message: 'Hello',
        gameCode: 'ABCDEF'
      });

      expect(broadcastToRoom).not.toHaveBeenCalled();
    });
  });

  describe('requestChatHistory event', () => {
    it('should register requestChatHistory handler', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('requestChatHistory', expect.any(Function));
    });

    it('should return chat history when available', () => {
      const chatHistory = [
        { username: 'User1', message: 'Hello', timestamp: 1000, isHost: false },
        { username: 'Host', message: 'Hi', timestamp: 2000, isHost: true }
      ];
      getGame.mockReturnValue({
        hostSocketId: 'host-socket',
        chatHistory
      });

      eventHandlers.requestChatHistory({ gameCode: 'ABCDEF' });

      expect(mockSocket.emit).toHaveBeenCalledWith('chatHistory', {
        messages: chatHistory
      });
    });

    it('should return empty array if no chat history', () => {
      getGame.mockReturnValue({
        hostSocketId: 'host-socket'
        // No chatHistory property
      });

      eventHandlers.requestChatHistory({ gameCode: 'ABCDEF' });

      expect(mockSocket.emit).toHaveBeenCalledWith('chatHistory', {
        messages: []
      });
    });

    it('should return empty array if game not found', () => {
      getGame.mockReturnValue(null);

      eventHandlers.requestChatHistory({ gameCode: 'INVALID' });

      expect(mockSocket.emit).toHaveBeenCalledWith('chatHistory', {
        messages: []
      });
    });

    it('should use socket game code if not provided in data', () => {
      const chatHistory = [{ username: 'User1', message: 'Test', timestamp: 1000, isHost: false }];
      getGame.mockReturnValue({
        hostSocketId: 'host-socket',
        chatHistory
      });
      getGameBySocketId.mockReturnValue('EFGHIJ');

      eventHandlers.requestChatHistory({});

      expect(getGame).toHaveBeenCalledWith('EFGHIJ');
    });

    it('should not process when socket is migrating', () => {
      isSocketMigrating.mockReturnValue(true);

      eventHandlers.requestChatHistory({ gameCode: 'ABCDEF' });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('message timestamps', () => {
    it('should include timestamp in broadcast', async () => {
      const game = { hostSocketId: 'host-socket', users: {} };
      getGame.mockReturnValue(game);
      const beforeTime = Date.now();

      await eventHandlers.chatMessage({
        message: 'Hello',
        gameCode: 'ABCDEF'
      });

      const afterTime = Date.now();
      expect(broadcastToRoom).toHaveBeenCalled();
      const broadcastedData = broadcastToRoom.mock.calls[0][3];
      expect(broadcastedData.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(broadcastedData.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
