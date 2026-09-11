/**
 * Late join vs reconnect — the same round, restored two ways (pitfall class 3).
 *
 * `handleReconnection` deliberately carries `leaderboard` INSIDE its `startGame`
 * payload, with a comment saying why: so the client restores the score in the
 * same batched setState as the board, robust if the separate `updateLeaderboard`
 * that follows is dropped, raced, or reset away. That comment is the scar left
 * by the reconnect bug that froze scores at 0.
 *
 * `handleLateJoin` restores the SAME round for the SAME reason and did not
 * carry it — it relied entirely on the separate `updateLeaderboard`, the exact
 * arrangement the reconnect path was fixed away from. The path that pays is the
 * classroom one: a student who taps the projector code after the teacher has
 * started is a LATE JOINER, not a reconnect, so the whole class's running
 * scoreboard rode on the fragile emit for precisely the common case.
 *
 * Field-for-field parity on the state payload, not just the `joined` envelope.
 */
import { vi, type Mock } from 'vitest';

vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/socketHelpers');
vi.mock('../../utils/timerManager', () => ({
  default: { clearTimer: vi.fn(), setTimeout: vi.fn(), hasTimer: vi.fn(() => false) },
  clearGameTimer: vi.fn(), hasGameTimer: vi.fn(() => false),
}));
vi.mock('../../utils/gameStateMachine');
vi.mock('../../modules/achievementManager', () => ({ ACHIEVEMENT_ICONS: {} }));
vi.mock('../../modules/tournamentManager', () => ({ getTournament: vi.fn(), isTournamentGame: vi.fn(() => false) }));
vi.mock('../../modules/botManager', () => ({ isBot: vi.fn(() => false), getGameBots: vi.fn(() => []) }));

import { getGameUsers, getLeaderboard } from '../../modules/gameStateManager';
import { getGameRoom } from '../../utils/socketHelpers';
import { isInProgress } from '../../utils/gameStateMachine';
import { handleLateJoin, handleReconnection } from '../playerReconnectHandler';

const BOARD = [
  { username: 'Host', score: 40 },
  { username: 'Ada', score: 0 },
];

function makeGame(overrides: Record<string, any> = {}) {
  return {
    gameCode: 'CLS1', hostSocketId: 'socket-host', language: 'en', timerSeconds: 120,
    gameState: 'in-progress', gameMode: 'classic', letterGrid: [['A']], playerScores: {},
    playerWords: {}, playerAchievements: {}, spectators: {}, gameSessionId: 1, isClassroom: true,
    users: {
      Host: { socketId: 'socket-host', isHost: true, disconnected: false },
      Ada: { socketId: 'socket-old', isHost: false, disconnected: true },
    },
    ...overrides,
  } as any;
}

const startGamePayload = (socket: any) =>
  socket.emit.mock.calls.find((c: any[]) => c[0] === 'startGame')?.[1];

describe('handleLateJoin — leaderboard parity with the reconnect path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getGameRoom as Mock).mockReturnValue('game:CLS1');
    (getGameUsers as Mock).mockReturnValue([]);
    (getLeaderboard as Mock).mockReturnValue(BOARD);
    (isInProgress as Mock).mockReturnValue(true);
  });

  it('carries the authoritative leaderboard inside startGame, as the reconnect path does', () => {
    const socket = { id: 'socket-new', emit: vi.fn(), join: vi.fn(), leave: vi.fn(), data: {} } as any;

    handleLateJoin(socket, makeGame(), 'CLS1', 'Ada');

    expect(startGamePayload(socket)).toEqual(expect.objectContaining({ leaderboard: BOARD }));
  });

  it('still sends the separate updateLeaderboard — the in-payload copy is a belt, not a replacement', () => {
    const socket = { id: 'socket-new', emit: vi.fn(), join: vi.fn(), leave: vi.fn(), data: {} } as any;

    handleLateJoin(socket, makeGame(), 'CLS1', 'Ada');

    const board = socket.emit.mock.calls.find((c: any[]) => c[0] === 'updateLeaderboard');
    expect(board?.[1]).toEqual({ leaderboard: BOARD });
  });

  it('agrees with the reconnect payload on every shared restore field', () => {
    const lateSocket = { id: 's-late', emit: vi.fn(), join: vi.fn(), leave: vi.fn(), data: {} } as any;
    const reconnectSocket = { id: 's-recon', emit: vi.fn(), join: vi.fn(), leave: vi.fn(), data: {} } as any;

    handleLateJoin(lateSocket, makeGame({ remainingTime: 44, isPaused: true }), 'CLS1', 'Ada');
    handleReconnection({} as any, reconnectSocket, makeGame({ remainingTime: 44, isPaused: true }), 'CLS1', 'Ada');

    const late = startGamePayload(lateSocket);
    const recon = startGamePayload(reconnectSocket);
    const shared = ['letterGrid', 'timerSeconds', 'language', 'minWordLength', 'boardTheme',
      'gameMode', 'gameSessionId', 'isPaused', 'remainingTime', 'leaderboard'] as const;

    for (const field of shared) {
      expect({ field, value: late[field] }).toEqual({ field, value: recon[field] });
    }
  });
});
