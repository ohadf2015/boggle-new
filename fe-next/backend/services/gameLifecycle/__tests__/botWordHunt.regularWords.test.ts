/**
 * TDD RED: Bot Word Hunt - Regular Word Finding
 *
 * Verifies that bots in Word Hunt mode find regular board words
 * in addition to making target guesses.
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Bot } from '../../../modules/botBehavior';
import type { BotSubmission } from '../types';

// Mock dependencies
vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} }));

vi.mock('../../../modules/gameStateManager', () => ({
  addPlayerWord: vi.fn(),
  updatePlayerScore: vi.fn(),
  trackBotWord: vi.fn(),
  getLeaderboard: vi.fn(() => []),
  getLeaderboardThrottled: vi.fn(),
  getGame: vi.fn(() => ({
    gameMode: 'word-hunt',
    letterGrid: [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']],
    wordHuntState: {
      targetWord: 'DOG',
      targetWordLength: 3,
      playerLives: {},
      eliminatedPlayers: [],
    },
  })),
  recordFirstFinder: vi.fn(() => true),
}));

vi.mock('../../../modules/blastModeManager', () => ({
  calculateBlastTileBonus: vi.fn(() => 0),
  getTilesOnPath: vi.fn(() => []),
  recordBlastMove: vi.fn(),
}));

vi.mock('../../../modules/wordHuntManager', () => ({
  validateTargetGuess: vi.fn(() => ['absent', 'absent', 'absent']),
  recordTargetFound: vi.fn(() => ({ bonus: 50, isFirstFinder: true })),
  penalizeWrongGuess: vi.fn(() => ({ eliminated: false })),
  restoreLife: vi.fn(),
  getLifeBonus: vi.fn(() => 1),
}));

vi.mock('../../../modules/boggleSolver', () => ({
  findAllWords: vi.fn(() => ['cat', 'dog', 'run', 'cog', 'rug']),
  findWordsForBots: vi.fn(() => ({
    easy: ['cat', 'dog', 'run'],
    medium: ['cog', 'rug'],
    hard: [],
  })),
  getCachedTrie: vi.fn(() => ({})),
}));

vi.mock('../../../modules/botManager', () => {
  return {
    getGameBots: vi.fn(() => []),
    startBot: vi.fn(async (bot: Bot, _grid: any, _language: any, onWordSubmit: any, _duration: number, _startTime: number) => {
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
    stopBot: vi.fn(),
  };
});

vi.mock('../gameEnd', () => ({
  endGame: vi.fn(),
}));

vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `game:${code}`),
}));

vi.mock('../../../utils/playerFoundWordBatcher', () => ({
  queuePlayerFoundWord: vi.fn(),
}));

vi.mock('../../../../shared/constants/wordHuntMultiplayerConstants', () => ({
  BOARD_WORD_SCORE_PER_LETTER: 2,
}));

vi.mock('../../../dictionary', () => ({
  ensureLanguageLoaded: vi.fn(),
}));

vi.mock('../../../modules/botConfig', () => ({
  BOT_CONFIG: {
    TIMING: { medium: { minDelay: 2000, maxDelay: 5000, startDelay: 1000 } },
    WORDS: { medium: { maxWordLength: 7, wordsPerMinute: 4, focusOnShort: false, missChance: 0, wrongWordChance: 0 } },
  },
}));

import { startBotsForGame } from '../botGame';
import { addPlayerWord, updatePlayerScore } from '../../../modules/gameStateManager';
import { broadcastToRoom, volatileBroadcastToRoom } from '../../../utils/socketHelpers';
import { queuePlayerFoundWord } from '../../../utils/playerFoundWordBatcher';
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
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockBot = createMockBot();

    mockIo = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    (botManager.getGameBots as Mock).mockReturnValue([mockBot]);
  });

  afterEach(() => {
    vi.useRealTimers();
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
    vi.advanceTimersByTime(150);

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

    vi.advanceTimersByTime(150);

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

    vi.advanceTimersByTime(150);

    // playerFoundWord is now batched via queuePlayerFoundWord (not direct broadcast)
    expect(queuePlayerFoundWord).toHaveBeenCalledWith(
      mockIo,
      'TEST1',
      expect.objectContaining({
        username: 'BotPlayer',
        word: 'cat',
        comboLevel: 0,
        isFirstFinder: true,
      })
    );

    // Also verify botWordFound is broadcast (the direct event for bot activity visibility)
    expect(volatileBroadcastToRoom).toHaveBeenCalledWith(
      mockIo,
      'game:TEST1',
      'botWordFound',
      expect.objectContaining({
        username: 'BotPlayer',
        word: 'cat',
        isFirstFinder: true,
      })
    );
  });

  it('should broadcast wordHuntLifeUpdate after bot finds a regular word', async () => {
    const grid = [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']];

    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);

    vi.advanceTimersByTime(150);

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
    vi.advanceTimersByTime(200);

    // getGameBots should be called again for the word hunt loop
    expect(botManager.getGameBots).toHaveBeenCalledTimes(2);
  });
});
