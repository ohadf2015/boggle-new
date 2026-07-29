/**
 * Cold-dictionary recovery for word-hunt bots.
 *
 * Same class as the wheel-rush bug: recovery paths (server restart/redeploy →
 * resumeGameTimerIfMissing, reconnect, late-join) relaunch bots WITHOUT the
 * gameStartHandler dictionary pre-load. On a cold singleton `getCachedTrie` is
 * null → `findAllWords` returns nothing → every bot has 0 candidates → no
 * target guesses → leaderboard never moves. FIX: warm the dict first.
 */
import { vi } from 'vitest';

vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
} }));

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  updatePlayerScore: vi.fn(),
  validateTargetGuess: vi.fn(),
  recordTargetFound: vi.fn(),
  penalizeWrongGuess: vi.fn(),
  broadcastToRoom: vi.fn(),
  findAllWords: vi.fn(),
  getCachedTrie: vi.fn(),
  endGame: vi.fn(),
  getBestHumanScore: vi.fn(() => 0),
  setBotTimeout: vi.fn(),
  ensureLanguageLoaded: vi.fn(),
}));

vi.mock('../../../modules/wordHuntManager', () => ({
  validateTargetGuess: mocks.validateTargetGuess,
  recordTargetFound: mocks.recordTargetFound,
  penalizeWrongGuess: mocks.penalizeWrongGuess,
}));
vi.mock('../../../modules/gameStateManager', () => ({
  updatePlayerScore: mocks.updatePlayerScore,
  getGame: mocks.getGame,
}));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: mocks.broadcastToRoom,
  getGameRoom: (code: string) => `room:${code}`,
}));
vi.mock('../../../modules/boggleSolver', () => ({
  findAllWords: mocks.findAllWords,
  getCachedTrie: mocks.getCachedTrie,
}));
vi.mock('./gameEnd', () => ({ endGame: mocks.endGame }));
vi.mock('./botGame', () => ({ getBestHumanScore: mocks.getBestHumanScore }));
vi.mock('../../../modules/botLifecycle', () => ({ setBotTimeout: mocks.setBotTimeout }));
vi.mock('../../../dictionary', () => ({ ensureLanguageLoaded: mocks.ensureLanguageLoaded }));

import { startBotsForWordHunt } from '../botWordHunt';
import type { Bot } from '../../../modules/botBehavior';

function makeBot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-1', gameCode: 'ABCD', username: 'BotBob', avatar: {},
    difficulty: 'medium', personality: 'friendly', isBot: true,
    wordsToFind: [], wordsFound: [], currentWordIndex: 0, score: 0,
    comboLevel: 0, inBurstMode: false, burstWordsRemaining: 0, nextWordTime: null,
    activeTimers: new Set(), isActive: false, avgThinkingTime: 1000, typingSpeed: 100,
    burstChance: 0, pauseChance: 0, comboFocus: false, ...overrides,
  } as Bot;
}

describe('startBotsForWordHunt — cold-dictionary recovery', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('warms the language dict before enumerating, so a cold-start recovery still produces candidates', async () => {
    // Cold dict: trie null + solver empty until ensureLanguageLoaded warms it.
    let warm = false;
    mocks.getCachedTrie.mockImplementation(() => (warm ? {} : null));
    mocks.findAllWords.mockImplementation(() => (warm ? ['HELLO', 'WORLD'] : []));
    mocks.ensureLanguageLoaded.mockImplementation(async () => { warm = true; });
    mocks.getGame.mockReturnValue({ letterGrid: [['H', 'E'], ['L', 'O']] });

    const io = { to: () => ({ emit: () => {} }) } as unknown as import('socket.io').Server;
    const bot = makeBot();
    const huntState = { targetWord: 'HELLO', targetWordLength: 5 } as never;

    await startBotsForWordHunt(io, 'ABCD', [bot], huntState, 'he', 60);

    // Must warm the GAME language before reading the trie / solving.
    expect(mocks.ensureLanguageLoaded).toHaveBeenCalledWith('he');
    // With the dict warm, the bot finds candidates and gets scheduled
    // (would stay inactive with 0 candidates on a cold dict).
    expect(bot.isActive).toBe(true);
    expect(mocks.setBotTimeout).toHaveBeenCalled();
  });
});
