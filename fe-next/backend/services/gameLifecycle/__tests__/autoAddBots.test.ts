/**
 * Auto-Add Bots Tests
 *
 * Verifies that bots are automatically added when a solo player starts a game.
 */

import { autoAddBotsForSoloPlayer } from '../autoAddBots';

// Mock gameStateManager
jest.mock('../../../modules/gameStateManager', () => ({
  addUserToGame: jest.fn(),
  getGameUsers: jest.fn(() => []),
}));

// Mock botManager
jest.mock('../../../modules/botManager', () => ({
  getGameBots: jest.fn(),
  addBot: jest.fn(),
  addBotWithAdaptiveDifficulty: jest.fn(),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { addUserToGame } = require('../../../modules/gameStateManager');
const botManager = require('../../../modules/botManager');

function setupBotMocks() {
  let callCount = 0;

  botManager.getGameBots.mockReturnValue([]);

  botManager.addBot.mockImplementation((_gc: string, difficulty: string) => {
    callCount++;
    return {
      id: `bot-${callCount}`,
      username: `TestBot-${difficulty}-${callCount}`,
      difficulty,
      avatar: { avatarImage: 'pizza', emoji: '⚙️', color: '#ff0000' },
    };
  });

  botManager.addBotWithAdaptiveDifficulty.mockImplementation(async (_gc: string, _uid?: string) => {
    callCount++;
    return {
      id: `bot-adaptive-${callCount}`,
      username: `AdaptiveBot-${callCount}`,
      difficulty: 'medium',
      avatar: { avatarImage: 'pizza', emoji: '⚙️', color: '#ff0000' },
    };
  });
}

describe('autoAddBotsForSoloPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupBotMocks();
  });

  it('adds bots when solo human player starts game', async () => {
    const game = {
      users: {
        'Alice': { socketId: 'sock1', isHost: true, isBot: false, authUserId: null },
      },
      language: 'en',
    };

    const result = await autoAddBotsForSoloPlayer('GAME1', game as any);

    expect(result.botsAdded).toBeGreaterThanOrEqual(2);
    expect(result.botsAdded).toBeLessThanOrEqual(3);
    expect(addUserToGame).toHaveBeenCalled();
  });

  it('does NOT add bots when 2+ human players exist', async () => {
    const game = {
      users: {
        'Alice': { socketId: 'sock1', isHost: true, isBot: false },
        'Bob': { socketId: 'sock2', isHost: false, isBot: false },
      },
      language: 'en',
    };

    const result = await autoAddBotsForSoloPlayer('GAME1', game as any);

    expect(result.botsAdded).toBe(0);
    expect(addUserToGame).not.toHaveBeenCalled();
  });

  it('does NOT add bots when bots already exist', async () => {
    botManager.getGameBots.mockReturnValue([{ id: 'bot-1', username: 'ExistingBot' }]);

    const game = {
      users: {
        'Alice': { socketId: 'sock1', isHost: true, isBot: false },
        'ExistingBot': { socketId: 'bot-bot-1', isHost: false, isBot: true },
      },
      language: 'en',
    };

    const result = await autoAddBotsForSoloPlayer('GAME1', game as any);

    expect(result.botsAdded).toBe(0);
  });

  it('uses adaptive difficulty when host has authUserId', async () => {
    const game = {
      users: {
        'Alice': { socketId: 'sock1', isHost: true, isBot: false, authUserId: 'user-123' },
      },
      language: 'en',
    };

    await autoAddBotsForSoloPlayer('GAME1', game as any);

    expect(botManager.addBotWithAdaptiveDifficulty).toHaveBeenCalledWith(
      'GAME1',
      'user-123',
      expect.any(String),
      expect.any(Object),
      'en'
    );
  });

  it('falls back to addBot when no authUserId', async () => {
    const game = {
      users: {
        'Alice': { socketId: 'sock1', isHost: true, isBot: false, authUserId: null },
      },
      language: 'en',
    };

    await autoAddBotsForSoloPlayer('GAME1', game as any);

    expect(botManager.addBot).toHaveBeenCalled();
  });

  it('marks added bots in game.users', async () => {
    const game = {
      users: {
        'Alice': { socketId: 'sock1', isHost: true, isBot: false, authUserId: null },
      } as Record<string, any>,
      language: 'en',
    };

    // Simulate addUserToGame adding the bot to game.users
    addUserToGame.mockImplementation((_gc: string, username: string) => {
      game.users[username] = { socketId: `bot-${username}`, isHost: false };
    });

    await autoAddBotsForSoloPlayer('GAME1', game as any);

    // Bots should be marked with isBot and botDifficulty
    const botEntries = Object.entries(game.users).filter(([, u]: [string, any]) => u.isBot);
    expect(botEntries.length).toBeGreaterThanOrEqual(2);
  });

  it('skips disconnected players when counting humans', async () => {
    const game = {
      users: {
        'Alice': { socketId: 'sock1', isHost: true, isBot: false },
        'Bob': { socketId: 'sock2', isHost: false, isBot: false, disconnected: true },
      },
      language: 'en',
    };

    const result = await autoAddBotsForSoloPlayer('GAME1', game as any);

    // Bob is disconnected so Alice is solo — bots should be added
    expect(result.botsAdded).toBeGreaterThanOrEqual(2);
  });
});
