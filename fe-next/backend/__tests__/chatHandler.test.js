/**
 * Chat Handler Tests
 * Tests for chat message handling and chat history functionality
 */

// Must mock before requiring the module
jest.mock('../modules/gameStateManager');
jest.mock('../utils/socketHelpers');
jest.mock('../utils/profanityFilter');
jest.mock('../utils/errorHandler');
jest.mock('../utils/rateLimiter');
jest.mock('../utils/metrics');
jest.mock('../handlers/shared');
jest.mock('../utils/socketValidation');

const { registerChatHandlers } = require('../handlers/chatHandler');
const { getGame, getGameBySocketId, getUsernameBySocketId } = require('../modules/gameStateManager');
const { volatileBroadcastToRoom, getGameRoom } = require('../utils/socketHelpers');
const { cleanProfanity } = require('../utils/profanityFilter');
const { emitError, ErrorMessages } = require('../utils/errorHandler');
const { checkRateLimit } = require('../utils/rateLimiter');
const { inc } = require('../utils/metrics');
const { isSocketMigrating } = require('../handlers/shared');
const { validatePayload, chatMessageSchema } = require('../utils/socketValidation');

describe('Chat Handler', () => {
  let mockIo;
  let mockSocket;
  let eventHandlers;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup event handler capture
    eventHandlers = {};
    mockSocket = {
      id: 'socket-123',
      on: jest.fn((event, handler) => {
        eventHandlers[event] = handler;
      }),
      emit: jest.fn()
    };
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
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

    it('should broadcast chat message to room', () => {
      const game = { hostSocketId: 'host-socket', users: {} };
      getGame.mockReturnValue(game);

      eventHandlers.chatMessage({
        message: 'Hello world',
        gameCode: 'ABCDEF'
      });

      expect(volatileBroadcastToRoom).toHaveBeenCalledWith(
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

    it('should store message in game chat history', () => {
      const game = { hostSocketId: 'host-socket', users: {} };
      getGame.mockReturnValue(game);

      eventHandlers.chatMessage({
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

    it('should mark host messages correctly', () => {
      const game = { hostSocketId: 'socket-123', users: {} };
      getGame.mockReturnValue(game);

      eventHandlers.chatMessage({
        message: 'Hello from host',
        gameCode: 'ABCDEF'
      });

      expect(volatileBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'game:ABCDEF',
        'chatMessage',
        expect.objectContaining({
          username: 'Host',
          isHost: true
        })
      );
    });

    it('should limit chat history to 100 messages', () => {
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

      eventHandlers.chatMessage({
        message: 'New message',
        gameCode: 'ABCDEF'
      });

      expect(game.chatHistory.length).toBe(100);
      expect(game.chatHistory[99].message).toBe('New message');
    });

    it('should emit error if game not found', () => {
      getGame.mockReturnValue(null);

      eventHandlers.chatMessage({
        message: 'Hello',
        gameCode: 'INVALID'
      });

      expect(emitError).toHaveBeenCalled();
      expect(volatileBroadcastToRoom).not.toHaveBeenCalled();
    });

    it('should check rate limit and block if exceeded', () => {
      checkRateLimit.mockReturnValue(false);

      eventHandlers.chatMessage({
        message: 'Hello',
        gameCode: 'ABCDEF'
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('rateLimited');
      expect(volatileBroadcastToRoom).not.toHaveBeenCalled();
    });

    it('should not process when socket is migrating', () => {
      isSocketMigrating.mockReturnValue(true);

      eventHandlers.chatMessage({
        message: 'Hello',
        gameCode: 'ABCDEF'
      });

      expect(volatileBroadcastToRoom).not.toHaveBeenCalled();
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
    it('should include timestamp in broadcast', () => {
      const game = { hostSocketId: 'host-socket', users: {} };
      getGame.mockReturnValue(game);
      const beforeTime = Date.now();

      eventHandlers.chatMessage({
        message: 'Hello',
        gameCode: 'ABCDEF'
      });

      const afterTime = Date.now();
      expect(volatileBroadcastToRoom).toHaveBeenCalled();
      const broadcastedData = volatileBroadcastToRoom.mock.calls[0][3];
      expect(broadcastedData.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(broadcastedData.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
