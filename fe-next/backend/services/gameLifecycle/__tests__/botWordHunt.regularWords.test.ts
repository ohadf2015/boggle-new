/**
 * TDD RED: Bot Word Hunt - Regular Word Finding
 *
 * Verifies that bots in Word Hunt mode find regular board words
 * in addition to making target guesses.
 */

import type { Bot } from '../../../modules/botBehavior';
import type { BotSubmission } from '../types';

// Mock dependencies
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../../modules/gameStateManager', () => ({
  addPlayerWord: jest.fn(),
  updatePlayerScore: jest.fn(),
  trackBotWord: jest.fn(),
  getLeaderboard: jest.fn(() => []),
  getGame: jest.fn(() => ({
    gameMode: 'word-hunt',
    letterGrid: [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']],
    wordHuntState: {
      targetWord: 'DOG',
      targetWordLength: 3,
      playerLives: {},
      eliminatedPlayers: [],
    },
  })),
  recordFirstFinder: jest.fn(),
}));

jest.mock('../../../modules/blastModeManager', () => ({
  calculateBlastTileBonus: jest.fn(() => 0),
  getTilesOnPath: jest.fn(() => []),
  recordBlastMove: jest.fn(),
}));

jest.mock('../../../modules/wordHuntManager', () => ({
  validateTargetGuess: jest.fn(() => ['absent', 'absent', 'absent']),
  recordTargetFound: jest.fn(() => ({ bonus: 50, isFirstFinder: true })),
  penalizeWrongGuess: jest.fn(() => ({ eliminated: false })),
  restoreLife: jest.fn(),
  getLifeBonus: jest.fn(() => 1),
}));

jest.mock('../../../modules/boggleSolver', () => ({
  findAllWords: jest.fn(() => ['cat', 'dog', 'run', 'cog', 'rug']),
  findWordsForBots: jest.fn(() => ({
    easy: ['cat', 'dog', 'run'],
    medium: ['cog', 'rug'],
    hard: [],
  })),
  getCachedTrie: jest.fn(() => ({})),
}));

jest.mock('../../../modules/botManager', () => {
  return {
    getGameBots: jest.fn(() => []),
    startBot: jest.fn(async (bot: Bot, _grid: any, _language: any, onWordSubmit: any, _duration: number, _startTime: number) => {
      // Simulate bot finding words
      bot.isActive = true;
      bot.wordsToFind = ['cat', 'run', 'rug'];
      bot.wordsFound = [];
      bot.currentWordIndex = 0;

      // Simulate submitting first word after short delay
      setTimeout(() => {
        if (bot.isActive && onWordSubmit) {
          onWordSubmit({
            botId: bot.id,
            username: bot.username,
            word: 'cat',
            score: 3,
            comboLevel: 0,
          } as BotSubmission);
        }
      }, 50);

      setTimeout(() => {
        if (bot.isActive && onWordSubmit) {
          onWordSubmit({
            botId: bot.id,
            username: bot.username,
            word: 'run',
            score: 3,
            comboLevel: 1,
          } as BotSubmission);
        }
      }, 100);
    }),
    stopBot: jest.fn(),
  };
});

jest.mock('../gameEnd', () => ({
  endGame: jest.fn(),
}));

jest.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  volatileBroadcastToRoom: jest.fn(),
  getGameRoom: jest.fn((code: string) => `game:${code}`),
}));

jest.mock('../../../../shared/constants/wordHuntMultiplayerConstants', () => ({
  BOARD_WORD_SCORE_PER_LETTER: 2,
}));

jest.mock('../../../dictionary', () => ({
  ensureLanguageLoaded: jest.fn(),
}));

jest.mock('../../../modules/botConfig', () => ({
  BOT_CONFIG: {
    TIMING: { medium: { minDelay: 2000, maxDelay: 5000, startDelay: 1000 } },
    WORDS: { medium: { maxWordLength: 7, wordsPerMinute: 4, focusOnShort: false, missChance: 0, wrongWordChance: 0 } },
  },
}));

import { startBotsForGame } from '../botGame';
import { addPlayerWord, updatePlayerScore } from '../../../modules/gameStateManager';
import { broadcastToRoom, volatileBroadcastToRoom } from '../../../utils/socketHelpers';
import * as botManager from '../../../modules/botManager';

function createMockBot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-1',
    gameCode: 'TEST1',
    username: 'BotPlayer',
    avatar: { emoji: '🤖' },
    difficulty: 'medium' as const,
    personality: 'friendly',
    isBot: true,
    wordsToFind: [],
    wordsFound: [],
    currentWordIndex: 0,
    score: 0,
    comboLevel: 0,
    inBurstMode: false,
    burstWordsRemaining: 0,
    nextWordTime: null,
    activeTimers: new Set(),
    isActive: false,
    avgThinkingTime: 3000,
    typingSpeed: 200,
    burstChance: 0.15,
    pauseChance: 0.1,
    comboFocus: false,
    ...overrides,
  };
}

describe('Bot Word Hunt - Regular Word Finding', () => {
  let mockIo: any;
  let mockBot: Bot;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockBot = createMockBot();

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    (botManager.getGameBots as jest.Mock).mockReturnValue([mockBot]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call startBot for regular word finding in word-hunt mode', () => {
    const grid = [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']];

    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);

    expect(botManager.startBot).toHaveBeenCalledWith(
      mockBot,
      grid,
      'en',
      expect.any(Function),
      60,
      expect.any(Number)
    );
  });

  it('should process regular word submissions from bots in word-hunt mode', async () => {
    const grid = [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']];

    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);

    // Advance past the simulated bot word submissions
    jest.advanceTimersByTime(150);

    // Bot should have submitted regular words via addPlayerWord
    expect(addPlayerWord).toHaveBeenCalledWith(
      'TEST1',
      'BotPlayer',
      'cat',
      expect.objectContaining({
        autoValidated: true,
        isBot: true,
      })
    );

    // Score should include BOARD_WORD_SCORE_PER_LETTER bonus (3 letters * 2 = 6 + base 3 = 9)
    expect(updatePlayerScore).toHaveBeenCalledWith('TEST1', 'BotPlayer', 9, true);
  });

  it('should broadcast botWordFound for regular words in word-hunt mode', async () => {
    const grid = [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']];

    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);

    jest.advanceTimersByTime(150);

    expect(volatileBroadcastToRoom).toHaveBeenCalledWith(
      mockIo,
      'game:TEST1',
      'botWordFound',
      expect.objectContaining({
        username: 'BotPlayer',
        word: 'cat',
      })
    );
  });

  it('should emit playerFoundWord so frontend shows bot word activity', async () => {
    const grid = [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']];

    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);

    jest.advanceTimersByTime(150);

    expect(volatileBroadcastToRoom).toHaveBeenCalledWith(
      mockIo,
      'game:TEST1',
      'playerFoundWord',
      expect.objectContaining({
        username: 'BotPlayer',
        word: 'cat',
        comboLevel: 0,
      })
    );
  });

  it('should broadcast wordHuntLifeUpdate after bot finds a regular word', async () => {
    const grid = [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']];

    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);

    jest.advanceTimersByTime(150);

    expect(broadcastToRoom).toHaveBeenCalledWith(
      mockIo,
      'game:TEST1',
      'wordHuntLifeUpdate',
      expect.objectContaining({
        playerLives: expect.any(Object),
        eliminatedPlayers: expect.any(Array),
      })
    );
  });

  it('should also start word-hunt target guessing loop', () => {
    const grid = [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']];

    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);

    // Advance past the 100ms setTimeout for word hunt loop
    jest.advanceTimersByTime(200);

    // getGameBots should be called again for the word hunt loop
    expect(botManager.getGameBots).toHaveBeenCalledTimes(2);
  });
});
