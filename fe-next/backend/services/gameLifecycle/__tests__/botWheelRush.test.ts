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
  getCachedPlayerWords: vi.fn(async () => [] as string[]),
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
vi.mock('../../../modules/botBehaviorCache', () => ({
  getCachedPlayerWords: mocks.getCachedPlayerWords,
}));

import {
  enumerateWheelWords,
  startBotsForWheelRush,
  decideBotWheelMove,
  botThinkDelay,
} from '../botWheelRush';
import { initWheelRushState } from '../../../modules/wheelRushManager';
import {
  WHEEL_RUSH_BOT_THINK_MIN_MS,
  WHEEL_RUSH_BOT_THINK_MAX_MS,
} from '@/shared/constants/wheelRushConstants';
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

  it('schedules a bot word submission and broadcasts wheelWordFound', async () => {
    // Force the per-turn success gate + shuffle to be deterministic (0 < any
    // success rate → always submit the intended word).
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
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

      // Advance past the artificial think delays (3–7s) enough for several turns.
      vi.advanceTimersByTime(30_000);

      expect(mocks.updatePlayerScore).toHaveBeenCalled();
      const broadcastEvents = mocks.broadcastToRoom.mock.calls.map(c => c[2]);
      expect(broadcastEvents).toContain('wheelWordFound');
      // Parallel discovery — bots never emit lock/steal/close events.
      expect(broadcastEvents).not.toContain('wheelWordLocked');
      expect(broadcastEvents).not.toContain('wheelWordStolen');

      // The found word should also be credited to the bot-usage corpus.
      const foundWord = mocks.addPlayerWord.mock.calls[0][2];
      expect(mocks.incrementBotWordUsage).toHaveBeenCalledWith(foundWord, 'en');
    } finally {
      randSpy.mockRestore();
    }
  });

  it('does not fire the first move before the minimum artificial think delay', async () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0); // firstDelay → MIN
    try {
      const puzzle = {
        centerLetter: 'C', outerLetters: ['A','N','E','S','T','R'], allLetters: ['C','A','N','E','S','T','R'],
      };
      const state = initWheelRushState(puzzle, ['alice', 'BotBob']);
      mocks.getGame.mockReturnValue({
        gameCode: 'ABCD', gameMode: 'wheel-rush', gameState: 'in-progress', language: 'en',
        wheelRushState: state,
        users: { alice: { avatar: 'd', isHost: true }, BotBob: { avatar: 'd', isHost: false } },
        playerScores: { alice: 100, BotBob: 0 }, playerWords: { alice: [], BotBob: [] },
      });

      await startBotsForWheelRush(
        io as unknown as import('socket.io').Server, 'ABCD', [makeBot()], state, 'en', 60,
      );

      // Just before the minimum think delay — the bot must not have scored yet.
      vi.advanceTimersByTime(WHEEL_RUSH_BOT_THINK_MIN_MS - 100);
      expect(mocks.updatePlayerScore).not.toHaveBeenCalled();

      // Cross the threshold — now it plays.
      vi.advanceTimersByTime(500);
      expect(mocks.updatePlayerScore).toHaveBeenCalled();
    } finally {
      randSpy.mockRestore();
    }
  });

  it('easy bot queues the COMMON player word before the rare one (frequency banding)', async () => {
    const puzzle = {
      centerLetter: 'C',
      outerLetters: ['A', 'N', 'E', 'S', 'T', 'R'],
      allLetters: ['C', 'A', 'N', 'E', 'S', 'T', 'R'],
    };
    const state = initWheelRushState(puzzle, ['alice', 'BotBob']);
    mocks.getGame.mockReturnValue({
      gameCode: 'ABCD', gameMode: 'wheel-rush', gameState: 'in-progress', language: 'en',
      wheelRushState: state,
      users: { alice: { avatar: 'd', isHost: true }, BotBob: { avatar: 'd', isHost: false } },
      playerScores: { alice: 0, BotBob: 0 }, playerWords: { alice: [], BotBob: [] },
    });

    // 200-word corpus (>= MIN_CORPUS_FOR_BANDING): 'cat' commonest (rank 0),
    // 'cent' rarest (rank 199). Keyed lowercase; the driver uppercases for lookup.
    const corpus = ['cat', ...Array.from({ length: 198 }, (_, i) => `flr${i}`), 'cent'];
    mocks.getCachedPlayerWords.mockResolvedValue(corpus);
    // Constant rand → weighted ordering is a pure function of weight (deterministic).
    // 0.3 < easy success-rate (0.5) so the per-turn gate always lands the intended
    // word → submission order mirrors the banded pool order.
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.3);

    try {
      await startBotsForWheelRush(
        io as unknown as import('socket.io').Server,
        'ABCD', [makeBot({ difficulty: 'easy' })], state, 'en', 60,
      );
      vi.advanceTimersByTime(60_000);

      const submitted = mocks.addPlayerWord.mock.calls.map(c => c[2]);
      const iCommon = submitted.indexOf('CAT');
      const iRare = submitted.indexOf('CENT');
      expect(iCommon).toBeGreaterThanOrEqual(0);
      expect(iRare).toBeGreaterThanOrEqual(0);
      expect(iCommon).toBeLessThan(iRare);
    } finally {
      randSpy.mockRestore();
    }
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

describe('botThinkDelay — artificial thinking delay', () => {
  it('always falls within the configured 3–7s band', () => {
    expect(botThinkDelay(() => 0)).toBe(WHEEL_RUSH_BOT_THINK_MIN_MS);
    expect(botThinkDelay(() => 1)).toBe(WHEEL_RUSH_BOT_THINK_MAX_MS);
    const mid = botThinkDelay(() => 0.5);
    expect(mid).toBeGreaterThan(WHEEL_RUSH_BOT_THINK_MIN_MS);
    expect(mid).toBeLessThan(WHEEL_RUSH_BOT_THINK_MAX_MS);
  });
});

describe('decideBotWheelMove — per-turn success rate', () => {
  const pool = ['CANE', 'CENT', 'CAT']; // lengths 4, 4, 3

  it('submits the intended word when the roll is under the success rate', () => {
    // rng() = 0.1 < 0.65 → success.
    const move = decideBotWheelMove('CANE', pool, 0.65, () => 0.1);
    expect(move).toEqual({ action: 'submit', word: 'CANE' });
  });

  it('skips the turn on a miss that rolls into the skip branch', () => {
    // First roll 0.9 (>=0.65 → miss); second roll 0.1 (<0.5 → skip).
    const rolls = [0.9, 0.1];
    let i = 0;
    const move = decideBotWheelMove('CANE', pool, 0.65, () => rolls[i++]);
    expect(move).toEqual({ action: 'skip' });
  });

  it('downgrades to a shorter word on a miss that rolls into the downgrade branch', () => {
    // First roll 0.9 (miss); second roll 0.9 (>=0.5 → downgrade to a shorter word).
    const rolls = [0.9, 0.9];
    let i = 0;
    const move = decideBotWheelMove('CANE', pool, 0.65, () => rolls[i++]);
    expect(move).toEqual({ action: 'submit', word: 'CAT' }); // only shorter option
  });

  it('skips when a downgrade is wanted but no shorter word exists', () => {
    const rolls = [0.9, 0.9];
    let i = 0;
    const move = decideBotWheelMove('CAT', ['CANE', 'CENT'], 0.65, () => rolls[i++]);
    expect(move).toEqual({ action: 'skip' });
  });
});
