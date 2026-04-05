/**
 * Game Flow Integration Tests
 * Tests the complete game lifecycle from creation to results
 */

import { createGame, getGame, deleteGame, clearAllGames } from '../modules/gameStateManager';
import { validateWordOnBoard } from '../modules/wordValidator';
import { calculateWordScore } from '../modules/scoringEngine';
import { addBot, getGameBots, cleanupGameBots } from '../modules/botManager';
// Helper to create game data matching the actual API
function createGameData(hostUsername, options = {}) {
  return {
    hostSocketId: options.socketId || 'test-socket-id',
    hostUsername,
    hostPlayerId: options.playerId || null,
    roomName: options.roomName || hostUsername + " Room",
    language: options.language || 'en',
    isRanked: options.isRanked || false
  };
}

describe('Game Flow Integration', () => {

  afterEach(() => {
    // Clean up any test games
    const testCodes = ['TEST123', 'TEST001', 'TEST002', 'TEST003', 'TEST010',
                       'TEST011', 'TEST030', 'TEST031', 'TEST032', 'TEST033', 'TEST040'];
    testCodes.forEach(code => {
      try {
        cleanupGameBots(code);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    // Clear all games in test environment
    try {
      clearAllGames();
    } catch (e) {
      // Ignore if not in test environment
    }
  });

  describe('Game Creation', () => {

    test('creates game with valid host user', () => {
      const gameCode = 'TEST001';
      const gameData = createGameData('HostPlayer');
      const game = createGame(gameCode, gameData);

      expect(game).toBeDefined();
      expect(game.gameCode).toBe(gameCode);
      expect(game.gameState).toBe('waiting');
      expect(game.hostUsername).toBe('HostPlayer');
    });

    test('game has letter grid as null initially', () => {
      const gameCode = 'TEST002';
      const gameData = createGameData('HostPlayer');
      const game = createGame(gameCode, gameData);

      // letterGrid is null until game starts
      expect(game.letterGrid).toBeNull();
    });

    test('game settings have defaults', () => {
      const gameCode = 'TEST003';
      const gameData = createGameData('HostPlayer');
      const game = createGame(gameCode, gameData);

      expect(game.timerSeconds).toBeGreaterThan(0);
      expect(game.language).toBeDefined();
    });

  });

  describe('Player Management', () => {

    test('adds players to game', () => {
      const gameCode = 'TEST010';
      const gameData = createGameData('HostPlayer');
      const game = createGame(gameCode, gameData);

      // Add second player
      game.users['Player2'] = { socketId: 'socket-2', avatar: '🎮' };

      expect(Object.keys(game.users)).toHaveLength(1);
      expect(game.users['Player2']).toBeDefined();
    });

    test('host is correctly identified', () => {
      const gameCode = 'TEST011';
      const gameData = createGameData('HostPlayer');
      const game = createGame(gameCode, gameData);

      expect(game.hostUsername).toBe('HostPlayer');
    });

  });

  describe('Word Validation on Grid', () => {

    test('validates word exists on grid', () => {
      // Create a known grid for testing
      const testGrid = [
        ['C', 'A', 'T', 'S'],
        ['D', 'O', 'G', 'S'],
        ['R', 'A', 'T', 'E'],
        ['B', 'I', 'R', 'D']
      ];

      expect(validateWordOnBoard('cat', testGrid)).toBe(true);
      expect(validateWordOnBoard('dog', testGrid)).toBe(true);
      expect(validateWordOnBoard('rat', testGrid)).toBe(true);
      expect(validateWordOnBoard('bird', testGrid)).toBe(true);
    });

    test('rejects words not on grid', () => {
      const testGrid = [
        ['A', 'B', 'C', 'D'],
        ['E', 'F', 'G', 'H'],
        ['I', 'J', 'K', 'L'],
        ['M', 'N', 'O', 'P']
      ];

      expect(validateWordOnBoard('xyz', testGrid)).toBe(false);
      expect(validateWordOnBoard('zoo', testGrid)).toBe(false);
    });

    test('validates path requires adjacent cells', () => {
      const testGrid = [
        ['C', 'A', 'T', 'S'],
        ['X', 'X', 'X', 'X'],
        ['D', 'O', 'G', 'S'],
        ['X', 'X', 'X', 'X']
      ];

      // 'CAT' should work (adjacent horizontally)
      expect(validateWordOnBoard('cat', testGrid)).toBe(true);

      // 'COG' should not work (C and O are not adjacent)
      expect(validateWordOnBoard('cog', testGrid)).toBe(false);
    });

  });

  describe('Scoring System', () => {

    test('calculates score based on word length', () => {
      // New scoring formula: baseScore = length - 1 (each letter beyond first = 1 point)
      // 3-letter words: 3-1 = 2
      expect(calculateWordScore('cat', 0)).toBe(10);

      // 4-letter words: 4-1 = 3
      expect(calculateWordScore('cats', 0)).toBe(20);

      // 5-letter words: 5-1 = 4
      expect(calculateWordScore('catch', 0)).toBe(50);

      // 6-letter words: 6-1 = 5
      expect(calculateWordScore('cactus', 0)).toBe(100);

      // 7-letter words: 7-1 = 6
      expect(calculateWordScore('cabinet', 0)).toBe(200);

      // 8 letter words: 8-1 = 7
      expect(calculateWordScore('cabinets', 0)).toBe(500);
    });

    test('applies combo multiplier', () => {
      // With combo 5 on a 3-letter word: baseScore = 2, bonus = floor(5 * 0.2) = 1
      const baseScore = calculateWordScore('cat', 0);  // 2
      const comboScore = calculateWordScore('cat', 5); // 2 + 1 = 3

      expect(comboScore).toBeGreaterThan(baseScore);
    });

    test('combo bonus caps at level 10', () => {
      // For 3-letter words, bonus = floor(comboLevel * 0.2), caps at combo level 10
      const level10Score = calculateWordScore('cat', 10); // 2 + floor(10*0.2) = 2 + 2 = 4
      const level11Score = calculateWordScore('cat', 11); // 2 + floor(10*0.2) = 2 + 2 = 4 (capped)

      // Both should have same bonus since combo base caps at 10
      expect(level10Score).toBe(level11Score);
    });

  });

  describe('Bot Integration', () => {

    test('adds bot to game', () => {
      const gameCode = 'TEST030';
      const existingUsers = { 'HostPlayer': { username: 'HostPlayer' } };

      const bot = addBot(gameCode, 'medium', existingUsers);

      expect(bot).toBeDefined();
      expect(bot.isBot).toBe(true);
      expect(bot.difficulty).toBe('medium');
      expect(bot.username).toBeTruthy();
    });

    test('supports different difficulty levels', () => {
      const gameCode = 'TEST031';
      const existingUsers = {};

      const easyBot = addBot(gameCode, 'easy', existingUsers);
      expect(easyBot.difficulty).toBe('easy');

      const hardBot = addBot(gameCode, 'hard', existingUsers);
      expect(hardBot.difficulty).toBe('hard');

      cleanupGameBots(gameCode);
    });

    test('retrieves all game bots', () => {
      const gameCode = 'TEST032';
      const existingUsers = {};

      addBot(gameCode, 'easy', existingUsers);
      addBot(gameCode, 'medium', existingUsers);
      addBot(gameCode, 'hard', existingUsers);

      const bots = getGameBots(gameCode);
      expect(bots).toHaveLength(3);

      cleanupGameBots(gameCode);
    });

    test('cleans up bots properly', () => {
      const gameCode = 'TEST033';
      const existingUsers = {};

      addBot(gameCode, 'medium', existingUsers);
      addBot(gameCode, 'hard', existingUsers);

      cleanupGameBots(gameCode);

      const bots = getGameBots(gameCode);
      expect(bots).toHaveLength(0);
    });

  });

  describe('Complete Game Flow', () => {

    test('simulates full game lifecycle', () => {
      // 1. Create game
      const gameCode = 'TEST040';
      const gameData = createGameData('HostPlayer');
      const game = createGame(gameCode, gameData);

      expect(game.gameState).toBe('waiting');

      // 2. Add players
      game.users['Player2'] = { socketId: 'socket-2', avatar: '🎮' };
      game.users['Player3'] = { socketId: 'socket-3', avatar: '🎯' };

      expect(Object.keys(game.users)).toHaveLength(2);

      // 3. Add a bot
      const bot = addBot(gameCode, 'medium', game.users);
      game.users[bot.username] = {
        username: bot.username,
        avatar: bot.avatar,
        isBot: true
      };

      expect(Object.keys(game.users)).toHaveLength(3);

      // 4. Start game (set state and grid)
      game.gameState = 'in-progress';
      game.letterGrid = [
        ['T', 'E', 'S', 'T'],
        ['W', 'O', 'R', 'D'],
        ['G', 'A', 'M', 'E'],
        ['P', 'L', 'A', 'Y']
      ];
      game.gameStartTime = Date.now();

      expect(game.gameState).toBe('in-progress');

      // 5. Simulate word submissions
      const testWord = 'test';
      if (validateWordOnBoard(testWord, game.letterGrid)) {
        const score = calculateWordScore(testWord, 0);
        game.playerScores['HostPlayer'] = (game.playerScores['HostPlayer'] || 0) + score;
      }

      expect(game.playerScores['HostPlayer']).toBeGreaterThan(0);

      // 6. End game
      game.gameState = 'finished';

      expect(game.gameState).toBe('finished');

      // 7. Cleanup
      cleanupGameBots(gameCode);
    });

  });

});
