/**
 * Bot Word Hunt — target-found lump bonus early-round cap.
 *
 * Pre-refactor bots capped the target-found lump bonus at a flat 20 points
 * (BOT_SCORE_BUFFER) before any human had scored, so a bot could never look
 * like it "solved" a fresh round out of nowhere. The generic score gate's
 * post-grace ceiling is per-difficulty (400/650/900) and only applies after a
 * 25s free-scoring grace window — neither alone reproduces the old cap, so
 * this covers the `creditBotBonus` tuning restoring it at the credit site.
 */

import { vi, type Mock } from 'vitest';
import type { Bot } from '../../../modules/botBehavior';

vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
} }));

vi.mock('../../../modules/gameStateManager', () => ({
  addPlayerWord: vi.fn(),
  updatePlayerScore: vi.fn(),
  trackBotWord: vi.fn(),
  getLeaderboard: vi.fn(() => []), // no human has scored — bestHuman === 0
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

let mockBonus = 50;
vi.mock('../../../modules/wordHuntManager', () => ({
  validateTargetGuess: vi.fn(() => ['correct', 'correct', 'correct']),
  recordTargetFound: vi.fn(() => ({ bonus: mockBonus, isFirstFinder: true })),
  penalizeWrongGuess: vi.fn(() => ({ eliminated: false })),
  restoreLife: vi.fn(),
  getLifeBonus: vi.fn(() => 1),
}));

vi.mock('../../../modules/boggleSolver', () => ({
  findAllWords: vi.fn(() => ['cat', 'dog', 'run', 'cog', 'rug']),
  findWordsForBots: vi.fn(() => ({ easy: ['cat', 'dog', 'run'], medium: ['cog', 'rug'], hard: [] })),
  getCachedTrie: vi.fn(() => ({})),
}));

vi.mock('../../../modules/botManager', () => ({
  getGameBots: vi.fn(() => []),
  restoreBotFromUser: vi.fn(() => null),
}));

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

vi.mock('../gameEnd', () => ({ endGame: vi.fn() }));

vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `game:${code}`),
}));

vi.mock('../../../utils/playerFoundWordBatcher', () => ({ queuePlayerFoundWord: vi.fn() }));

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
import { updatePlayerScore, addPlayerEventBonus } from '../../../modules/gameStateManager';
import { clearBotRoundState } from '../../../modules/botRoundState';
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

describe('Bot Word Hunt — target-found bonus early-round cap', () => {
  let mockIo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // scoringStart/variance are module-level real state — a leaked anchor from
    // another test's gameCode would change which grace/ceiling branch fires.
    clearBotRoundState('TEST1');
    (botManager.getGameBots as Mock).mockReturnValue([createMockBot()]);
    mockIo = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
    clearBotRoundState('TEST1');
  });

  const grid = [['C', 'A', 'T'], ['D', 'O', 'G'], ['R', 'U', 'N']];
  // Medium hunt start delay is 22s (+ up to 2s jitter).
  const TARGET_GUESS_MS = 24_500;

  it('never credits a large target bonus before any human has scored', async () => {
    mockBonus = 50; // well above the ~20-point early-round cap
    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);
    await vi.advanceTimersByTimeAsync(TARGET_GUESS_MS);

    expect(updatePlayerScore).not.toHaveBeenCalledWith('TEST1', 'BotPlayer', 50, true);
    expect(addPlayerEventBonus).not.toHaveBeenCalledWith('TEST1', 'BotPlayer', 50);
  });

  it('still credits a small target bonus (within the ~20-point cap) before any human has scored', async () => {
    mockBonus = 15; // within the old BOT_SCORE_BUFFER=20 cap
    startBotsForGame(mockIo, 'TEST1', grid, 'en', 60);
    await vi.advanceTimersByTimeAsync(TARGET_GUESS_MS);

    expect(updatePlayerScore).toHaveBeenCalledWith('TEST1', 'BotPlayer', 15, true);
    expect(addPlayerEventBonus).toHaveBeenCalledWith('TEST1', 'BotPlayer', 15);
  });
});
