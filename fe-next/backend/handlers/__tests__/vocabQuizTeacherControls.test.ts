/**
 * Live Vocab Quiz × the existing teacher control bar (RED first).
 *
 * The quiz reuses `pauseGame` / `resumeGame` / `extendTime` / `endRoundNow` /
 * `skipTargetWord` so the teacher's live controls work unchanged. Both
 * `teacherControlsHandler` and `vocabQuizHandler` listen on those events, and a
 * quiz room satisfies everything the board handler checks: the room really
 * exists, `gameState` is 'in-progress', `isClassroom` is true and the teacher
 * is the host. Nothing about a quiz room makes the board handler bail on its
 * own.
 *
 * Left alone, `endRoundNow` reaches the board's `endGame`, which runs
 * `calculateAndBroadcastFinalScores` → `persistClassroomGameScores` with EMPTY
 * board results. That call takes the once-per-game Redis idempotency key, so
 * the quiz's own persistence a moment later returns `[]` and every student's
 * words_attempted / words_mastered is silently lost. Class 3 (asymmetric paths
 * to the same state) producing a Class 4 (silent no-op) — both in
 * .claude/rules/60-recurring-pitfalls.md.
 *
 * So: while a quiz owns a room, the BOARD teacher controls must decline it.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  transitionGameState: vi.fn(() => ({ success: true })),
}));
vi.mock('../../services/gameLifecycle/gameTimer', () => ({
  pauseGameTimer: vi.fn(() => ({ remainingTime: 0 })),
  resumeGameTimer: vi.fn(() => ({ remainingTime: 0 })),
  extendGameTimer: vi.fn(() => ({ remainingTime: 0 })),
}));
vi.mock('../../services/gameLifecycle/gameEnd', () => ({
  endGame: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../wordHuntHandler', () => ({ skipWordHuntTarget: vi.fn().mockResolvedValue(true) }));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import * as gameStateManager from '../../modules/gameStateManager';
import * as gameTimer from '../../services/gameLifecycle/gameTimer';
import * as gameEnd from '../../services/gameLifecycle/gameEnd';
import { registerTeacherControlsHandlers } from '../teacherControlsHandler';
import { setQuizSession, clearAllQuizSessions } from '../../modules/vocabQuizStore';
import { createQuizSession } from '../../services/vocabQuizEngine';

const GAME_CODE = 'ABC123';

const LESSON = [
  { word: 'abandon', definition: 'to leave behind for good', canIntegrate: true },
  { word: 'brittle', definition: 'hard but easily broken', canIntegrate: true },
  { word: 'candid', definition: 'honest and direct', canIntegrate: true },
  { word: 'dwindle', definition: 'to shrink little by little', canIntegrate: true },
  { word: 'endure', definition: 'to keep going through hardship', canIntegrate: true },
];

function quizRoom() {
  return {
    gameCode: GAME_CODE,
    gameState: 'in-progress',
    isClassroom: true,
    hostSocketId: 'socket-teacher',
    users: { 'Ms K': { socketId: 'socket-teacher', isHost: true, authUserId: 'teacher-1' } },
  };
}

function makeSocket() {
  const listeners = new Map<string, (...args: unknown[]) => unknown>();
  const socket = {
    id: 'socket-teacher',
    on: vi.fn((event: string, fn: (...args: unknown[]) => unknown) => listeners.set(event, fn)),
    emit: vi.fn(),
    data: { verifiedUserId: 'teacher-1' },
  };
  return { socket: socket as never, listeners, emitted: socket.emit };
}

function startQuizOn(gameCode: string) {
  setQuizSession(
    gameCode,
    createQuizSession({
      gameCode,
      classroomId: 'class-1',
      words: LESSON,
      focus: 'definition',
      questionCount: 5,
      secondsPerQuestion: 20,
      seed: 'seed-1',
      now: Date.now(),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (gameStateManager.getGameBySocketId as never as ReturnType<typeof vi.fn>).mockReturnValue(GAME_CODE);
  (gameStateManager.getGame as never as ReturnType<typeof vi.fn>).mockReturnValue(quizRoom());
});

afterEach(() => clearAllQuizzes());

function clearAllQuizzes() {
  clearAllQuizSessions();
}

describe('board teacher controls on a room owned by a live vocab quiz', () => {
  beforeEach(() => startQuizOn(GAME_CODE));

  it('never runs the board end path — that would burn the classroom persistence guard on empty results', () => {
    const { socket, listeners } = makeSocket();
    registerTeacherControlsHandlers({} as never, socket);

    listeners.get('endRoundNow')!();
    expect(gameEnd.endGame).not.toHaveBeenCalled();
  });

  it('does not pause a board timer that a quiz room never started', () => {
    const { socket, listeners } = makeSocket();
    registerTeacherControlsHandlers({} as never, socket);

    listeners.get('pauseGame')!();
    expect(gameTimer.pauseGameTimer).not.toHaveBeenCalled();
  });

  it('does not resume a board timer, which would relaunch it with zero left and end the room', () => {
    const { socket, listeners } = makeSocket();
    registerTeacherControlsHandlers({} as never, socket);

    listeners.get('resumeGame')!();
    expect(gameTimer.resumeGameTimer).not.toHaveBeenCalled();
  });

  it('does not extend a board timer', () => {
    const { socket, listeners } = makeSocket();
    registerTeacherControlsHandlers({} as never, socket);

    listeners.get('extendTime')!({ seconds: 30 });
    expect(gameTimer.extendGameTimer).not.toHaveBeenCalled();
  });

  it('stays silent rather than emitting a rejection the teacher would see as a broken button', () => {
    const { socket, listeners, emitted } = makeSocket();
    registerTeacherControlsHandlers({} as never, socket);

    listeners.get('pauseGame')!();
    listeners.get('endRoundNow')!();
    expect(emitted.mock.calls.some((c) => c[0] === 'teacherControlRejected')).toBe(false);
  });
});

describe('board teacher controls on an ordinary classroom board room', () => {
  it('still works exactly as before when no quiz owns the room', () => {
    const { socket, listeners } = makeSocket();
    registerTeacherControlsHandlers({} as never, socket);

    listeners.get('pauseGame')!();
    expect(gameTimer.pauseGameTimer).toHaveBeenCalledWith(expect.anything(), GAME_CODE);

    listeners.get('endRoundNow')!();
    expect(gameEnd.endGame).toHaveBeenCalledWith(expect.anything(), GAME_CODE);
  });

  it('is unaffected by a quiz running in a DIFFERENT room', () => {
    startQuizOn('OTHER1');
    const { socket, listeners } = makeSocket();
    registerTeacherControlsHandlers({} as never, socket);

    listeners.get('pauseGame')!();
    expect(gameTimer.pauseGameTimer).toHaveBeenCalledWith(expect.anything(), GAME_CODE);
  });
});
