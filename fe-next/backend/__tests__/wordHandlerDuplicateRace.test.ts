vi.mock('../utils/logger', () => ({ default: {
  info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
} }));
vi.mock('../modules/gameStateManager');
vi.mock('../utils/socketHelpers');
vi.mock('../utils/profanityFilter', () => ({ isProfane: vi.fn().mockReturnValue(false) }));
vi.mock('../utils/errorHandler', () => ({
  emitError: vi.fn(),
  ErrorCodes: { GAME_NOT_IN_PROGRESS: 'GAME_NOT_IN_PROGRESS', INTERNAL_ERROR: 'INTERNAL_ERROR' },
}));
vi.mock('../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
vi.mock('../utils/metrics', () => ({ inc: vi.fn(), incPerGame: vi.fn() }));
vi.mock('../handlers/shared', () => ({ isSocketMigrating: vi.fn().mockReturnValue(false) }));
vi.mock('../utils/socketValidation', () => ({
  validatePayload: vi.fn().mockImplementation((_schema: unknown, data: unknown) => ({ success: true, data })),
  submitWordSchema: {},
  submitWordVoteSchema: {},
  submitPeerValidationVoteSchema: {},
}));
vi.mock('../middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock('../modules/wordValidatorPool', () => ({
  isWordOnBoardAsync: vi.fn(),
}));
vi.mock('../dictionary', () => ({
  isDictionaryWord: vi.fn().mockReturnValue(true),
  isValidWordCached: vi.fn().mockResolvedValue(true),
}));
vi.mock('../modules/supabaseServer', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(false),
  recordPlayerWrongWord: vi.fn(),
}));
vi.mock('../modules/communityWordManager', () => ({
  recordVote: vi.fn(),
  updatePendingCache: vi.fn(),
  isWordCommunityValid: vi.fn().mockReturnValue(false),
  isWordValidForScoring: vi.fn().mockReturnValue(false),
}));
vi.mock('../modules/spamDetector', () => ({
  spamDetector: {
    recordInvalidWord: vi.fn().mockReturnValue({ tier: 'none' }),
    clearPlayer: vi.fn(),
    isOnCooldown: vi.fn().mockReturnValue(false),
    getRemainingCooldown: vi.fn().mockReturnValue(0),
  },
  PenaltyTier: { NONE: 'none', WARNING: 'warning', PENALTY: 'penalty', COOLDOWN: 'cooldown' },
  InvalidReason: {},
}));
vi.mock('../services/gracePeriodLock', () => ({
  acquireGracePeriodLock: vi.fn().mockResolvedValue('lock-id'),
  releaseGracePeriodLock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../modules/scoringEngine', () => ({
  calculateWordScore: vi.fn().mockReturnValue(10),
}));
vi.mock('../handlers/wordValidationHandler', () => ({
  handleValidatedWord: vi.fn(),
  handleWordBecameValid: vi.fn(),
  handlePeerRejection: vi.fn(),
}));
vi.mock('../utils/timerManager', () => ({
  default: { setTimeout: vi.fn(), clearTimeout: vi.fn() },
}));

import { vi, type Mock } from 'vitest';
import type { Server, Socket } from 'socket.io';
import * as gsmModule from '../modules/gameStateManager';
import * as socketHelpersModule from '../utils/socketHelpers';
import { isWordOnBoardAsync } from '../modules/wordValidatorPool';
import { checkRateLimit } from '../utils/rateLimiter';
import { checkSocketRateLimit } from '../middleware/rateLimiterRedis';
import { emitError } from '../utils/errorHandler';
import { handleValidatedWord } from '../handlers/wordValidationHandler';
import { registerWordHandlers } from '../handlers/wordHandler';

const gsm = vi.mocked(gsmModule) as unknown as Record<string, Mock>;
const helpers = vi.mocked(socketHelpersModule) as unknown as Record<string, Mock>;

type Handler = (...args: unknown[]) => Promise<void>;

function connect(id: string, io: Server): { socket: Socket; submit: Handler } {
  const handlers: Record<string, Handler> = {};
  const socket = {
    id,
    connected: true,
    emit: vi.fn(),
    on: vi.fn((event: string, h: Handler) => { handlers[event] = h; }),
  } as unknown as Socket;
  registerWordHandlers(io, socket);
  return { socket, submit: handlers.submitWord };
}

function deferred(): { promise: Promise<boolean>; resolve: (v: boolean) => void } {
  let resolve!: (v: boolean) => void;
  const promise = new Promise<boolean>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('submitWord: same-word races and the duplicate rule', () => {
  let game: Record<string, any>;
  let found: Record<string, Set<string>>;
  let firstFinders: Record<string, { username: string; avatar?: string }>;
  const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as unknown as Server;

  beforeEach(() => {
    vi.clearAllMocks();
    found = {};
    firstFinders = {};
    game = {
      gameCode: 'RACE1',
      gameMode: 'classic',
      gameState: 'in-progress',
      letterGrid: [['C', 'A', 'T']],
      language: 'en',
      playerScores: { alice: 0, bob: 0 },
      playerCombos: {},
      users: { alice: {}, bob: {} },
      serverSeq: 4,
    };
    const userBySocket: Record<string, string> = { 'sock-alice': 'alice', 'sock-bob': 'bob' };
    gsm.getGameBySocketId.mockReturnValue('RACE1');
    gsm.getUsernameBySocketId.mockImplementation((id: string) => userBySocket[id]);
    gsm.getGame.mockReturnValue(game);
    helpers.getGameRoom.mockReturnValue('game:RACE1');
    gsm.playerHasWord.mockImplementation((_c: string, u: string, w: string) => !!found[u]?.has(w));
    gsm.getFirstFinder.mockImplementation((_c: string, w: string, u: string) => {
      const f = firstFinders[w];
      return f && f.username !== u ? f : null;
    });
    gsm.updatePlayerScore.mockImplementation((_c: string, u: string, d: number) => {
      game.playerScores[u] = (game.playerScores[u] || 0) + d;
    });
    (handleValidatedWord as Mock).mockImplementation((_io, _s, _g, _c, u: string, w: string) => {
      (found[u] ??= new Set()).add(w);
      firstFinders[w] ??= { username: u };
    });
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
    (checkRateLimit as Mock).mockReturnValue(true);
    (checkSocketRateLimit as Mock).mockResolvedValue({ allowed: true });
  });

  it('credits a word once when the same player submits it twice in flight', async () => {
    const alice = connect('sock-alice', io);
    const gate = deferred();
    (isWordOnBoardAsync as Mock).mockReturnValue(gate.promise);

    const first = alice.submit({ word: 'cat' });
    const second = alice.submit({ word: 'cat' });
    gate.resolve(true);
    await Promise.all([first, second]);

    expect(handleValidatedWord).toHaveBeenCalledTimes(1);
    expect(alice.socket.emit).toHaveBeenCalledWith('wordAlreadyFound', { word: 'cat' });
  });

  it('gives the second of two racing players confirmation credit, not full credit', async () => {
    const alice = connect('sock-alice', io);
    const bob = connect('sock-bob', io);
    const gate = deferred();
    (isWordOnBoardAsync as Mock).mockReturnValue(gate.promise);

    const a = alice.submit({ word: 'cat' });
    const b = bob.submit({ word: 'cat' });
    gate.resolve(true);
    await Promise.all([a, b]);

    expect(handleValidatedWord).toHaveBeenCalledTimes(1);
    expect(bob.socket.emit).toHaveBeenCalledWith('wordAlreadyFoundByOther', expect.objectContaining({ word: 'cat', foundBy: 'alice', confirmationScore: 5 }));
  });

  it('confirmation credit bumps serverSeq, broadcasts the score and refreshes the leaderboard', async () => {
    firstFinders.cat = { username: 'alice' };
    const bob = connect('sock-bob', io);

    await bob.submit({ word: 'cat' });

    expect(game.serverSeq).toBe(5);
    expect(helpers.broadcastToRoom).toHaveBeenCalledWith(io, 'game:RACE1', 'scoreUpdate', expect.objectContaining({
      serverSeq: 5, username: 'bob', deltaScore: 5, totalScore: 5, lastWord: 'cat',
    }));
    expect(gsm.getLeaderboardThrottled).toHaveBeenCalled();
  });

  it.each([
    ['word-hunt', 3],
    ['classic', 8],
  ])('pays full credit to a second finder when duplicates are allowed (%s, %i players)', async (mode, players) => {
    game.gameMode = mode;
    game.users = Object.fromEntries(Array.from({ length: players }, (_, i) => [i === 0 ? 'bob' : `p${i}`, {}]));
    firstFinders.cat = { username: 'p1' };
    const bob = connect('sock-bob', io);

    await bob.submit({ word: 'cat' });

    expect(handleValidatedWord).toHaveBeenCalledTimes(1);
    expect(bob.socket.emit).not.toHaveBeenCalledWith('wordAlreadyFoundByOther', expect.anything());
  });

  it('echoes the word back when the submit is rate limited so the pending tile clears', async () => {
    const alice = connect('sock-alice', io);
    (checkRateLimit as Mock).mockReturnValue(false);
    await alice.submit({ word: 'Cat' });
    expect(alice.socket.emit).toHaveBeenCalledWith('wordRejected', { word: 'cat', reason: 'rate_limited' });

    (checkRateLimit as Mock).mockReturnValue(true);
    (checkSocketRateLimit as Mock).mockResolvedValue({ allowed: false, retryAfterMs: 200 });
    await alice.submit({ word: 'dog' });
    expect(alice.socket.emit).toHaveBeenCalledWith('wordRejected', { word: 'dog', reason: 'rate_limited' });
  });

  it('rejects instead of going silent when the room has no board', async () => {
    game.letterGrid = null;
    const alice = connect('sock-alice', io);
    await alice.submit({ word: 'cat' });
    expect(alice.socket.emit).toHaveBeenCalledWith('wordRejected', { word: 'cat', reason: 'error' });
    expect(emitError).toHaveBeenCalled();
  });

  it('rejects a word that can only be traced through a blizzard-frozen tile', async () => {
    game.activeRoundEvent = 'blizzard';
    game.frozenTiles = [{ row: 0, col: 0 }];
    (isWordOnBoardAsync as Mock).mockImplementation(async (_w: string, grid: string[][]) => !grid.flat().includes('#'));
    const alice = connect('sock-alice', io);

    await alice.submit({ word: 'cat' });

    expect(alice.socket.emit).toHaveBeenCalledWith('wordRejected', { word: 'cat', reason: 'frozen' });
    expect(handleValidatedWord).not.toHaveBeenCalled();
  });

  it('ignores frozen tiles left over once the blizzard is over', async () => {
    game.activeRoundEvent = null;
    game.frozenTiles = [{ row: 0, col: 0 }];
    (isWordOnBoardAsync as Mock).mockImplementation(async (_w: string, grid: string[][]) => !grid.flat().includes('#'));
    const alice = connect('sock-alice', io);

    await alice.submit({ word: 'cat' });

    expect(handleValidatedWord).toHaveBeenCalledTimes(1);
  });
});
