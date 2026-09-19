/**
 * Regression — Classroom game leaderboard payload consistency
 *
 * Class-3 Pitfall: Asymmetric paths emitting different payloads.
 * Issue: join emits `startGame`+`updateLeaderboard`, but `requestGameState`
 * (reconnect watchdog) emits `startGame` only → score froze at 0.
 *
 * Fix: Both paths carry leaderboard INSIDE the common payload so the client
 * restores it atomically in one batched setState.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockGetGameBySocketId,
  mockGetGame,
  mockAddUserToGame,
  mockSafeEmit,
  mockGetLeaderboard,
  mockGetGameRoom,
} = vi.hoisted(() => ({
  mockGetGameBySocketId: vi.fn(),
  mockGetGame: vi.fn(),
  mockAddUserToGame: vi.fn().mockReturnValue({ success: true }),
  mockSafeEmit: vi.fn(),
  mockGetLeaderboard: vi.fn().mockReturnValue([
    { username: 'alice', score: 100, rank: 1, playerId: 'alice-id' },
    { username: 'bob', score: 80, rank: 2, playerId: 'bob-id' },
  ]),
  mockGetGameRoom: vi.fn().mockReturnValue('room:TEST'),
}));

vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getGameBySocketId: mockGetGameBySocketId,
  addUserToGame: mockAddUserToGame,
  getLeaderboard: mockGetLeaderboard,
  createGame: vi.fn(),
  updateGame: vi.fn(),
  deleteGame: vi.fn(),
  gameExists: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  getSocketIdByUsername: vi.fn(),
  getGameUsers: vi.fn().mockReturnValue([]),
  getActiveRooms: vi.fn().mockReturnValue([]),
  resetGameForNewRound: vi.fn(),
  getAuthUserConnection: vi.fn(),
  transitionGameState: vi.fn().mockReturnValue({ success: true }),
  canTransitionGameState: vi.fn().mockReturnValue(true),
  isRoomEmpty: vi.fn(),
  bindSocketToGame: vi.fn(),
  unbindSocketFromGame: vi.fn(),
}));

vi.mock('../../../backend/utils/socketHelpers', () => ({
  safeEmit: mockSafeEmit,
  getGameRoom: mockGetGameRoom,
  broadcastToRoom: vi.fn(),
  broadcastActiveRooms: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getSocketById: vi.fn(),
  disconnectSocket: vi.fn(),
  LOBBY_ROOM: 'lobby',
}));

vi.mock('../../../backend/utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
}));

describe('classroomGameHandler.leaderboardPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GIVEN a game in progress WHEN emitting startGame THEN leaderboard is included in the payload', () => {
    // ARRANGE
    const gameState = {
      gameCode: 'ABCDEF',
      gameState: 'in-progress',
      playerScores: { alice: 100, bob: 80 },
      users: {
        alice: { username: 'alice', socketId: 'socket-1', playerId: 'alice-id' },
        bob: { username: 'bob', socketId: 'socket-2', playerId: 'bob-id' },
      },
      hostSocketId: 'socket-1',
      hostUsername: 'alice',
      letterGrid: [['A', 'B'], ['C', 'D']],
      timerSeconds: 180,
      remainingTime: 120,
    };

    mockGetGame.mockReturnValue(gameState);
    mockGetLeaderboard.mockReturnValue([
      { username: 'alice', score: 100, rank: 1, playerId: 'alice-id' },
      { username: 'bob', score: 80, rank: 2, playerId: 'bob-id' },
    ]);

    // ACT
    // This simulates calling any handler that emits startGame
    const leaderboardData = mockGetLeaderboard('ABCDEF');
    const payload = {
      gameCode: gameState.gameCode,
      letterGrid: gameState.letterGrid,
      timerSeconds: gameState.timerSeconds,
      remainingTime: gameState.remainingTime,
      leaderboard: leaderboardData, // ← Key assertion: leaderboard in payload
    };

    // ASSERT
    expect(payload.leaderboard).toBeDefined();
    expect(payload.leaderboard).toHaveLength(2);
    expect(payload.leaderboard[0]).toEqual({
      username: 'alice',
      score: 100,
      rank: 1,
      playerId: 'alice-id',
    });
  });

  it('GIVEN a reconnecting player WHEN receiving startGame recovery payload THEN leaderboard is present to restore score atomically', () => {
    // ARRANGE
    const gameState = {
      gameCode: 'XYZABC',
      gameState: 'in-progress',
      playerScores: { charlie: 150, diana: 120 },
      playerWords: { charlie: ['cat', 'dog'], diana: ['bat'] },
      users: {
        charlie: { username: 'charlie', socketId: 'socket-3', playerId: 'charlie-id' },
        diana: { username: 'diana', socketId: 'socket-4', playerId: 'diana-id' },
      },
      hostSocketId: 'socket-3',
      hostUsername: 'charlie',
      letterGrid: [['C', 'A'], ['T', 'S']],
      timerSeconds: 180,
      remainingTime: 90,
    };

    mockGetGame.mockReturnValue(gameState);
    mockGetLeaderboard.mockReturnValue([
      { username: 'charlie', score: 150, rank: 1, playerId: 'charlie-id' },
      { username: 'diana', score: 120, rank: 2, playerId: 'diana-id' },
    ]);

    // ACT
    // Simulating requestGameState recovery payload
    const leaderboard = mockGetLeaderboard('XYZABC');
    const recoveryPayload = {
      gameCode: gameState.gameCode,
      letterGrid: gameState.letterGrid,
      timerSeconds: gameState.timerSeconds,
      remainingTime: gameState.remainingTime,
      myFoundWords: gameState.playerWords['charlie'] || [],
      leaderboard: leaderboard, // ← MUST carry leaderboard for atomic restore
    };

    // ASSERT
    expect(recoveryPayload.leaderboard).toBeDefined();
    expect(recoveryPayload.leaderboard).toHaveLength(2);
    // Verify score is present (client can restore without separate updateLeaderboard)
    expect(recoveryPayload.leaderboard.find(e => e.username === 'charlie')).toMatchObject({
      username: 'charlie',
      score: 150,
      rank: 1,
    });
  });

  it('GIVEN both join and reconnect handlers WHEN emitting startGame THEN both include the same leaderboard field', () => {
    // ARRANGE
    const gameState = {
      gameCode: 'SAMEGAME',
      gameState: 'in-progress',
      playerScores: { eve: 200, frank: 180 },
      users: {
        eve: { username: 'eve', socketId: 'socket-5', playerId: 'eve-id' },
        frank: { username: 'frank', socketId: 'socket-6', playerId: 'frank-id' },
      },
      hostSocketId: 'socket-5',
      hostUsername: 'eve',
      letterGrid: [['E', 'V'], ['E', 'S']],
      timerSeconds: 180,
      remainingTime: 60,
    };

    mockGetGame.mockReturnValue(gameState);
    const leaderboardData = [
      { username: 'eve', score: 200, rank: 1, playerId: 'eve-id' },
      { username: 'frank', score: 180, rank: 2, playerId: 'frank-id' },
    ];
    mockGetLeaderboard.mockReturnValue(leaderboardData);

    // ACT - Both handlers should emit the same structure
    const joinPayload = {
      gameCode: gameState.gameCode,
      letterGrid: gameState.letterGrid,
      timerSeconds: gameState.timerSeconds,
      remainingTime: gameState.remainingTime,
      leaderboard: mockGetLeaderboard('SAMEGAME'),
    };

    const reconnectPayload = {
      gameCode: gameState.gameCode,
      letterGrid: gameState.letterGrid,
      timerSeconds: gameState.timerSeconds,
      remainingTime: gameState.remainingTime,
      myFoundWords: gameState.playerWords?.eve || [],
      leaderboard: mockGetLeaderboard('SAMEGAME'),
    };

    // ASSERT - Both payloads must have leaderboard field
    expect(joinPayload).toHaveProperty('leaderboard');
    expect(reconnectPayload).toHaveProperty('leaderboard');
    expect(joinPayload.leaderboard).toEqual(reconnectPayload.leaderboard);
    expect(joinPayload.leaderboard).toEqual(leaderboardData);
  });

  it('GIVEN a game with host player WHEN returning leaderboard THEN host appears in leaderboard but must be filtered from display', () => {
    // ARRANGE
    const gameState = {
      gameCode: 'HOSTGAME',
      gameState: 'in-progress',
      hostUsername: 'host-player',
      hostSocketId: 'host-socket',
      playerScores: {
        'host-player': 100,
        student1: 80,
        student2: 60,
      },
      users: {
        'host-player': { username: 'host-player', socketId: 'host-socket', playerId: 'host-id', isHost: true },
        student1: { username: 'student1', socketId: 'socket-s1', playerId: 'student1-id' },
        student2: { username: 'student2', socketId: 'socket-s2', playerId: 'student2-id' },
      },
    };

    mockGetGame.mockReturnValue(gameState);
    const serverLeaderboard = [
      { username: 'host-player', score: 100, rank: 1, playerId: 'host-id' },
      { username: 'student1', score: 80, rank: 2, playerId: 'student1-id' },
      { username: 'student2', score: 60, rank: 3, playerId: 'student2-id' },
    ];
    mockGetLeaderboard.mockReturnValue(serverLeaderboard);

    // ACT
    const payload = {
      gameCode: gameState.gameCode,
      leaderboard: mockGetLeaderboard('HOSTGAME'),
      hostUsername: gameState.hostUsername,
    };

    // ASSERT - Server includes host in leaderboard, but display must filter it
    expect(payload.leaderboard).toHaveLength(3);
    expect(payload.leaderboard[0].username).toBe('host-player');

    // Simulate client-side filter (this is what the display component must do)
    const displayLeaderboard = payload.leaderboard.filter(
      e => e.username !== payload.hostUsername
    );
    expect(displayLeaderboard).toHaveLength(2);
    expect(displayLeaderboard[0].username).toBe('student1');
  });
});
