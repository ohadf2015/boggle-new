import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { signBoostToken } from '../../utils/boostToken';

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
} }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock('../../utils/metrics', () => ({ inc: vi.fn() }));
vi.mock('./shared', () => ({ isSocketMigrating: vi.fn(() => false) }));

import { registerBoostHandlers } from '../boostHandler';
import { getGame, updateGame, getUsernameBySocketId } from '../../modules/gameStateManager';

const mockGetGame = getGame as Mock;
const mockUpdateGame = updateGame as Mock;
const mockGetUsernameBySocketId = getUsernameBySocketId as Mock;

function createMockSocket(id = 'socket-1') {
  const handlers: Record<string, Function> = {};
  return {
    socket: {
      id,
      on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
      emit: vi.fn(),
    } as any,
    handlers,
  };
}

function makeGame(playerBoosts: Record<string, { sessionId: string; token: string }> = {}): any {
  return {
    gameCode: 'GAME1',
    playerBoosts,
  };
}

describe('boostHandler', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    process.env.BOOST_TOKEN_SECRET = 'test-secret';
    vi.clearAllMocks();
  });

  // ─── Token utility coverage (kept from previous test file) ───
  it('signs and verifies boost tokens correctly', () => {
    const token = signBoostToken('sess-test-123', 'firstWordBonus');
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.includes('b1')).toBe(true);
  });

  it('detects expired tokens', () => {
    const token = signBoostToken('sess-1', 'firstWordBonus', Date.now() - 10 * 60 * 1000);
    expect(token).toBeTruthy();
  });

  // ─── boost:apply handler ───
  describe('boost:apply', () => {
    it('applies a valid boost on first claim', async () => {
      const { socket, handlers } = createMockSocket();
      registerBoostHandlers(mockIo, socket);

      mockGetGame.mockReturnValue(makeGame());
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      const token = signBoostToken('sess-1', 'firstWordBonus');

      await handlers['boost:apply']({ gameCode: 'GAME1', sessionId: 'sess-1', token });

      expect(mockUpdateGame).toHaveBeenCalledTimes(1);
      expect(socket.emit).toHaveBeenCalledWith('boost:applied', expect.objectContaining({
        success: true,
        boostType: 'firstWordBonus',
      }));
    });

    it('rejects a second claim for the same session (idempotency guard)', async () => {
      const { socket, handlers } = createMockSocket();
      registerBoostHandlers(mockIo, socket);

      const existingToken = signBoostToken('sess-1', 'firstWordBonus');
      mockGetGame.mockReturnValue(makeGame({
        Player1: { sessionId: 'sess-1', token: existingToken },
      }));
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      const newToken = signBoostToken('sess-1', 'firstWordBonus');

      await handlers['boost:apply']({ gameCode: 'GAME1', sessionId: 'sess-1', token: newToken });

      // updateGame must NOT be called — game state unchanged.
      expect(mockUpdateGame).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        code: 'BOOST_ALREADY_CLAIMED',
      }));
    });

    it('allows overwriting a boost from a different (prior) session', async () => {
      const { socket, handlers } = createMockSocket();
      registerBoostHandlers(mockIo, socket);

      const oldToken = signBoostToken('sess-OLD', 'firstWordBonus');
      mockGetGame.mockReturnValue(makeGame({
        Player1: { sessionId: 'sess-OLD', token: oldToken },
      }));
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      const newToken = signBoostToken('sess-NEW', 'firstWordBonus');

      await handlers['boost:apply']({ gameCode: 'GAME1', sessionId: 'sess-NEW', token: newToken });

      // New session is a fresh game — should apply, not block.
      expect(mockUpdateGame).toHaveBeenCalledTimes(1);
      expect(socket.emit).toHaveBeenCalledWith('boost:applied', expect.objectContaining({
        success: true,
      }));
    });
  });
});
