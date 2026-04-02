/**
 * @jest-environment node
 */
// @ts-jest-config: {"diagnostics":false}
import type { GameState } from '../../modules/gameState/types';
import {
  handleReconnection,
  handleLateJoin,
} from '../playerReconnectHandler';
import {
  getGameUsers,
  updateUserSocketId,
  updateHostSocketId,
  getLeaderboard,
} from '../../modules/gameStateManager';
import {
  broadcastToRoom,
  getGameRoom,
  joinRoom,
  leaveRoom,
  LOBBY_ROOM,
} from '../../utils/socketHelpers';
import timerManager from '../../utils/timerManager';
import { isInProgress } from '../../utils/gameStateMachine';
import { ACHIEVEMENT_ICONS } from '../../modules/achievementManager';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../modules/gameStateManager');
jest.mock('../../utils/socketHelpers');
jest.mock('../../utils/timerManager', () => ({
  __esModule: true,
  default: {
    clearTimer: jest.fn(),
    setTimeout: jest.fn(),
  },
  clearGameTimer: jest.fn(),
}));
jest.mock('../../utils/gameStateMachine');
jest.mock('../../modules/achievementManager', () => ({
  ACHIEVEMENT_ICONS: { SPEED_DEMON: '⚡', COMBO_KING: '👑' },
}));
jest.mock('../../modules/tournamentManager', () => ({
  addPlayerMidTournament: jest.fn(),
  getTournament: jest.fn(),
  getTournamentStandings: jest.fn(),
  getTournamentIdFromGame: jest.fn().mockReturnValue(null),
}));
jest.mock('../../modules/botManager', () => ({
  cleanupGameBots: jest.fn(),
}));

const mockGetGameUsers = getGameUsers as jest.Mock;
const mockUpdateUserSocketId = updateUserSocketId as jest.Mock;
const mockUpdateHostSocketId = updateHostSocketId as jest.Mock;
const mockGetLeaderboard = getLeaderboard as jest.Mock;
const mockBroadcastToRoom = broadcastToRoom as jest.Mock;
const mockGetGameRoom = getGameRoom as jest.Mock;
const mockJoinRoom = joinRoom as jest.Mock;
const mockLeaveRoom = leaveRoom as jest.Mock;
const mockIsInProgress = isInProgress as jest.Mock;
const mockTimerManager = timerManager as jest.Mocked<typeof timerManager>;

function createMockSocket(id = 'socket-new') {
  return {
    id,
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    data: {},
  } as any;
}

function makeGame(overrides: Record<string, any> = {}): GameState {
  return {
    gameCode: 'GAME1',
    hostSocketId: 'socket-host',
    hostUsername: 'Host',
    roomName: 'Test Room',
    language: 'en',
    timerSeconds: 120,
    gameState: 'waiting',
    gameMode: 'classic',
    letterGrid: null,
    playerScores: {},
    playerWords: {},
    playerWordDetails: {},
    playerAchievements: {},
    playerCombos: {},
    spectators: {},
    tournamentId: null,
    reconnectionTimeout: null,
    isRanked: false,
    allowLateJoin: true,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    gameSessionId: 1,
    aiApprovedWords: [],
    peerValidationWord: null,
    peerValidationVotes: {},
    playersReadyForNextGame: {},
    users: {
      Host: { socketId: 'socket-host', isHost: true, disconnected: false, authUserId: null, guestTokenHash: null } as any,
      Player1: { socketId: 'socket-old', isHost: false, disconnected: true, authUserId: null, guestTokenHash: null } as any,
    },
    ...overrides,
  } as GameState;
}

describe('handleReconnection', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGameRoom.mockReturnValue('game:GAME1');
    mockGetGameUsers.mockReturnValue([]);
    mockGetLeaderboard.mockReturnValue([]);
    mockIsInProgress.mockReturnValue(false);
  });

  // 1. Disconnected flag is cleared on reconnect
  it('clears disconnected flag for reconnecting player', () => {
    const game = makeGame();
    const socket = createMockSocket('socket-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Player1');

    expect(game.users.Player1.disconnected).toBe(false);
    expect((game.users.Player1 as any).disconnectedAt).toBeUndefined();
  });

  // 2. Reconnect timer is cleared
  it('clears the reconnection timer for the player', () => {
    const game = makeGame();
    const socket = createMockSocket('socket-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Player1');

    expect(mockTimerManager.clearTimer).toHaveBeenCalledWith('reconnect:GAME1:Player1');
  });

  // 3. Socket ID mappings are updated
  it('updates socket ID mapping for the reconnecting player', () => {
    const game = makeGame();
    const socket = createMockSocket('socket-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Player1', 'auth-123');

    expect(mockUpdateUserSocketId).toHaveBeenCalledWith(
      'GAME1',
      'Player1',
      'socket-new',
      expect.objectContaining({ authUserId: 'auth-123' })
    );
  });

  // 4. Player is re-added to the socket room
  it('joins socket to the game room and leaves lobby', () => {
    const game = makeGame();
    const socket = createMockSocket('socket-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Player1');

    expect(mockJoinRoom).toHaveBeenCalledWith(socket, 'game:GAME1');
    expect(mockLeaveRoom).toHaveBeenCalledWith(socket, LOBBY_ROOM);
  });

  // 5. Host reconnect: hostSocketId updated + host timer cleared
  it('updates hostSocketId and clears host reconnect timer when host reconnects', () => {
    const game = makeGame();
    const socket = createMockSocket('socket-host-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Host');

    expect(mockUpdateHostSocketId).toHaveBeenCalledWith('GAME1', 'socket-host-new');
    expect(mockTimerManager.clearTimer).toHaveBeenCalledWith('hostReconnect:GAME1');
  });

  // 6. Non-host reconnect: hostSocketId NOT updated
  it('does not update hostSocketId when a non-host player reconnects', () => {
    const game = makeGame();
    const socket = createMockSocket('socket-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Player1');

    expect(mockUpdateHostSocketId).not.toHaveBeenCalled();
    expect(mockTimerManager.clearTimer).not.toHaveBeenCalledWith('hostReconnect:GAME1');
  });

  // 7. Game state is sent when game is in progress
  it('emits startGame with game state when game is in progress', () => {
    const game = makeGame({ gameState: 'playing', letterGrid: [['A', 'B']], remainingTime: 60 });
    mockIsInProgress.mockReturnValue(true);
    const socket = createMockSocket('socket-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Player1');

    expect(socket.emit).toHaveBeenCalledWith(
      'startGame',
      expect.objectContaining({
        letterGrid: game.letterGrid,
        timerSeconds: 60,
        reconnect: true,
      })
    );
    expect(socket.emit).toHaveBeenCalledWith('updateLeaderboard', expect.objectContaining({ leaderboard: [] }));
  });

  // 8. Game state NOT sent when game not in progress
  it('does not emit startGame when game is not in progress', () => {
    const game = makeGame({ gameState: 'waiting' });
    mockIsInProgress.mockReturnValue(false);
    const socket = createMockSocket('socket-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Player1');

    expect(socket.emit).not.toHaveBeenCalledWith('startGame', expect.anything());
  });

  // 9. Player achievements are re-sent during reconnect to in-progress game
  it('resends achievements when player reconnects to in-progress game', () => {
    const game = makeGame({
      gameState: 'playing',
      letterGrid: [],
      playerAchievements: { Player1: ['SPEED_DEMON', 'COMBO_KING'] },
    });
    mockIsInProgress.mockReturnValue(true);
    const socket = createMockSocket('socket-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Player1');

    expect(socket.emit).toHaveBeenCalledWith(
      'liveAchievementUnlocked',
      expect.objectContaining({
        achievements: expect.arrayContaining([
          expect.objectContaining({ key: 'SPEED_DEMON' }),
        ]),
      })
    );
  });

  // 10. playerReconnected is broadcast and updateUsers is sent
  it('broadcasts playerReconnected and updateUsers to room', () => {
    const game = makeGame();
    const socket = createMockSocket('socket-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Player1');

    expect(mockBroadcastToRoom).toHaveBeenCalledWith(
      mockIo, 'game:GAME1', 'playerReconnected', { username: 'Player1' }
    );
    expect(mockBroadcastToRoom).toHaveBeenCalledWith(
      mockIo, 'game:GAME1', 'updateUsers', expect.objectContaining({ users: [] })
    );
  });

  // 11. joined event is emitted with reconnected: true
  it('emits joined event with reconnected flag', () => {
    const game = makeGame();
    const socket = createMockSocket('socket-new');

    handleReconnection(mockIo, socket, game, 'GAME1', 'Player1');

    expect(socket.emit).toHaveBeenCalledWith(
      'joined',
      expect.objectContaining({
        success: true,
        gameCode: 'GAME1',
        reconnected: true,
        username: 'Player1',
        isHost: false,
      })
    );
  });
});

describe('handleLateJoin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLeaderboard.mockReturnValue([]);
  });

  it('emits startGame with lateJoin flag', () => {
    const game = makeGame({ gameState: 'playing', letterGrid: [['A']], remainingTime: 45 });
    const socket = createMockSocket();

    handleLateJoin(socket, game, 'GAME1', 'NewPlayer');

    expect(socket.emit).toHaveBeenCalledWith(
      'startGame',
      expect.objectContaining({ lateJoin: true, letterGrid: game.letterGrid })
    );
  });

  it('emits updateLeaderboard to late joiner', () => {
    const game = makeGame({ gameState: 'playing', letterGrid: [] });
    mockGetLeaderboard.mockReturnValue([{ username: 'Host', score: 10 }]);
    const socket = createMockSocket();

    handleLateJoin(socket, game, 'GAME1', 'NewPlayer');

    expect(socket.emit).toHaveBeenCalledWith(
      'updateLeaderboard',
      expect.objectContaining({ leaderboard: [{ username: 'Host', score: 10 }] })
    );
  });
});
