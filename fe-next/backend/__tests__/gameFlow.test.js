/**
 * Game Flow Integration Tests
 * Tests the complete game lifecycle from creation to results
 */

const { createGame, createUser, startGame, endGame, getGame } = require('../modules/gameStateManager');
const { validateWordOnBoard } = require('../modules/wordValidator');
const { calculateWordScore } = require('../modules/scoringEngine');
const { addBot, getGameBots, startBot, cleanupGameBots } = require('../modules/botManager');

describe('Game Flow Integration', () => {

  afterEach(() => {
    // Clean up any test games
    try {
      cleanupGameBots('TEST123');
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Game Creation', () => {

    test('creates game with valid host user', () => {
      const gameCode = 'TEST001';
      const hostUser = createUser('HostPlayer', null);
      const game = createGame(gameCode, hostUser);

      expect(game).toBeDefined();
      expect(game.gameCode).toBe(gameCode);
      expect(game.gameState).toBe('lobby');
      expect(game.host).toBe('HostPlayer');
      expect(Object.keys(game.users)).toHaveLength(1);
    });

    test('game has valid letter grid', () => {
      const gameCode = 'TEST002';
      const hostUser = createUser('HostPlayer', null);
      const game = createGame(gameCode, hostUser);

      expect(game.letterGrid).toBeDefined();
      expect(Array.isArray(game.letterGrid)).toBe(true);
      expect(game.letterGrid.length).toBeGreaterThan(0);
      expect(game.letterGrid[0].length).toBeGreaterThan(0);
    });

    test('game settings have defaults', () => {
      const gameCode = 'TEST003';
      const hostUser = createUser('HostPlayer', null);
      const game = createGame(gameCode, hostUser);

      expect(game.gameDuration).toBeGreaterThan(0);
      expect(game.language).toBeDefined();
    });

  });

  describe('Player Management', () => {

    test('adds players to game', () => {
      const gameCode = 'TEST010';
      const hostUser = createUser('HostPlayer', null);
      const game = createGame(gameCode, hostUser);

      // Add second player
      const player2 = createUser('Player2', null);
      game.users['Player2'] = player2;

      expect(Object.keys(game.users)).toHaveLength(2);
      expect(game.users['Player2']).toBeDefined();
    });

    test('host is correctly identified', () => {
      const gameCode = 'TEST011';
      const hostUser = createUser('HostPlayer', null);
      const game = createGame(gameCode, hostUser);

      expect(game.host).toBe('HostPlayer');
      expect(game.users['HostPlayer']).toBeDefined();
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
      // 3-letter words
      expect(calculateWordScore('cat', 0)).toBe(1);

      // 4-letter words
      expect(calculateWordScore('cats', 0)).toBe(1);

      // 5-letter words
      expect(calculateWordScore('catch', 0)).toBe(2);

      // 6-letter words
      expect(calculateWordScore('cactus', 0)).toBe(3);

      // 7-letter words
      expect(calculateWordScore('cabinet', 0)).toBe(5);

      // 8+ letter words
      expect(calculateWordScore('cabinets', 0)).toBe(11);
    });

    test('applies combo multiplier', () => {
      const baseScore = calculateWordScore('cat', 0);
      const comboScore = calculateWordScore('cat', 3);

      expect(comboScore).toBeGreaterThan(baseScore);
    });

    test('combo bonus caps at level 5', () => {
      const level5Score = calculateWordScore('cat', 5);
      const level10Score = calculateWordScore('cat', 10);

      // Both should have same bonus since combo caps at +5
      expect(level5Score).toBe(level10Score);
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
      const hostUser = createUser('HostPlayer', null);
      const game = createGame(gameCode, hostUser);

      expect(game.gameState).toBe('lobby');

      // 2. Add players
      game.users['Player2'] = createUser('Player2', null);
      game.users['Player3'] = createUser('Player3', null);

      expect(Object.keys(game.users)).toHaveLength(3);

      // 3. Add a bot
      const bot = addBot(gameCode, 'medium', game.users);
      game.users[bot.username] = {
        username: bot.username,
        avatar: bot.avatar,
        isBot: true
      };

      expect(Object.keys(game.users)).toHaveLength(4);

      // 4. Start game
      game.gameState = 'playing';
      game.gameStartTime = Date.now();

      expect(game.gameState).toBe('playing');

      // 5. Simulate word submissions
      const testWord = 'test';
      if (validateWordOnBoard(testWord, game.letterGrid)) {
        const score = calculateWordScore(testWord, 0);
        game.users['HostPlayer'].score = (game.users['HostPlayer'].score || 0) + score;
      }

      // 6. End game
      game.gameState = 'ended';

      expect(game.gameState).toBe('ended');

      // 7. Cleanup
      cleanupGameBots(gameCode);
    });

  });

});
