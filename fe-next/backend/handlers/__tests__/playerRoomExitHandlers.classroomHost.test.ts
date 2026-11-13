import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Server, Socket } from 'socket.io';

const h = vi.hoisted(() => ({
  getGame: vi.fn(),
  deleteGame: vi.fn(),
  removeUserFromGame: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  isRoomEmpty: vi.fn(),
  getNextEligibleHost: vi.fn(),
  transferHost: vi.fn(),
  broadcastToRoom: vi.fn(),
}));

vi.mock('../../modules/gameStateManager.js', () => ({
  getGame: h.getGame,
  deleteGame: h.deleteGame,
  removeUserFromGame: h.removeUserFromGame,
  getUsernameBySocketId: h.getUsernameBySocketId,
  getGameUsers: vi.fn().mockReturnValue([]),
  getActiveRooms: vi.fn().mockReturnValue([]),
  isRoomEmpty: h.isRoomEmpty,
  getGameSpectators: vi.fn().mockReturnValue([]),
  upgradeSpectatorToPlayer: vi.fn(),
  getNextEligibleHost: h.getNextEligibleHost,
  transferHost: h.transferHost,
}));
vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: h.broadcastToRoom,
  broadcastActiveRooms: vi.fn(),
  getGameRoom: (code: string) => `game:${code}`,
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  LOBBY_ROOM: 'lobby',
}));
vi.mock('../../utils/errorHandler.js', () => ({ emitError: vi.fn(), ErrorCodes: {} }));
vi.mock('../../utils/rateLimiter.js', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
vi.mock('../../utils/timerManager.js', () => ({ default: { clearTimer: vi.fn() }, clearGameTimer: vi.fn() }));
vi.mock('../../modules/botManager.js', () => ({ cleanupGameBots: vi.fn() }));
vi.mock('../../utils/gameStartCoordinator.js', () => ({ default: { cleanupSequence: vi.fn() } }));
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() } }));
vi.mock('../playerReconnectHandler', () => ({ handleLateJoin: vi.fn() }));
vi.mock('../playerDataInit', () => ({ ensurePlayerState: vi.fn() }));
vi.mock('../midRoundLeave.js', () => ({ removeMidRoundLeaver: vi.fn() }));

import { registerPlayerRoomExitHandlers } from '../playerRoomExitHandlers';
import { CLASSROOM_ROOM_GONE_KEY } from '@/lib/education/classroomRoomGone';

function leave(game: Record<string, unknown>) {
  const handlers: Record<string, (p: unknown) => void> = {};
  const socket = { id: 's-teacher', on: (ev: string, fn: (p: unknown) => void) => { handlers[ev] = fn; }, emit: vi.fn() } as unknown as Socket;
  h.getGame.mockReturnValue(game);
  h.getUsernameBySocketId.mockReturnValue('Teacher');
  registerPlayerRoomExitHandlers({} as Server, socket);
  handlers.leaveRoom({ gameCode: 'ABC123', username: 'Teacher' });
}

const lobby = (extra: Record<string, unknown> = {}) => ({
  gameState: 'waiting',
  hostUsername: 'Teacher',
  users: { Teacher: { isHost: true }, Ava: {}, Ben: {} },
  ...extra,
});

describe('leaveRoom — host leaves a lobby with players in it', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.isRoomEmpty.mockReturnValue(false);
    h.getNextEligibleHost.mockReturnValue('Ava');
    h.transferHost.mockReturnValue({ success: true });
  });

  it('Given a classroom room, When the teacher closes it, Then no student becomes host and the class is told the game ended', () => {
    leave(lobby({ isClassroom: true }));

    expect(h.transferHost).not.toHaveBeenCalled();
    expect(h.deleteGame).toHaveBeenCalledWith('ABC123');
    expect(h.broadcastToRoom).toHaveBeenCalledWith(expect.anything(), 'game:ABC123', 'hostLeftRoomClosing', expect.objectContaining({ i18nKey: CLASSROOM_ROOM_GONE_KEY }));
  });

  it('Given an ordinary room, When the host leaves, Then host still passes to the next player', () => {
    leave(lobby());

    expect(h.transferHost).toHaveBeenCalledWith('ABC123', 'Ava');
    expect(h.deleteGame).not.toHaveBeenCalled();
  });
});
