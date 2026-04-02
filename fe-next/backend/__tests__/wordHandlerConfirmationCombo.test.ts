/**
 * GD-022: Combo increment on confirmation finds
 *
 * When a player finds a word already found by another player they receive 50%
 * partial credit (confirmation find). Prior to this fix, `playerCombos` was NOT
 * incremented — causing a "rich-get-richer" dynamic where only first-finders
 * could build combos. The fix increments the combo for confirmation finds too.
 */

// ── Mock every dependency before importing the handler ──────────────────────
jest.mock('../utils/logger', () => ({
  info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));
jest.mock('../modules/gameStateManager');
jest.mock('../utils/socketHelpers');
jest.mock('../utils/profanityFilter', () => ({ isProfane: jest.fn().mockReturnValue(false) }));
jest.mock('../utils/errorHandler', () => ({
  emitError: jest.fn(),
  ErrorCodes: {},
}));
jest.mock('../utils/rateLimiter', () => ({ checkRateLimit: jest.fn().mockReturnValue(true) }));
jest.mock('../utils/metrics', () => ({ inc: jest.fn(), incPerGame: jest.fn() }));
jest.mock('../handlers/shared', () => ({ isSocketMigrating: jest.fn().mockReturnValue(false) }));
jest.mock('../utils/socketValidation', () => ({
  validatePayload: jest.fn().mockImplementation((_schema: unknown, data: unknown) => ({ success: true, data })),
  submitWordSchema: {},
  submitWordVoteSchema: {},
  submitPeerValidationVoteSchema: {},
}));
jest.mock('../middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));
jest.mock('../modules/wordValidatorPool', () => ({
  isWordOnBoardAsync: jest.fn().mockResolvedValue(true),
}));
jest.mock('../dictionary', () => ({
  isDictionaryWord: jest.fn().mockReturnValue(true),
  isValidWordCached: jest.fn().mockResolvedValue(true),
}));
jest.mock('../modules/supabaseServer', () => ({
  isSupabaseConfigured: jest.fn().mockReturnValue(false),
  recordPlayerWrongWord: jest.fn(),
}));
jest.mock('../modules/communityWordManager', () => ({
  recordVote: jest.fn(),
  updatePendingCache: jest.fn(),
  isWordCommunityValid: jest.fn().mockReturnValue(false),
  isWordValidForScoring: jest.fn().mockReturnValue(false),
}));
jest.mock('../modules/spamDetector', () => ({
  spamDetector: {
    recordInvalidWord: jest.fn(),
    clearPlayer: jest.fn(),
    isOnCooldown: jest.fn().mockReturnValue(false),
    getRemainingCooldown: jest.fn().mockReturnValue(0),
  },
  PenaltyTier: { NONE: 'none', WARNING: 'warning', PENALTY: 'penalty', COOLDOWN: 'cooldown' },
  InvalidReason: {},
}));
jest.mock('../services/gracePeriodLock', () => ({
  acquireGracePeriodLock: jest.fn().mockResolvedValue('lock-id'),
  releaseGracePeriodLock: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../modules/scoringEngine', () => ({
  calculateWordScore: jest.fn().mockReturnValue(10),
}));
jest.mock('../handlers/wordValidationHandler', () => ({
  handleValidatedWord: jest.fn().mockResolvedValue(undefined),
  handleWordBecameValid: jest.fn(),
  handlePeerRejection: jest.fn(),
}));
jest.mock('../utils/timerManager', () => ({
  default: { setTimeout: jest.fn(), clearTimeout: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────────────
import type { Server, Socket } from 'socket.io';

const gsm = require('../modules/gameStateManager') as Record<string, jest.Mock>;
const { registerWordHandlers } = require('../handlers/wordHandler');

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeSocket(overrides: Partial<Socket> = {}): Socket {
  return {
    id: 'socket-player',
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      (makeSocket as any).__handlers = (makeSocket as any).__handlers || {};
      (makeSocket as any).__handlers[event] = handler;
    }),
    emit: jest.fn(),
    connected: true,
    ...overrides,
  } as unknown as Socket;
}

function captureHandlers(socket: Socket): Record<string, (...args: unknown[]) => Promise<void>> {
  const handlers: Record<string, (...args: unknown[]) => Promise<void>> = {};
  (socket.on as jest.Mock).mockImplementation((event: string, handler: (...args: unknown[]) => Promise<void>) => {
    handlers[event] = handler;
  });
  return handlers;
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('GD-022: confirmation find combo increment', () => {
  let socket: Socket;
  let handlers: Record<string, (...args: unknown[]) => Promise<void>>;
  let mockGame: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGame = {
      gameCode: 'TEST1',
      gameState: 'in-progress',
      letterGrid: [['C', 'A', 'T']],
      language: 'en',
      playerScores: { alice: 20 },
      playerCombos: { alice: 2 },
      users: { alice: { avatar: 'cat' } },
      words: [],
    };

    gsm.getGameBySocketId.mockReturnValue('TEST1');
    gsm.getUsernameBySocketId.mockReturnValue('alice');
    gsm.getGame.mockReturnValue(mockGame);
    gsm.playerHasWord.mockReturnValue(false);
    gsm.getLeaderboardThrottled.mockReturnValue([]);
    gsm.markUserActivity.mockReturnValue(undefined);
    gsm.updatePlayerScore.mockReturnValue(undefined);
    gsm.addPlayerWord.mockReturnValue(undefined);
    // Simulate another player already found the word
    gsm.getFirstFinder.mockReturnValue({ username: 'bob', avatar: 'dog' });

    socket = makeSocket();
    handlers = captureHandlers(socket);

    const mockIo = { to: jest.fn().mockReturnThis(), emit: jest.fn() } as unknown as Server;
    registerWordHandlers(mockIo, socket);
  });

  it('increments playerCombos for a confirmation find', async () => {
    // alice submits "cat" — already found by bob
    await handlers['submitWord']({ word: 'cat' });

    expect(mockGame.playerCombos).toEqual({ alice: 3 }); // was 2, now 3
  });

  it('initialises playerCombos if absent before incrementing', async () => {
    delete (mockGame as Record<string, unknown>).playerCombos;

    await handlers['submitWord']({ word: 'cat' });

    expect((mockGame.playerCombos as Record<string, number>)['alice']).toBe(1);
  });

  it('emits wordAlreadyFoundByOther with confirmationScore', async () => {
    await handlers['submitWord']({ word: 'cat' });

    expect(socket.emit).toHaveBeenCalledWith(
      'wordAlreadyFoundByOther',
      expect.objectContaining({ word: 'cat', foundBy: 'bob', confirmationScore: 5 }),
    );
  });
});
