/**
 * Bot Wheel Rush Tests
 *
 * Verifies bots can play wheel-rush: enumerate valid wheel words from the
 * puzzle letter set + trie, then drip-feed submissions via the shared bot
 * scheduler, emitting wheelWordLocked / wheelWordStolen like the human path.
 */

import { vi, type Mock } from 'vitest';

vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
} }));

const mocks = vi.hoisted(() => ({
  updatePlayerScore: vi.fn(),
  addPlayerWord: vi.fn(),
  getGame: vi.fn(),
  getLeaderboard: vi.fn(() => []),
  getLeaderboardThrottled: vi.fn(),
  broadcastToRoom: vi.fn(),
  timerSetTimeout: vi.fn(),
  getCachedTrie: vi.fn(),
  getTrieNode: vi.fn(),
  ensureLanguageLoaded: vi.fn(async () => {}),
  incrementBotWordUsage: vi.fn(async () => {}),
}));

vi.mock('../../../modules/gameStateManager', () => ({
  updatePlayerScore: mocks.updatePlayerScore,
  addPlayerWord: mocks.addPlayerWord,
  getGame: mocks.getGame,
  getLeaderboard: mocks.getLeaderboard,
  getLeaderboardThrottled: mocks.getLeaderboardThrottled,
}));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: mocks.broadcastToRoom,
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: (code: string) => `room:${code}`,
}));
vi.mock('../../../utils/timerManager', () => ({
  default: { setTimeout: mocks.timerSetTimeout, clearTimer: vi.fn() },
}));
vi.mock('../../../modules/boggleSolver', () => ({
  getCachedTrie: mocks.getCachedTrie,
  getTrieNode: mocks.getTrieNode,
}));
vi.mock('../../../dictionary', () => ({
  ensureLanguageLoaded: mocks.ensureLanguageLoaded,
}));
vi.mock('../../../modules/supabaseServer', () => ({
  incrementBotWordUsage: mocks.incrementBotWordUsage,
}));

import {
  enumerateWheelWords,
  startBotsForWheelRush,
} from '../botWheelRush';
import { initWheelRushState } from '../../../modules/wheelRushManager';
import type { Bot } from '../../../modules/botBehavior';

function makeBot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-1',
    gameCode: 'ABCD',
    username: 'BotBob',
    avatar: {},
    difficulty: 'hard',
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
    isActive: true,
    avgThinkingTime: 1000,
    typingSpeed: 100,
    burstChance: 0,
    pauseChance: 0,
    comboFocus: false,
    ...overrides,
  };
}

function buildTrie(words: string[]): Record<string, unknown> {
  // Lowercase-keyed trie matching boggleSolver contract
  const root: Record<string, unknown> = {};
  for (const w of words) {
    let node: Record<string, unknown> = root;
    for (const c of w.toLowerCase()) {
      if (!node[c]) node[c] = {};
      node = node[c] as Record<string, unknown>;
    }
    (node as { isWord?: boolean }).isWord = true;
  }
  return root;
}

describe('enumerateWheelWords', () => {
  it('returns dictionary words using letters at most once, including center', () => {
    const puzzle = {
      centerLetter: 'C',
      outerLetters: ['A', 'N', 'E', 'S', 'T', 'R'],
      allLetters: ['C', 'A', 'N', 'E', 'S', 'T', 'R'],
    };
    // Dict contains valid wheel words + decoys
    const trie = buildTrie(['can', 'cane', 'cat', 'cart', 'cent', 'bat', 'canny']);

    const words = enumerateWheelWords(puzzle, trie, 3);

    expect(words).toEqual(expect.arrayContaining(['CAN', 'CANE', 'CAT', 'CART', 'CENT']));
    expect(words).not.toContain('BAT');    // no center 'C'
    expect(words).not.toContain('CANNY');  // 'N' used twice
  });

  it('honors min length', () => {
    const puzzle = { centerLetter: 'C', outerLetters: ['A', 'T'], allLetters: ['C', 'A', 'T'] };
    const trie = buildTrie(['ca', 'cat', 'at']);

    const words = enumerateWheelWords(puzzle, trie, 3);
    expect(words).toEqual(['CAT']);
  });
});

describe('startBotsForWheelRush', () => {
  let io: { to: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    io = { to: vi.fn().mockReturnValue({ emit: vi.fn() }) };

    const trie = buildTrie(['cat', 'cane', 'cent']);
    mocks.getCachedTrie.mockReturnValue(trie);
    // Real getTrieNode walks the object — forward to a minimal impl
    mocks.getTrieNode.mockImplementation((t: Record<string, unknown>, prefix: string) => {
      let n: Record<string, unknown> | null = t;
      for (const ch of prefix) {
        if (!n || !n[ch]) return null;
        n = n[ch] as Record<string, unknown>;
      }
      return n;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules a bot word submission and broadcasts wheelWordLocked', async () => {
    const puzzle = {
      centerLetter: 'C',
      outerLetters: ['A', 'N', 'E', 'S', 'T', 'R'],
      allLetters: ['C', 'A', 'N', 'E', 'S', 'T', 'R'],
    };
    const state = initWheelRushState(puzzle, ['alice', 'BotBob']);
    mocks.getGame.mockReturnValue({
      gameCode: 'ABCD',
      gameMode: 'wheel-rush',
      gameState: 'in-progress',
      language: 'en',
      wheelRushState: state,
      users: {
        alice: { avatar: 'default', isHost: true },
        BotBob: { avatar: 'default', isHost: false },
      },
      playerScores: { alice: 100, BotBob: 0 },
      playerWords: { alice: [], BotBob: [] },
    });

    const bot = makeBot();

    await startBotsForWheelRush(
      io as unknown as import('socket.io').Server,
      'ABCD',
      [bot],
      state,
      'en',
      60,
    );

    expect(bot.isActive).toBe(true);
    expect(bot.activeTimers.size).toBeGreaterThan(0);

    // Advance well past the maximum `startDelay + maxDelay` for hard difficulty.
    vi.advanceTimersByTime(30_000);

    expect(mocks.updatePlayerScore).toHaveBeenCalled();
    const broadcastEvents = mocks.broadcastToRoom.mock.calls.map(c => c[2]);
    expect(broadcastEvents).toContain('wheelWordLocked');

    // The locked word should also be credited to the bot-usage corpus.
    const lockedWord = mocks.addPlayerWord.mock.calls[0][2];
    expect(mocks.incrementBotWordUsage).toHaveBeenCalledWith(lockedWord, 'en');
  });

  it('no-op when bot list empty', async () => {
    await startBotsForWheelRush(
      io as unknown as import('socket.io').Server,
      'ABCD',
      [],
      initWheelRushState({ centerLetter: 'C', outerLetters: ['A', 'T'], allLetters: ['C', 'A', 'T'] }, []),
      'en',
      60,
    );
    vi.advanceTimersByTime(30_000);
    expect(mocks.updatePlayerScore).not.toHaveBeenCalled();
    expect(mocks.broadcastToRoom).not.toHaveBeenCalled();
  });
});
