/**
 * @jest-environment node
 */
import { vi, type Mock } from 'vitest';
import type { GameState } from '../../modules/gameState/types';
import { handleResume } from '../resumeHandler';
import { getGame } from '../../modules/gameStateManager';

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../modules/gameStateManager');

const mockGetGame = getGame as Mock;

function createMockSocket(id = 'socket-player') {
  return { id, emit: vi.fn(), data: {} } as any;
}

function makeGame(overrides: Record<string, unknown> = {}): GameState {
  return {
    gameCode: 'RESUME1',
    hostSocketId: 'socket-host',
    hostUsername: 'Host',
    roomName: 'Test Room',
    language: 'en',
    timerSeconds: 120,
    remainingTime: 75,
    gameState: 'in-progress',
    gameMode: 'classic',
    letterGrid: null,
    playerScores: { Player1: 40 },
    playerWords: { Player1: ['CAT', 'DOG'] },
    playerWordDetails: {},
    playerAchievements: {},
    playerCombos: {},
    spectators: {},
    tournamentId: null,
    reconnectionTimeout: null,
    isRanked: false,
    isPrivate: false,
    isClassroom: false,
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
      Player1: { socketId: 'socket-old', isHost: false, disconnected: true, authUserId: 'uuid-p1', guestTokenHash: null } as any,
    },
    serverSeq: 5,
    ...overrides,
  } as unknown as GameState;
}

describe('handleResume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits resume:ack with serverSeq and timeRemaining for valid in-progress player', () => {
    const game = makeGame();
    mockGetGame.mockReturnValue(game);
    const socket = createMockSocket();

    handleResume(socket, { gameCode: 'RESUME1', username: 'Player1', lastServerSeq: 3 });

    expect(socket.emit).toHaveBeenCalledWith(
      'resume:ack',
      expect.objectContaining({
        serverSeq: 5,
        timeRemaining: 75,
      }),
    );
  });

  it('ack payload includes the current game state snapshot', () => {
    const game = makeGame();
    mockGetGame.mockReturnValue(game);
    const socket = createMockSocket();

    handleResume(socket, { gameCode: 'RESUME1', username: 'Player1', lastServerSeq: 0 });

    const [event, payload] = (socket.emit as Mock).mock.calls[0];
    expect(event).toBe('resume:ack');
    expect(payload.state).toBeDefined();
    expect(payload.state.playerScores).toEqual({ Player1: 40 });
  });

  it('emits resume:reject with reason=game_over when game is finished', () => {
    const game = makeGame({ gameState: 'finished' });
    mockGetGame.mockReturnValue(game);
    const socket = createMockSocket();

    handleResume(socket, { gameCode: 'RESUME1', username: 'Player1', lastServerSeq: 0 });

    expect(socket.emit).toHaveBeenCalledWith('resume:reject', { reason: 'game_over' });
  });

  it('emits resume:reject with reason=game_over when game is waiting (not started)', () => {
    const game = makeGame({ gameState: 'waiting' });
    mockGetGame.mockReturnValue(game);
    const socket = createMockSocket();

    handleResume(socket, { gameCode: 'RESUME1', username: 'Player1', lastServerSeq: 0 });

    expect(socket.emit).toHaveBeenCalledWith('resume:reject', { reason: 'game_over' });
  });

  it('emits resume:reject with reason=expired when game not found', () => {
    mockGetGame.mockReturnValue(null);
    const socket = createMockSocket();

    handleResume(socket, { gameCode: 'NOTFOUND', username: 'Player1', lastServerSeq: 0 });

    expect(socket.emit).toHaveBeenCalledWith('resume:reject', { reason: 'expired' });
  });

  it('emits resume:reject with reason=kicked when player not in game', () => {
    const game = makeGame();
    mockGetGame.mockReturnValue(game);
    const socket = createMockSocket();

    handleResume(socket, { gameCode: 'RESUME1', username: 'GhostPlayer', lastServerSeq: 0 });

    expect(socket.emit).toHaveBeenCalledWith('resume:reject', { reason: 'kicked' });
  });

  it('serverSeq defaults to 0 when not set on game', () => {
    const game = makeGame({ serverSeq: undefined });
    mockGetGame.mockReturnValue(game);
    const socket = createMockSocket();

    handleResume(socket, { gameCode: 'RESUME1', username: 'Player1', lastServerSeq: 0 });

    const [, payload] = (socket.emit as Mock).mock.calls[0];
    expect(payload.serverSeq).toBe(0);
  });
});
