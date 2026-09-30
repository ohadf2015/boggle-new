/**
 * The pressure dials on the two recovery paths (pitfall class 3).
 *
 * The fresh `startGame` broadcast resolves the dials off the classroom record
 * and stashes them on the game state. A student who RE-connects or LATE-joins
 * gets a different payload built in this file — the two siblings that have
 * drifted before (leaderboard, teacher pause). If they omit `pressure`, the
 * reconnecting student's client falls back to the loud default mid-round and
 * the calm room starts shouting at exactly the student who needed it calm.
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

const CALM = { leaderboard: 'hidden', timer: 'off', speedScoring: false };

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

function makeSocket() {
  return { id: 'socket-new', emit: vi.fn(), join: vi.fn(), leave: vi.fn(), data: {} } as any;
}

function startGamePayload(socket: ReturnType<typeof makeSocket>) {
  return socket.emit.mock.calls.find((c: any[]) => c[0] === 'startGame')?.[1];
}

describe('pressure dials on recovery payloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getGameRoom as Mock).mockReturnValue('game:CLS1');
    (getGameUsers as Mock).mockReturnValue([]);
    (getLeaderboard as Mock).mockReturnValue([]);
    (isInProgress as Mock).mockReturnValue(true);
  });

  it('reconnect carries the stashed dials inside startGame', () => {
    const socket = makeSocket();

    handleReconnection({} as any, socket, makeGame({ classroomPressure: CALM }), 'CLS1', 'Ada');

    expect(startGamePayload(socket)).toEqual(expect.objectContaining({ pressure: CALM }));
  });

  it('late join carries the stashed dials inside startGame', () => {
    const socket = makeSocket();

    handleLateJoin(socket, makeGame({ classroomPressure: CALM }), 'CLS1', 'Ada');

    expect(startGamePayload(socket)).toEqual(expect.objectContaining({ pressure: CALM }));
  });

  it('a non-classroom room carries no pressure field at all', () => {
    // Presence is the signal ("this is a classroom room — render the dials").
    // Emitting the defaults on a quick-play room would make every casual
    // client think a teacher set them.
    const socket = makeSocket();

    handleLateJoin(socket, makeGame(), 'CLS1', 'Ada');

    expect(startGamePayload(socket)).not.toHaveProperty('pressure');
  });
});
