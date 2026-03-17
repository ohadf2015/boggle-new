/**
 * Bot Score Cap Tests
 *
 * Verifies that bots never outscore the best human player.
 */

import { getBestHumanScore, shouldBotScore } from '../botGame';

// Mock gameStateManager
jest.mock('../../../modules/gameStateManager', () => ({
  getLeaderboard: jest.fn(),
  addPlayerWord: jest.fn(),
  updatePlayerScore: jest.fn(),
  trackBotWord: jest.fn(),
}));

// Mock botManager
jest.mock('../../../modules/botManager', () => ({
  getGameBots: jest.fn(() => []),
  startBot: jest.fn(),
  isBot: jest.fn(),
}));

// Mock socketHelpers
jest.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  getGameRoom: jest.fn((code: string) => `room:${code}`),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { getLeaderboard } = require('../../../modules/gameStateManager');
const { isBot } = require('../../../modules/botManager');

describe('Bot Score Cap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBestHumanScore', () => {
    it('returns 0 when no humans have scored', () => {
      getLeaderboard.mockReturnValue([
        { username: 'Bot1', score: 50, isBot: true },
      ]);
      isBot.mockReturnValue(true);

      expect(getBestHumanScore('GAME1')).toBe(0);
    });

    it('returns best human score ignoring bots', () => {
      getLeaderboard.mockReturnValue([
        { username: 'Bot1', score: 100, isBot: true },
        { username: 'Alice', score: 45, isBot: false },
        { username: 'Bob', score: 30, isBot: false },
      ]);

      expect(getBestHumanScore('GAME1')).toBe(45);
    });

    it('returns 0 when leaderboard is empty', () => {
      getLeaderboard.mockReturnValue([]);

      expect(getBestHumanScore('GAME1')).toBe(0);
    });
  });

  describe('shouldBotScore', () => {
    it('allows bot to score when below best human', () => {
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 50, isBot: false },
        { username: 'TestBot', score: 20, isBot: true },
      ]);

      expect(shouldBotScore('GAME1', 'TestBot', 20, 10)).toBe(true);
    });

    it('blocks bot from exceeding best human score', () => {
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 30, isBot: false },
        { username: 'TestBot', score: 28, isBot: true },
      ]);

      // Bot at 28, wants to add 10 = 38 > 30
      expect(shouldBotScore('GAME1', 'TestBot', 28, 10)).toBe(false);
    });

    it('allows small buffer when no human has scored yet', () => {
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 0, isBot: false },
        { username: 'TestBot', score: 5, isBot: true },
      ]);

      // Bot at 5, wants to add 5 = 10 <= BOT_SCORE_BUFFER (20)
      expect(shouldBotScore('GAME1', 'TestBot', 5, 5)).toBe(true);
    });

    it('blocks bot beyond buffer when no human has scored', () => {
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 0, isBot: false },
        { username: 'TestBot', score: 18, isBot: true },
      ]);

      // Bot at 18, wants to add 5 = 23 > BOT_SCORE_BUFFER (20)
      expect(shouldBotScore('GAME1', 'TestBot', 18, 5)).toBe(false);
    });

    it('allows scoring up to exactly the human score', () => {
      getLeaderboard.mockReturnValue([
        { username: 'Alice', score: 40, isBot: false },
        { username: 'TestBot', score: 35, isBot: true },
      ]);

      // Bot at 35, wants to add 5 = 40 === 40 (equal is OK)
      expect(shouldBotScore('GAME1', 'TestBot', 35, 5)).toBe(true);
    });
  });
});
