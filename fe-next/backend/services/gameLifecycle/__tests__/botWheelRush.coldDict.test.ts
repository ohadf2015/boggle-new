/**
 * Cold-dictionary recovery for wheel-rush bots.
 *
 * BUG: gameStartHandler pre-loads the game-language dictionary (ensureLanguageLoaded)
 * before bots launch, but the RECOVERY paths that relaunch bots — resumeGameTimerIfMissing
 * (server restart / redeploy mid-game), reconnect, late-join — do NOT. On those paths the
 * in-memory dictionary singleton is COLD, so getCachedTrie(language) returns null and the
 * wheel-rush bot driver bails at `if (!trie) return` — bots never schedule, flatline at 0,
 * and (no score events) the leaderboard freezes for everyone. Hebrew (and any language) is
 * affected; it's worst after a deploy.
 *
 * FIX: the bot driver must ensure the language dictionary is loaded before enumerating,
 * mirroring the classic bot driver (botBehavior.ts ~173).
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
  ensureLanguageLoaded: vi.fn(),
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

import { startBotsForWheelRush } from '../botWheelRush';
import { initWheelRushState } from '../../../modules/wheelRushManager';
import type { Bot } from '../../../modules/botBehavior';

function makeBot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-1', gameCode: 'ABCD', username: 'BotBob', avatar: {},
    difficulty: 'hard', personality: 'friendly', isBot: true,
    wordsToFind: [], wordsFound: [], currentWordIndex: 0, score: 0,
    comboLevel: 0, inBurstMode: false, burstWordsRemaining: 0, nextWordTime: null,
    activeTimers: new Set(), isActive: true, avgThinkingTime: 1000, typingSpeed: 100,
    burstChance: 0, pauseChance: 0, comboFocus: false, ...overrides,
  } as Bot;
}

function buildTrie(words: string[]): Record<string, unknown> {
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

describe('startBotsForWheelRush — cold-dictionary recovery', () => {
  let io: { to: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    io = { to: vi.fn().mockReturnValue({ emit: vi.fn() }) };
    mocks.getTrieNode.mockImplementation((t: Record<string, unknown>, prefix: string) => {
      let n: Record<string, unknown> | null = t;
      for (const ch of prefix) {
        if (!n || !n[ch]) return null;
        n = n[ch] as Record<string, unknown>;
      }
      return n;
    });
  });

  afterEach(() => { vi.useRealTimers(); });

  it('loads the language dict before enumerating, so a cold-start recovery still scores', async () => {
    // Simulate a cold dictionary: the trie is null until ensureLanguageLoaded warms it.
    let warm = false;
    const trie = buildTrie(['cat', 'cane', 'cent']);
    mocks.getCachedTrie.mockImplementation(() => (warm ? trie : null));
    mocks.ensureLanguageLoaded.mockImplementation(async () => { warm = true; });

    const puzzle = {
      centerLetter: 'C',
      outerLetters: ['A', 'N', 'E', 'S', 'T', 'R'],
      allLetters: ['C', 'A', 'N', 'E', 'S', 'T', 'R'],
    };
    const state = initWheelRushState(puzzle, ['alice', 'BotBob']);
    mocks.getGame.mockReturnValue({
      gameCode: 'ABCD', gameMode: 'wheel-rush', gameState: 'in-progress', language: 'en',
      wheelRushState: state,
      users: { alice: { avatar: 'default', isHost: true }, BotBob: { avatar: 'default', isHost: false } },
      playerScores: { alice: 100, BotBob: 0 },
      playerWords: { alice: [], BotBob: [] },
    });

    const bot = makeBot();

    await startBotsForWheelRush(
      io as unknown as import('socket.io').Server,
      'ABCD', [bot], state, 'en', 60,
    );

    // Must warm the dict for the GAME language before reading the trie.
    expect(mocks.ensureLanguageLoaded).toHaveBeenCalledWith('en');
    // Bots scheduled despite the cold start (would be 0 if it bailed on null trie).
    expect(bot.activeTimers.size).toBeGreaterThan(0);

    vi.advanceTimersByTime(30_000);
    expect(mocks.updatePlayerScore).toHaveBeenCalled();
    const events = mocks.broadcastToRoom.mock.calls.map(c => c[2]);
    expect(events).toContain('wheelWordLocked');
  });
});
