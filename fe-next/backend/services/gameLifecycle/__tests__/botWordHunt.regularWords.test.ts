/**
 * Bot Word Hunt - Regular Word Finding
 *
 * Verifies that bots in Word Hunt mode find regular board words (through the
 * shared board-word bot + engine) in addition to making target guesses.
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Bot } from '../../../modules/botBehavior';

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
  playerHasWord: vi.fn(() => false),
  addPlayerEventBonus: vi.fn(),
}));

vi.mock('../../../modules/blastModeManager', () => ({
  validateBlastWordPath: vi.fn().mockReturnValue(null),
  getTilesOnResolvedPath: vi.fn().mockReturnValue([]),
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

vi.mock('../../../modules/botManager', () => ({
  getGameBots: vi.fn(() => []),
  restoreBotFromUser: vi.fn(() => null),
}));

// Board-word pool: the real prepareBotWords over the mocked solver; no caches/network.
vi.mock('../../../modules/botBehaviorCache', () => ({
  cleanupPlayerWordsCache: vi.fn(), clearBehaviorCaches: vi.fn(), getCacheStats: vi.fn(), addWordToBlacklist: vi.fn(),
  getCachedPlayerWords: vi.fn(async () => []),
  getCachedBlacklist: vi.fn(async () => new Set()),
  getCachedDifficultyParams: vi.fn(async () => null),
  getCachedWrongWords: vi.fn(async () => []),
}));
vi.mock('../../../modules/supabaseServer', () => ({ incrementBotWordUsage: vi.fn(async () => {}) }));
vi.mock('../../../modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn(() => false),
  isWordValidForScoring: vi.fn(() => false),
}));

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
  ensureLanguageLoaded: vi.fn(async () => {}),
  isDictionaryWord: vi.fn(() => true),
}));

vi.mock('../../../modules/botConfig', () => ({
  BOT_CONFIG: {
    TIMING: { medium: { minDelay: 2000, maxDelay: 5000, startDelay: 1000, typingSpeed: 0 } },
    WORDS: { medium: { maxWordLength: 7, wordsPerMinute: 4, focusOnShort: false, missChance: 0, wrongWordChance: 0 } },
  },
}));

import { startBotsForGame } from '../botGame';
import { addPlayerWord, updatePlayerScore, addPlayerEventBonus } from '../../../modules/gameStateManager';
import { validateTargetGuess } from '../../../modules/wordHuntManager';
import { calculateWordScore } from '@/shared/utils/scoring';
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

  const grid = [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']];
  // First board word lands after startDelay (1000) + up to 2000 jitter.
  const FIRST_WORD_MS = 3100;

  it('word-hunt bots play board words: stored word score + per-letter board bonus as an event bonus', async () => {
    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);
    await vi.advanceTimersByTimeAsync(FIRST_WORD_MS);

    const [, , word, opts] = (addPlayerWord as Mock).mock.calls[0];
    expect(opts).toEqual(expect.objectContaining({ autoValidated: true, isBot: true }));
    const base = calculateWordScore(word, 0);
    const boardBonus = word.length * 2; // BOARD_WORD_SCORE_PER_LETTER (mocked 2)
    expect(opts.score).toBe(base);
    expect(updatePlayerScore).toHaveBeenCalledWith('TEST1', 'BotPlayer', base + boardBonus, true);
    // Same shape as the human path: the bonus survives into results via the accumulator.
    expect(addPlayerEventBonus).toHaveBeenCalledWith('TEST1', 'BotPlayer', boardBonus);
  });

  it('should broadcast botWordFound + queue playerFoundWord for regular words in word-hunt mode', async () => {
    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);
    await vi.advanceTimersByTimeAsync(FIRST_WORD_MS);

    const word = (addPlayerWord as Mock).mock.calls[0][2];
    expect(volatileBroadcastToRoom).toHaveBeenCalledWith(
      mockIo, 'game:TEST1', 'botWordFound',
      expect.objectContaining({ username: 'BotPlayer', word, isFirstFinder: true }),
    );
    expect(queuePlayerFoundWord).toHaveBeenCalledWith(
      mockIo, 'TEST1',
      expect.objectContaining({ username: 'BotPlayer', word, comboLevel: 0, isFirstFinder: true }),
    );
  });

  it('should broadcast wordHuntLifeUpdate after bot finds a regular word', async () => {
    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);
    await vi.advanceTimersByTimeAsync(FIRST_WORD_MS);

    expect(broadcastToRoom).toHaveBeenCalledWith(
      mockIo, 'game:TEST1', 'wordHuntLifeUpdate',
      expect.objectContaining({ playerLives: expect.any(Object), eliminatedPlayers: expect.any(Array) }),
    );
  });

  it('should also run the word-hunt target guessing loop alongside board words', async () => {
    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);
    // Medium hunt start delay is 22s (+ up to 2s jitter).
    await vi.advanceTimersByTimeAsync(24_500);

    expect(addPlayerWord).toHaveBeenCalled();         // board words
    expect(validateTargetGuess).toHaveBeenCalled();   // target guesses
    expect(broadcastToRoom).toHaveBeenCalledWith(mockIo, 'game:TEST1', 'wordHuntBotGuess', expect.any(Object));
  });
});
