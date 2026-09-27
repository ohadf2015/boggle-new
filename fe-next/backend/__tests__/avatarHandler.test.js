/**
 * Avatar Handler Tests
 * Verifies typed ErrorCodes are emitted for avatar update failures
 */

vi.mock('../modules/gameStateManager');
vi.mock('../utils/socketHelpers');
vi.mock('../utils/errorHandler', async () => {
  const actual = await vi.importActual('../utils/errorHandler');
  return {
    ...actual,
    emitError: vi.fn(),
  };
});
vi.mock('../utils/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}));
vi.mock('../handlers/shared', () => ({
  isSocketMigrating: vi.fn().mockReturnValue(false),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { registerAvatarHandlers } from '../handlers/avatarHandler';
import { getGame, getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager';
import { emitError, ErrorCodes } from '../utils/errorHandler';

describe('Avatar Handler', () => {
  let mockIo;
  let mockSocket;
  let eventHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = {};
    mockSocket = {
      id: 'socket-123',
      on: vi.fn((event, handler) => { eventHandlers[event] = handler; }),
      emit: vi.fn(),
    };
    mockIo = { to: vi.fn().mockReturnThis(), emit: vi.fn() };

    getGameBySocketId.mockReturnValue('ABCDEF');
    getUsernameBySocketId.mockReturnValue('TestUser');
    getGame.mockReturnValue({ users: { TestUser: { avatar: {} } } });

    registerAvatarHandlers(mockIo, mockSocket);
  });

  it('emits VALIDATION_INVALID_PAYLOAD on schema parse failure', () => {
    eventHandlers['updateAvatar'](null);
    expect(emitError).toHaveBeenCalledWith(
      mockSocket,
      ErrorCodes.VALIDATION_INVALID_PAYLOAD,
      expect.objectContaining({ message: expect.stringMatching(/avatar/i) })
    );
  });

  it('emits PLAYER_NOT_IN_GAME when no gameCode/username resolved', () => {
    getGameBySocketId.mockReturnValue(null);
    getUsernameBySocketId.mockReturnValue(null);
    eventHandlers['updateAvatar']({ avatarImage: 'cat' });
    expect(emitError).toHaveBeenCalledWith(mockSocket, ErrorCodes.PLAYER_NOT_IN_GAME);
  });

  it('emits GAME_NOT_FOUND when game lookup fails', () => {
    getGame.mockReturnValue(null);
    eventHandlers['updateAvatar']({ avatarImage: 'cat', gameCode: 'ZZZZZZ' });
    expect(emitError).toHaveBeenCalledWith(mockSocket, ErrorCodes.GAME_NOT_FOUND);
  });
});
