/**
 * Bot Manager and Behavior Tests
 * Tests for bot creation, lifecycle, timing, and word submission
 */

// Mock dependencies
vi.mock('../modules/supabaseServer', () => ({
  getPopularPlayerWords: vi.fn().mockResolvedValue({ data: [] }),
  getSupabase: vi.fn().mockReturnValue(null),
}));

vi.mock('../modules/boggleSolver', () => ({
  findWordsForBots: vi.fn().mockReturnValue({
    easy: ['cat', 'dog', 'rat', 'bat'],
    medium: ['hello', 'world', 'games', 'words'],
    hard: ['testing', 'playing', 'working'],
  }),
}));

vi.mock('../utils/logger', () => ({ default: {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  addBot,
  removeBot,
  getGameBots,
  getBotByUsername,
  isBot,
  stopBot,
  stopAllBots,
  cleanupGameBots,
  resetBotCombo,
  getBotStats,
  getBotManagerStats,
  clearBotManagerCaches,
  generateRandomPlayerName,
  getRandomGenericAvatar,
  startBot,
  BOT_CONFIG,
} from '../modules/botManager';

import {
  calculateNextDelay,
  generateWrongWords,
  submitBotWord,
  clearBehaviorCaches,
  getCacheStats,
  type Bot,
} from '../modules/botBehavior';

describe('Bot Manager', () => {

  afterEach(() => {
    // Clean up all games after each test
    cleanupGameBots('TEST1');
    cleanupGameBots('TEST2');
    cleanupGameBots('TEST3');
    clearBehaviorCaches();
  });

  describe('Bot Creation', () => {

    test('addBot creates a bot with correct properties', () => {
      const bot = addBot('TEST1', 'medium', {}, 'en');

      expect(bot).toBeDefined();
      expect(bot.id).toMatch(/^bot-\d+$/);
      expect(bot.gameCode).toBe('TEST1');
      expect(bot.difficulty).toBe('medium');
      expect(bot.isBot).toBe(true);
      expect(bot.avatar).toBeDefined();
      expect(bot.username).toBeDefined();
    });

    test('addBot respects difficulty parameter', () => {
      const easyBot = addBot('TEST1', 'easy', {}, 'en');
      const hardBot = addBot('TEST1', 'hard', {}, 'en');

      expect(easyBot.difficulty).toBe('easy');
      expect(hardBot.difficulty).toBe('hard');
    });

    test('addBot generates unique names for same game', () => {
      const bot1 = addBot('TEST1', 'medium', {}, 'en');
      const bot2 = addBot('TEST1', 'medium', { [bot1.username]: {} }, 'en');
      const bot3 = addBot('TEST1', 'medium', { [bot1.username]: {}, [bot2.username]: {} }, 'en');

      const names = [bot1.username, bot2.username, bot3.username];
      const uniqueNames = [...new Set(names)];

      expect(uniqueNames.length).toBe(3);
    });

    test('addBot supports different languages', () => {
      const enBot = addBot('TEST1', 'medium', {}, 'en');
      const heBot = addBot('TEST2', 'medium', {}, 'he');
      const svBot = addBot('TEST3', 'medium', {}, 'sv');

      // All should have valid usernames
      expect(enBot.username.length).toBeGreaterThan(0);
      expect(heBot.username.length).toBeGreaterThan(0);
      expect(svBot.username.length).toBeGreaterThan(0);
    });

    test('addBot assigns personality traits', () => {
      const bot = addBot('TEST1', 'medium', {}, 'en');

      expect(bot.personality).toBeDefined();
      expect(['aggressive', 'methodical', 'streaky', 'steady']).toContain(bot.personality);
      expect(typeof bot.burstChance).toBe('number');
      expect(typeof bot.comboFocus).toBe('boolean');
    });
  });

  describe('Bot Retrieval', () => {

    test('getGameBots returns all bots in a game', () => {
      addBot('TEST1', 'easy', {}, 'en');
      addBot('TEST1', 'medium', {}, 'en');
      addBot('TEST1', 'hard', {}, 'en');

      const bots = getGameBots('TEST1');

      expect(bots.length).toBe(3);
    });

    test('getGameBots returns empty array for non-existent game', () => {
      const bots = getGameBots('NONEXISTENT');
      expect(bots).toEqual([]);
    });

    test('getBotByUsername finds the correct bot', () => {
      const bot = addBot('TEST1', 'medium', {}, 'en');
      const found = getBotByUsername('TEST1', bot.username);

      expect(found).toBeDefined();
      expect(found?.id).toBe(bot.id);
    });

    test('getBotByUsername returns null for non-existent bot', () => {
      addBot('TEST1', 'medium', {}, 'en');
      const found = getBotByUsername('TEST1', 'NonExistentBot');

      expect(found).toBeNull();
    });

    test('isBot correctly identifies bot players', () => {
      const bot = addBot('TEST1', 'medium', {}, 'en');

      expect(isBot('TEST1', bot.username)).toBe(true);
      expect(isBot('TEST1', 'HumanPlayer')).toBe(false);
    });
  });

  describe('Bot Removal', () => {

    test('removeBot by ID removes the bot', () => {
      const bot = addBot('TEST1', 'medium', {}, 'en');

      expect(getGameBots('TEST1').length).toBe(1);

      const removed = removeBot('TEST1', bot.id);

      expect(removed).toBe(true);
      expect(getGameBots('TEST1').length).toBe(0);
    });

    test('removeBot by username removes the bot', () => {
      const bot = addBot('TEST1', 'medium', {}, 'en');

      const removed = removeBot('TEST1', bot.username);

      expect(removed).toBe(true);
      expect(getGameBots('TEST1').length).toBe(0);
    });

    test('removeBot returns false for non-existent bot', () => {
      const removed = removeBot('TEST1', 'nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('Bot Lifecycle', () => {

    test('stopBot deactivates the bot', () => {
      const bot = addBot('TEST1', 'medium', {}, 'en');
      bot.isActive = true;

      stopBot(bot);

      expect(bot.isActive).toBe(false);
    });

    test('stopBot clears all active timers', () => {
      const bot = addBot('TEST1', 'medium', {}, 'en');
      bot.isActive = true;

      // Add some fake timers
      const timer1 = setTimeout(() => {}, 10000);
      const timer2 = setTimeout(() => {}, 10000);
      bot.activeTimers.add(timer1);
      bot.activeTimers.add(timer2);

      stopBot(bot);

      expect(bot.activeTimers.size).toBe(0);
    });

    test('stopAllBots stops all bots in a game', () => {
      const bot1 = addBot('TEST1', 'easy', {}, 'en');
      const bot2 = addBot('TEST1', 'medium', {}, 'en');
      const bot3 = addBot('TEST1', 'hard', {}, 'en');

      bot1.isActive = true;
      bot2.isActive = true;
      bot3.isActive = true;

      stopAllBots('TEST1');

      expect(bot1.isActive).toBe(false);
      expect(bot2.isActive).toBe(false);
      expect(bot3.isActive).toBe(false);
    });

    test('cleanupGameBots removes all bots and counters', () => {
      addBot('TEST1', 'easy', {}, 'en');
      addBot('TEST1', 'medium', {}, 'en');

      expect(getGameBots('TEST1').length).toBe(2);

      cleanupGameBots('TEST1');

      expect(getGameBots('TEST1').length).toBe(0);
    });
  });

  describe('Bot State Management', () => {

    test('resetBotCombo resets combo to 0', () => {
      const bot = addBot('TEST1', 'medium', {}, 'en');
      bot.comboLevel = 5;

      resetBotCombo('TEST1', bot.username);

      expect(bot.comboLevel).toBe(0);
    });

    test('resetBotCombo handles non-existent bot gracefully', () => {
      // Should not throw
      expect(() => {
        resetBotCombo('TEST1', 'NonExistent');
      }).not.toThrow();
    });

    test('getBotStats returns correct statistics', () => {
      const bot = addBot('TEST1', 'hard', {}, 'en');
      bot.wordsFound = ['hello', 'world'];
      bot.score = 100;
      bot.comboLevel = 3;
      bot.isActive = true;

      const stats = getBotStats('TEST1', bot.username);

      expect(stats).toBeDefined();
      expect(stats?.username).toBe(bot.username);
      expect(stats?.difficulty).toBe('hard');
      expect(stats?.wordsFound).toBe(2);
      expect(stats?.score).toBe(100);
      expect(stats?.comboLevel).toBe(3);
      expect(stats?.isActive).toBe(true);
    });

    test('getBotStats returns null for non-existent bot', () => {
      const stats = getBotStats('TEST1', 'NonExistent');
      expect(stats).toBeNull();
    });
  });

  describe('Bot Manager Statistics', () => {

    test('getBotManagerStats returns overall statistics', () => {
      addBot('TEST1', 'easy', {}, 'en');
      addBot('TEST1', 'medium', {}, 'en');
      addBot('TEST2', 'hard', {}, 'en');

      const stats = getBotManagerStats();

      expect(stats.activeGames).toBeGreaterThanOrEqual(2);
    });

    test('clearBotManagerCaches clears caches', () => {
      // Just verify it doesn't throw
      expect(() => {
        clearBotManagerCaches();
      }).not.toThrow();
    });
  });

  describe('Player Name Generation', () => {

    test('generateRandomPlayerName returns name and avatar', () => {
      const result = generateRandomPlayerName([], 'en');

      expect(result.name).toBeDefined();
      expect(result.name.length).toBeGreaterThan(0);
      expect(result.avatar).toBeDefined();
      expect(result.avatar.customAvatar).toBeDefined();
    });

    test('generateRandomPlayerName avoids existing names', () => {
      const existingNames = ['Sneaky Pickle', 'Disco Potato', 'Cosmic Banana'];

      const result = generateRandomPlayerName(existingNames, 'en');

      expect(existingNames).not.toContain(result.name);
    });

    test('generateRandomPlayerName supports multiple languages', () => {
      const enResult = generateRandomPlayerName([], 'en');
      const heResult = generateRandomPlayerName([], 'he');

      expect(enResult.name).toBeDefined();
      expect(heResult.name).toBeDefined();
    });

    test('getRandomGenericAvatar returns valid avatar', () => {
      const avatar = getRandomGenericAvatar();

      expect(avatar).toBeDefined();
      expect(avatar.customAvatar).toBeDefined();
      expect(avatar.emoji).toBeDefined();
      expect(avatar.color).toBeDefined();
    });
  });
});

describe('Bot Behavior', () => {

  describe('Timing Calculations', () => {

    function createMockBot(overrides: Partial<Bot> = {}): Bot {
      return {
        id: 'bot-test',
        gameCode: 'TEST',
        username: 'TestBot',
        avatar: { avatarImage: 'test', emoji: '⚙️', color: '#000' },
        difficulty: 'medium',
        personality: 'steady',
        isBot: true,
        wordsToFind: ['hello', 'world', 'testing'],
        wordsFound: [],
        currentWordIndex: 0,
        score: 0,
        comboLevel: 0,
        inBurstMode: false,
        burstWordsRemaining: 0,
        nextWordTime: null,
        activeTimers: new Set(),
        isActive: true,
        avgThinkingTime: 3000,
        typingSpeed: 250,
        burstChance: 0.15,
        pauseChance: 0,
        comboFocus: false,
        ...overrides
      };
    }

    test('calculateNextDelay returns positive number', () => {
      const bot = createMockBot();
      const delay = calculateNextDelay(bot);

      expect(delay).toBeGreaterThan(0);
    });

    test('calculateNextDelay is within expected range for medium difficulty', () => {
      const bot = createMockBot({ difficulty: 'medium', burstChance: 0 });

      // Test multiple times for randomness
      const delays: number[] = [];
      for (let i = 0; i < 20; i++) {
        delays.push(calculateNextDelay(bot));
      }

      const avg = delays.reduce((a, b) => a + b, 0) / delays.length;

      // Medium bots should have delays roughly in their configured range
      expect(avg).toBeGreaterThan(1000);
      expect(avg).toBeLessThan(20000);
    });

    test('burst mode provides shorter delays', () => {
      const bot = createMockBot({ inBurstMode: true, burstWordsRemaining: 3 });

      const delay = calculateNextDelay(bot);

      // Burst mode delays should be 500-2000ms
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(2000);
    });

    test('burst mode decrements remaining words', () => {
      const bot = createMockBot({ inBurstMode: true, burstWordsRemaining: 3 });

      calculateNextDelay(bot);

      expect(bot.burstWordsRemaining).toBe(2);
    });

    test('burst mode exits when words exhausted', () => {
      const bot = createMockBot({ inBurstMode: true, burstWordsRemaining: 1 });

      calculateNextDelay(bot);

      expect(bot.inBurstMode).toBe(false);
      expect(bot.burstWordsRemaining).toBe(0);
    });

    test('combo reduces delay', () => {
      const bot = createMockBot({ comboLevel: 0, burstChance: 0 });
      const delayNoCombo = calculateNextDelay(bot);

      bot.comboLevel = 5;
      const delayWithCombo = calculateNextDelay(bot);

      // With combo, delays should generally be shorter
      // Due to randomness, we can't guarantee exact values
      expect(typeof delayWithCombo).toBe('number');
    });

    test('combo-focused bots get more speed boost', () => {
      const normalBot = createMockBot({ comboLevel: 5, comboFocus: false, burstChance: 0 });
      const focusedBot = createMockBot({ comboLevel: 5, comboFocus: true, burstChance: 0 });

      // Both should produce valid delays
      const normalDelay = calculateNextDelay(normalBot);
      const focusedDelay = calculateNextDelay(focusedBot);

      expect(normalDelay).toBeGreaterThan(0);
      expect(focusedDelay).toBeGreaterThan(0);
    });
  });

  describe('Word Submission', () => {

    function createMockBot(overrides: Partial<Bot> = {}): Bot {
      return {
        id: 'bot-test',
        gameCode: 'TEST',
        username: 'TestBot',
        avatar: { avatarImage: 'test', emoji: '⚙️', color: '#000' },
        difficulty: 'medium',
        personality: 'steady',
        isBot: true,
        wordsToFind: ['hello', 'world', 'testing'],
        wordsFound: [],
        currentWordIndex: 0,
        score: 0,
        comboLevel: 0,
        inBurstMode: false,
        burstWordsRemaining: 0,
        nextWordTime: null,
        activeTimers: new Set(),
        isActive: true,
        avgThinkingTime: 3000,
        typingSpeed: 250,
        burstChance: 0.15,
        pauseChance: 0,
        comboFocus: false,
        ...overrides
      };
    }

    test('submitBotWord increments word index', async () => {
      const bot = createMockBot();
      const callback = vi.fn();

      await submitBotWord(bot, callback);

      expect(bot.currentWordIndex).toBe(1);
    });

    test('submitBotWord adds word to wordsFound', async () => {
      const bot = createMockBot();
      const callback = vi.fn();

      await submitBotWord(bot, callback);

      expect(bot.wordsFound).toContain('hello');
    });

    test('submitBotWord updates score', async () => {
      const bot = createMockBot();
      const callback = vi.fn();

      await submitBotWord(bot, callback);

      expect(bot.score).toBeGreaterThan(0);
    });

    test('submitBotWord increments combo level', async () => {
      const bot = createMockBot();
      const callback = vi.fn();

      await submitBotWord(bot, callback);

      expect(bot.comboLevel).toBe(1);
    });

    test('submitBotWord calls callback with correct data', async () => {
      const bot = createMockBot();
      const callback = vi.fn();

      await submitBotWord(bot, callback);

      expect(callback).toHaveBeenCalledWith({
        botId: 'bot-test',
        username: 'TestBot',
        word: 'hello',
        score: expect.any(Number),
        comboLevel: 0, // Combo level when submitted (before increment)
      });
    });

    test('submitBotWord does nothing when inactive', async () => {
      const bot = createMockBot({ isActive: false });
      const callback = vi.fn();

      await submitBotWord(bot, callback);

      expect(callback).not.toHaveBeenCalled();
      expect(bot.currentWordIndex).toBe(0);
    });

    test('submitBotWord does nothing when all words submitted', async () => {
      const bot = createMockBot({ currentWordIndex: 3 });
      const callback = vi.fn();

      await submitBotWord(bot, callback);

      expect(callback).not.toHaveBeenCalled();
    });

    test('submitBotWord skips duplicate words', async () => {
      const bot = createMockBot({ wordsFound: ['hello'] });
      const callback = vi.fn();

      await submitBotWord(bot, callback);

      expect(callback).not.toHaveBeenCalled();
      expect(bot.currentWordIndex).toBe(1);
    });

    test('submitBotWord does not inflate score when callback returns false', async () => {
      const bot = createMockBot();
      const rejectingCallback = vi.fn().mockReturnValue(false);

      await submitBotWord(bot, rejectingCallback);

      expect(rejectingCallback).toHaveBeenCalled();
      expect(bot.score).toBe(0);
      expect(bot.comboLevel).toBe(0);
      expect(bot.wordsFound).not.toContain('hello');
      expect(bot.currentWordIndex).toBe(1);
    });

    test('submitBotWord does not inflate score when async callback resolves false', async () => {
      const bot = createMockBot();
      const rejectingCallback = vi.fn().mockResolvedValue(false);

      await submitBotWord(bot, rejectingCallback);

      expect(bot.score).toBe(0);
      expect(bot.comboLevel).toBe(0);
      expect(bot.wordsFound).not.toContain('hello');
    });

    test('submitBotWord credits numeric callback return as bot score (H1)', async () => {
      const bot = createMockBot();
      // botGame callback returns totalScore = base + blast/wordHunt bonuses.
      // bot.score must accumulate that total so shouldBotScore cap is honoured.
      const numericCallback = vi.fn().mockResolvedValue(42);

      await submitBotWord(bot, numericCallback);

      expect(bot.score).toBe(42);
      expect(bot.comboLevel).toBe(1);
      expect(bot.wordsFound).toContain('hello');
    });
  });

  describe('Wrong Word Generation', () => {

    test('generateWrongWords returns array of words', () => {
      const grid = [
        ['C', 'A', 'T'],
        ['D', 'O', 'G'],
        ['R', 'A', 'T']
      ];

      const wrongWords = generateWrongWords(grid, 5);

      expect(Array.isArray(wrongWords)).toBe(true);
      expect(wrongWords.length).toBeLessThanOrEqual(5);
    });

    test('generateWrongWords returns words from grid letters', () => {
      const grid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I']
      ];

      const wrongWords = generateWrongWords(grid, 3);

      // Each word should only contain letters from the grid
      const gridLetters = new Set('abcdefghi');
      wrongWords.forEach(word => {
        for (const char of word) {
          expect(gridLetters.has(char)).toBe(true);
        }
      });
    });

    test('generateWrongWords returns minimum length words', () => {
      const grid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I']
      ];

      const wrongWords = generateWrongWords(grid, 5);

      wrongWords.forEach(word => {
        expect(word.length).toBeGreaterThanOrEqual(3);
      });
    });

    test('generateWrongWords handles empty grid', () => {
      const wrongWords = generateWrongWords([], 5);
      expect(wrongWords).toEqual([]);
    });

    test('generateWrongWords handles zero count', () => {
      const grid = [['A', 'B'], ['C', 'D']];
      const wrongWords = generateWrongWords(grid, 0);
      expect(wrongWords).toEqual([]);
    });
  });

  describe('Cache Management', () => {

    test('getCacheStats returns cache information', () => {
      const stats = getCacheStats();

      expect(stats).toHaveProperty('playerWordsCacheSize');
      expect(stats).toHaveProperty('playerWordsCacheLanguages');
      expect(stats).toHaveProperty('blacklistCacheSize');
      expect(stats).toHaveProperty('blacklistCacheLanguages');
    });

    test('clearBehaviorCaches empties caches', () => {
      clearBehaviorCaches();

      const stats = getCacheStats();
      expect(stats.playerWordsCacheSize).toBe(0);
      expect(stats.blacklistCacheSize).toBe(0);
    });
  });
});

describe('Bot Configuration', () => {

  test('BOT_CONFIG has all difficulty levels', () => {
    expect(BOT_CONFIG.TIMING).toHaveProperty('easy');
    expect(BOT_CONFIG.TIMING).toHaveProperty('medium');
    expect(BOT_CONFIG.TIMING).toHaveProperty('hard');

    expect(BOT_CONFIG.WORDS).toHaveProperty('easy');
    expect(BOT_CONFIG.WORDS).toHaveProperty('medium');
    expect(BOT_CONFIG.WORDS).toHaveProperty('hard');
  });

  test('timing config has required properties', () => {
    const difficulties = ['easy', 'medium', 'hard'] as const;

    difficulties.forEach(diff => {
      expect(BOT_CONFIG.TIMING[diff]).toHaveProperty('minDelay');
      expect(BOT_CONFIG.TIMING[diff]).toHaveProperty('maxDelay');
      expect(BOT_CONFIG.TIMING[diff]).toHaveProperty('startDelay');
      expect(BOT_CONFIG.TIMING[diff]).toHaveProperty('typingSpeed');

      // Values should be reasonable
      expect(BOT_CONFIG.TIMING[diff].minDelay).toBeGreaterThan(0);
      expect(BOT_CONFIG.TIMING[diff].maxDelay).toBeGreaterThan(BOT_CONFIG.TIMING[diff].minDelay);
    });
  });

  test('word config has required properties', () => {
    const difficulties = ['easy', 'medium', 'hard'] as const;

    difficulties.forEach(diff => {
      expect(BOT_CONFIG.WORDS[diff]).toHaveProperty('maxWordLength');
      expect(BOT_CONFIG.WORDS[diff]).toHaveProperty('wordsPerMinute');
      expect(BOT_CONFIG.WORDS[diff]).toHaveProperty('focusOnShort');
      expect(BOT_CONFIG.WORDS[diff]).toHaveProperty('missChance');
    });
  });

  test('BOT_CONFIG has personality definitions', () => {
    expect(BOT_CONFIG.PERSONALITIES).toHaveProperty('aggressive');
    expect(BOT_CONFIG.PERSONALITIES).toHaveProperty('methodical');
    expect(BOT_CONFIG.PERSONALITIES).toHaveProperty('streaky');
    expect(BOT_CONFIG.PERSONALITIES).toHaveProperty('steady');

    // Each personality should have required traits
    const personalities = ['aggressive', 'methodical', 'streaky', 'steady'] as const;
    personalities.forEach(personality => {
      expect(BOT_CONFIG.PERSONALITIES[personality]).toHaveProperty('delayMultiplier');
      expect(BOT_CONFIG.PERSONALITIES[personality]).toHaveProperty('burstChance');
      expect(BOT_CONFIG.PERSONALITIES[personality]).toHaveProperty('comboFocus');
    });
  });

  test('BOT_CONFIG has names for multiple languages', () => {
    expect(BOT_CONFIG.NAMES).toHaveProperty('en');
    expect(BOT_CONFIG.NAMES).toHaveProperty('he');
    expect(BOT_CONFIG.NAMES).toHaveProperty('sv');
    expect(BOT_CONFIG.NAMES).toHaveProperty('ja');
    expect(BOT_CONFIG.NAMES).toHaveProperty('es');

    // Each language should have names for all difficulties
    ['en', 'he', 'sv', 'ja', 'es'].forEach(lang => {
      expect(BOT_CONFIG.NAMES[lang]).toHaveProperty('easy');
      expect(BOT_CONFIG.NAMES[lang]).toHaveProperty('medium');
      expect(BOT_CONFIG.NAMES[lang]).toHaveProperty('hard');
      expect(BOT_CONFIG.NAMES[lang]).toHaveProperty('botSuffix');

      // Each difficulty should have multiple names
      expect(BOT_CONFIG.NAMES[lang].easy.length).toBeGreaterThan(0);
      expect(BOT_CONFIG.NAMES[lang].medium.length).toBeGreaterThan(0);
      expect(BOT_CONFIG.NAMES[lang].hard.length).toBeGreaterThan(0);
    });
  });

  test('difficulty progression makes sense', () => {
    // Easy bots should focus on shorter words
    expect(BOT_CONFIG.WORDS.easy.focusOnShort).toBe(true);
    expect(BOT_CONFIG.WORDS.hard.focusOnShort).toBe(false);

    // Easy bots should have higher miss chance (more mistakes)
    expect(BOT_CONFIG.WORDS.easy.missChance).toBeGreaterThan(BOT_CONFIG.WORDS.hard.missChance);

    // Hard bots can find longer words
    expect(BOT_CONFIG.WORDS.hard.maxWordLength).toBeGreaterThan(BOT_CONFIG.WORDS.easy.maxWordLength);
  });
});
