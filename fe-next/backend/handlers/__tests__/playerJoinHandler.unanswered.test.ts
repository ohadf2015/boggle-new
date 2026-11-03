/** A throw inside the async join handler must still answer the client, or it waits out a 10s timeout. */
import { vi } from 'vitest';
import { Server, Socket } from 'socket.io';
import { ErrorCodes } from '../../utils/errorHandler';

const { mockValidatePayload } = vi.hoisted(() => ({
  mockValidatePayload: vi.fn(),
}));

// gameStateManager pulls in a large surface — stub everything the handler imports.
vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getAuthUserConnection: vi.fn(),
  getSocketIdByUsername: vi.fn(),
  addUserToGame: vi.fn(),
  updateUserSocketId: vi.fn(),
  removeUserFromGame: vi.fn(),
  getGameUsers: vi.fn().mockReturnValue([]),
  getActiveRooms: vi.fn().mockReturnValue([]),
  isRoomEmpty: vi.fn(),
  restoreGameFromRedis: vi.fn(),
  updateHostSocketId: vi.fn(),
  getLeaderboard: vi.fn().mockReturnValue([]),
  getTournamentIdFromGame: vi.fn(),
  getGameSpectators: vi.fn().mockReturnValue([]),
  addSpectatorToGame: vi.fn(),
  upgradeSpectatorToPlayer: vi.fn(),
  deleteGame: vi.fn(),
  transferHost: vi.fn(),
  getNextEligibleHost: vi.fn(),
  clearSocketMappingsForLeave: vi.fn(),
  isSpectator: vi.fn(),
}));

vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  broadcastToRoomExceptSender: vi.fn(),
  broadcastActiveRooms: vi.fn(),
  getGameRoom: vi.fn((code: string) => `game:${code}`),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  LOBBY_ROOM: 'lobby',
  safeEmit: vi.fn(),
  getSocketById: vi.fn(),
  disconnectSocket: vi.fn(),
  isSocketMigrating: vi.fn().mockReturnValue(false),
}));

// Keep the REAL emitError so the legacy-vs-typed log branch is exercised end-to-end,
// and spy the logger to assert which level fires.
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  default: { checkRateLimit: vi.fn().mockReturnValue(true) },
}));

vi.mock('../../utils/timerManager', () => ({
  default: { clearGameTimer: vi.fn() }, clearGameTimer: vi.fn(),
}));
vi.mock('../../utils/gameStartCoordinator', () => ({ default: { cancel: vi.fn() } }));
vi.mock('../../services/gameLifecycle/gameTimer.js', () => ({ startGameTimer: vi.fn(), resumeGameTimerIfMissing: vi.fn() }));
vi.mock('../../services/gameLifecycle/gameTimer', () => ({ startGameTimer: vi.fn(), resumeGameTimerIfMissing: vi.fn() }));
vi.mock('../../modules/botManager', () => ({ cleanupGameBots: vi.fn() }));
vi.mock('../../utils/gameUtils', () => ({
  generateRandomAvatar: vi.fn().mockReturnValue({ color: 'blue', icon: 'cat' }),
}));
vi.mock('../../utils/socketValidation', () => ({
  validatePayload: mockValidatePayload,
  joinGameSchema: {},
}));
vi.mock('../../utils/consts', () => ({ MAX_PLAYERS_PER_ROOM: 8 }));
vi.mock('../../utils/gameStateMachine', () => ({
  isInProgress: vi.fn().mockReturnValue(false),
  canJoinFreely: vi.fn().mockReturnValue(true),
  shouldSendGameState: vi.fn().mockReturnValue(false),
}));
vi.mock('../../modules/notificationService', () => ({
  notifyPlayerJoined: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../playerReconnectHandler', () => ({
  handleReconnection: vi.fn(),
  handleLateJoin: vi.fn(),
  handleTournamentJoin: vi.fn(),
  handleExistingAuthConnectionJoin: vi.fn().mockResolvedValue({ handled: false }),
}));
vi.mock('../playerDataInit', () => ({ ensurePlayerState: vi.fn().mockResolvedValue(undefined) }));

import { registerPlayerJoinHandlers } from '../playerJoinHandler';
import loggerDefault from '../../utils/logger';

import * as gsm from '../../modules/gameStateManager';

const logger = loggerDefault as unknown as {
  warn: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

function captureJoinHandler() {
  const listeners: Record<string, (...args: unknown[]) => unknown> = {};
  const socket = {
    id: 'val-socket-1',
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: {},
    on: vi.fn((event: string, cb: (...args: unknown[]) => unknown) => { listeners[event] = cb; }),
  } as unknown as Socket;
  const io = { emit: vi.fn(), to: vi.fn().mockReturnThis() } as unknown as Server;
  registerPlayerJoinHandlers(io, socket);
  return { socket, join: listeners['join'] };
}

describe('PlayerJoinHandler — never leaves a join unanswered', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers INTERNAL_ERROR when the handler throws', async () => {
    mockValidatePayload.mockReturnValue({ success: true, data: { gameCode: 'ABC123', username: 'Ann' } });
    (gsm.getGame as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error('boom'); });

    const { socket, join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Ann' });

    const errorCall = (socket.emit as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === 'error');
    expect(errorCall?.[1]).toMatchObject({ code: ErrorCodes.INTERNAL_ERROR });
    expect(logger.error).toHaveBeenCalled();
  });
});
