/**
 * GD-022: Combo increment on confirmation finds
 *
 * When a player finds a word already found by another player they receive 50%
 * partial credit (confirmation find). Prior to this fix, `playerCombos` was NOT
 * incremented — causing a "rich-get-richer" dynamic where only first-finders
 * could build combos. The fix increments the combo for confirmation finds too.
 */

// ── Mock every dependency before importing the handler ──────────────────────
vi.mock('../utils/logger', () => ({ default: {
  info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
} }));
vi.mock('../modules/gameStateManager');
vi.mock('../utils/socketHelpers');
vi.mock('../utils/profanityFilter', () => ({ isProfane: vi.fn().mockReturnValue(false) }));
vi.mock('../utils/errorHandler', () => ({
  emitError: vi.fn(),
  ErrorCodes: {},
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
  isWordOnBoardAsync: vi.fn().mockResolvedValue(true),
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
    recordInvalidWord: vi.fn(),
    clearPlayer: vi.fn(),
    isOnCooldown: vi.fn().mockReturnValue(false),
    getRemainingCooldown: vi.fn().mockReturnValue(0),
  },
  PenaltyTier: { NONE: 'none', WARNING: 'warning', PENALTY: 'penalty', COOLDOWN: 'cooldown' },
  InvalidReason: {},
}));
vi.mock('../services/gracePeriodLock', () => ({ default: {
  acquireGracePeriodLock: vi.fn().mockResolvedValue('lock-id'),
  releaseGracePeriodLock: vi.fn().mockResolvedValue(undefined),
} }));
vi.mock('../modules/scoringEngine', () => ({
  calculateWordScore: vi.fn().mockReturnValue(10),
}));
vi.mock('../handlers/wordValidationHandler', () => ({
  handleValidatedWord: vi.fn().mockResolvedValue(undefined),
  handleWordBecameValid: vi.fn(),
  handlePeerRejection: vi.fn(),
}));
vi.mock('../utils/timerManager', () => ({
  default: { setTimeout: vi.fn(), clearTimeout: vi.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────────────
import { vi, type Mock, type MockInstance } from 'vitest';
import type { Server, Socket } from 'socket.io';

import * as gsmModule from '../modules/gameStateManager';
import { registerWordHandlers } from '../handlers/wordHandler';

const gsm = vi.mocked(gsmModule) as unknown as Record<string, Mock>;
// ── Helpers ──────────────────────────────────────────────────────────────────
function makeSocket(overrides: Partial<Socket> = {}): Socket {
  return {
    id: 'socket-player',
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      (makeSocket as any).__handlers = (makeSocket as any).__handlers || {};
      (makeSocket as any).__handlers[event] = handler;
    }),
    emit: vi.fn(),
    connected: true,
    ...overrides,
  } as unknown as Socket;
}

function captureHandlers(socket: Socket): Record<string, (...args: unknown[]) => Promise<void>> {
  const handlers: Record<string, (...args: unknown[]) => Promise<void>> = {};
  (socket.on as Mock).mockImplementation((event: string, handler: (...args: unknown[]) => Promise<void>) => {
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
    vi.clearAllMocks();

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

    const mockIo = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as unknown as Server;
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
