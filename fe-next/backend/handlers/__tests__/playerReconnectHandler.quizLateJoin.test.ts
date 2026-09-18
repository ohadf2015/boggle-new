/**
 * A student joins a classroom Vocab Quiz that is already running.
 *
 * The quiz takes over the room from `startGame` and broadcasts a SHELL start
 * payload — a placeholder grid and a 'classic' shell mode — because the player
 * shell only mounts its in-game view (where the quiz surface lives) once it has
 * a grid and a clock. The room itself never gets a grid: `game.letterGrid`
 * stays null for the whole quiz.
 *
 * `handleLateJoin` and `handleReconnection` built their own start payload from
 * the room (`game.letterGrid`, `game.gameMode`) — so a late joiner got a
 * `startGame` with NO grid, the shell never left the lobby, and the child sat
 * on READY UP while the class answered questions. One room, two start
 * payloads, only one of them quiz-shaped: recurring pitfall class 3.
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
import { setQuizSession, clearAllQuizSessions } from '../../modules/vocabQuizStore';
import { createQuizSession } from '../../services/vocabQuizEngine';
import { handleLateJoin, handleReconnection } from '../playerReconnectHandler';

const WORDS = ['river', 'mountain', 'forest', 'ocean', 'desert', 'valley'].map((word) => ({
  word, definition: `a ${word}`, translation: word,
}));

function startQuiz(gameCode = 'CLS1') {
  const session = createQuizSession({
    gameCode, classroomId: 'class-1', words: WORDS as any, focus: 'mixed' as any,
    questionCount: 4, secondsPerQuestion: 20, seed: 'seed', now: Date.now(),
    language: 'en', treasureChestsEnabled: false,
  } as any);
  setQuizSession(gameCode, session);
  return session;
}

function quizRoom(overrides: Record<string, any> = {}) {
  return {
    gameCode: 'CLS1', hostSocketId: 'socket-host', hostUsername: 'Teacher', language: 'en',
    timerSeconds: 120, gameState: 'in-progress', gameMode: 'blast', letterGrid: null,
    playerScores: {}, playerWords: {}, playerAchievements: {}, spectators: {}, gameSessionId: 1,
    isClassroom: true,
    users: {
      Teacher: { socketId: 'socket-host', isHost: true, disconnected: false },
      Ada: { socketId: 'socket-ada', isHost: false, disconnected: false, authUserId: 'u-ada' },
    },
    ...overrides,
  } as any;
}

const sock = (id: string) => ({ id, emit: vi.fn(), join: vi.fn(), leave: vi.fn(), data: {} } as any);
const startGamePayload = (socket: any) =>
  socket.emit.mock.calls.find((c: any[]) => c[0] === 'startGame')?.[1];

describe('late join / reconnect into a running Vocab Quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllQuizSessions();
    (getGameRoom as Mock).mockReturnValue('game:CLS1');
    (getGameUsers as Mock).mockReturnValue([]);
    (getLeaderboard as Mock).mockReturnValue([]);
    (isInProgress as Mock).mockReturnValue(true);
  });

  it('late joiner gets the quiz SHELL start payload — a grid to mount on and the shell mode', () => {
    const session = startQuiz();
    const socket = sock('socket-bo');

    handleLateJoin(socket, quizRoom(), 'CLS1', 'Bo');

    const payload = startGamePayload(socket);
    expect(payload.lateJoin).toBe(true);
    expect(Array.isArray(payload.letterGrid) && payload.letterGrid.length).toBeGreaterThan(0);
    expect(payload.gameMode).toBe('classic');
    expect(payload.timerSeconds).toBeGreaterThan(0);
    // Enrolled on arrival, so the projector standings show them straight away.
    expect(session.players.has('Bo')).toBe(true);
    // And handed the live question right behind the shell start — server push,
    // not a wait on the client's own requestState round-trip.
    const events = socket.emit.mock.calls.map((c: any[]) => c[0]);
    expect(events.indexOf('vocabQuiz:state')).toBeGreaterThan(events.indexOf('startGame'));
  });

  it('reconnect restores the same shell (field parity with the late-join path)', () => {
    startQuiz();
    const late = sock('s-late');
    const recon = sock('s-recon');

    handleLateJoin(late, quizRoom(), 'CLS1', 'Bo');
    handleReconnection({} as any, recon, quizRoom(), 'CLS1', 'Ada');

    const a = startGamePayload(late);
    const b = startGamePayload(recon);
    for (const field of ['letterGrid', 'gameMode', 'timerSeconds', 'remainingTime'] as const) {
      expect({ field, value: b[field] }).toEqual({ field, value: a[field] });
    }
  });

  it('never enrols the teacher (host) as a quiz competitor', () => {
    const session = startQuiz();
    handleReconnection({} as any, sock('s-t'), quizRoom(), 'CLS1', 'Teacher');
    expect(session.players.has('Teacher')).toBe(false);
  });

  it('leaves a BOARD room untouched — no quiz session, the room grid and mode ride as before', () => {
    const socket = sock('socket-bo');
    handleLateJoin(socket, quizRoom({ letterGrid: [['A', 'B'], ['C', 'D']], gameMode: 'blast' }), 'CLS1', 'Bo');
    const payload = startGamePayload(socket);
    expect(payload.letterGrid).toEqual([['A', 'B'], ['C', 'D']]);
    expect(payload.gameMode).toBe('blast');
  });
});
