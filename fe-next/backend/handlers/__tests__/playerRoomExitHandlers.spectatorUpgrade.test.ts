import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Server, Socket } from 'socket.io';

const h = vi.hoisted(() => ({
  getGame: vi.fn(),
  getGameSpectators: vi.fn(),
  upgradeSpectatorToPlayer: vi.fn(),
  emitClassroomContext: vi.fn(),
}));

vi.mock('../../modules/gameStateManager.js', () => ({
  getGame: h.getGame,
  deleteGame: vi.fn(),
  removeUserFromGame: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  getGameUsers: vi.fn().mockReturnValue([]),
  getActiveRooms: vi.fn().mockReturnValue([]),
  isRoomEmpty: vi.fn(),
  getGameSpectators: h.getGameSpectators,
  upgradeSpectatorToPlayer: h.upgradeSpectatorToPlayer,
  getNextEligibleHost: vi.fn(),
  transferHost: vi.fn(),
}));
vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: vi.fn(),
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
vi.mock('../classroomRosterBroadcast.js', () => ({ broadcastClassroomRoster: vi.fn() }));
vi.mock('../../modules/classroomGameContext.js', () => ({ emitClassroomContext: h.emitClassroomContext }));

import { registerPlayerRoomExitHandlers } from '../playerRoomExitHandlers';

describe('upgradeToPlayer — a spectator takes a freed seat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.upgradeSpectatorToPlayer.mockReturnValue(true);
    h.getGameSpectators.mockReturnValue([{ username: 'Ada', socketId: 's-ada' }]);
  });

  it('given a classroom lobby, when a waiting student is promoted, then they get the same classroom context and study deck as a fresh join', () => {
    h.getGame.mockReturnValue({ gameState: 'waiting', isClassroom: true, users: { Teacher: {} } });
    const handlers: Record<string, (p: unknown) => void> = {};
    const socket = {
      id: 's-ada',
      data: { verifiedUserId: 'student-1' },
      on: (ev: string, fn: (p: unknown) => void) => { handlers[ev] = fn; },
      emit: vi.fn(),
    } as unknown as Socket;
    registerPlayerRoomExitHandlers({} as Server, socket);

    handlers.upgradeToPlayer({ gameCode: 'ABC123' });

    expect(socket.emit).toHaveBeenCalledWith('spectatorUpgraded', expect.objectContaining({ username: 'Ada' }));
    expect(h.emitClassroomContext).toHaveBeenCalledWith(socket, 'ABC123', 'student-1');
  });
});
