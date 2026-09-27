/**
 * Word-hunt teacher controls: guesses are refused while paused, and the host
 * can skip a problematic target for a fresh one from the same board.
 */
import { vi, type Mock } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  validateTargetGuess: vi.fn(),
  selectTargetWordWithFallback: vi.fn(),
  initWordHuntState: vi.fn(),
  recordMpTarget: vi.fn(),
  getRecentMpTargets: vi.fn(() => new Set<string>()),
  findAllWordsAsync: vi.fn(),
  getCachedTrie: vi.fn(() => ({})),
  broadcastToRoom: vi.fn(),
}));

vi.mock('../../modules/gameStateManager', () => ({
  getGame: mocks.getGame,
  getGameBySocketId: mocks.getGameBySocketId,
  getUsernameBySocketId: mocks.getUsernameBySocketId,
  updatePlayerScore: vi.fn(),
  addPlayerEventBonus: vi.fn(),
}));
vi.mock('../../modules/wordHuntManager', () => ({
  validateTargetGuess: mocks.validateTargetGuess,
  recordTargetFound: vi.fn(),
  penalizeWrongGuess: vi.fn(),
  selectTargetWordWithFallback: mocks.selectTargetWordWithFallback,
  initWordHuntState: mocks.initWordHuntState,
  recordMpTarget: mocks.recordMpTarget,
  getRecentMpTargets: mocks.getRecentMpTargets,
}));
vi.mock('../../modules/wordValidatorPool', () => ({
  findAllWordsAsync: mocks.findAllWordsAsync,
}));
vi.mock('../../modules/boggleSolver', () => ({
  getCachedTrie: mocks.getCachedTrie,
}));
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: mocks.broadcastToRoom,
  getGameRoom: (c: string) => `room:${c}`,
  safeEmit: vi.fn(),
}));
vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: vi.fn(() => true),
  default: { checkRateLimit: vi.fn(() => true) },
}));
vi.mock('../../services/gameLifecycle/gameEnd', () => ({ endGame: vi.fn() }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

import { handleSubmitTargetWord, skipWordHuntTarget } from '../wordHuntHandler';

const io = {} as any;

function huntGame(extra: Record<string, unknown> = {}, huntExtra: Record<string, unknown> = {}) {
  return {
    gameCode: 'HUNT1',
    gameState: 'in-progress',
    gameMode: 'word-hunt',
    language: 'en',
    letterGrid: [['A', 'B'], ['C', 'D']],
    wordHuntState: {
      targetWord: 'apple',
      targetWordLength: 5,
      targetCategory: 'food',
      playerLives: { amy: 80, ben: 40 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
      finderCount: 0,
      playerAttempts: { amy: 2 },
      ...huntExtra,
    },
    ...extra,
  };
}

describe('wordHuntHandler — teacher pause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGameBySocketId.mockReturnValue('HUNT1');
    mocks.getUsernameBySocketId.mockReturnValue('amy');
  });

  it('refuses a target guess while the round is paused', () => {
    mocks.getGame.mockReturnValue(huntGame({ isPaused: true }));
    const socket = { id: 's1', emit: vi.fn() } as any;

    handleSubmitTargetWord(io, socket, { guess: 'apple' });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Game is paused' });
    expect(mocks.validateTargetGuess).not.toHaveBeenCalled();
  });
});

describe('skipWordHuntTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRecentMpTargets.mockReturnValue(new Set(['grape']));
    mocks.findAllWordsAsync.mockResolvedValue(['apple', 'grape', 'melon', 'cab']);
    mocks.selectTargetWordWithFallback.mockReturnValue('melon');
    mocks.initWordHuntState.mockImplementation((word: string, players: string[]) => ({
      targetWord: word,
      targetWordLength: word.length,
      targetCategory: 'fruit',
      playerLives: Object.fromEntries(players.map((p) => [p, 100])),
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
      finderCount: 0,
    }));
  });

  it('swaps in a fresh target (excluding the current + recent ones), resets finder state, keeps lives', async () => {
    const game = huntGame();
    mocks.getGame.mockReturnValue(game);

    const result = await skipWordHuntTarget(io, 'HUNT1');

    expect(result).toEqual({ targetLength: 5, targetCategory: 'fruit' });
    // Excluded: the word being skipped AND the recent-target LRU
    const exclude = mocks.selectTargetWordWithFallback.mock.calls[0][4] as Set<string>;
    expect(exclude.has('apple')).toBe(true);
    expect(exclude.has('grape')).toBe(true);
    expect(mocks.recordMpTarget).toHaveBeenCalledWith('en', 'melon');

    const hs = game.wordHuntState;
    expect(hs.targetWord).toBe('melon');
    expect(hs.targetWordLength).toBe(5);
    expect(hs.targetCategory).toBe('fruit');
    expect(hs.targetFoundBy).toBeNull();
    expect(hs.isFirstFinderClaimed).toBe(false);
    expect(hs.finderCount).toBe(0);
    expect(hs.playerAttempts).toEqual({});
    // Lives / eliminations are round state, not target state — untouched.
    expect(hs.playerLives).toEqual({ amy: 80, ben: 40 });

    expect(mocks.broadcastToRoom).toHaveBeenCalledWith(io, 'room:HUNT1', 'wordHuntTargetSkipped', {
      previousTarget: 'apple',
      wordHuntTargetLength: 5,
      wordHuntTargetCategory: 'fruit',
    });
  });

  it('returns null and changes nothing when the target was already found', async () => {
    const game = huntGame({}, { targetFoundBy: 'amy' });
    mocks.getGame.mockReturnValue(game);

    expect(await skipWordHuntTarget(io, 'HUNT1')).toBeNull();
    expect(game.wordHuntState.targetWord).toBe('apple');
    expect(mocks.broadcastToRoom).not.toHaveBeenCalled();
  });

  it('returns null for a non-word-hunt game', async () => {
    mocks.getGame.mockReturnValue(huntGame({ gameMode: 'classic' }));
    expect(await skipWordHuntTarget(io, 'HUNT1')).toBeNull();
  });

  it('returns null (target kept) when the board has no other candidate', async () => {
    const game = huntGame();
    mocks.getGame.mockReturnValue(game);
    mocks.selectTargetWordWithFallback.mockReturnValue(null);

    expect(await skipWordHuntTarget(io, 'HUNT1')).toBeNull();
    expect(game.wordHuntState.targetWord).toBe('apple');
  });
});
