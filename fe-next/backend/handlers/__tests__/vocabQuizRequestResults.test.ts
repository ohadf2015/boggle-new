/**
 * `requestResults` while a vocab quiz owns the room (RED first).
 *
 * The board's orphan guard in `gameLifecycleHandler` reads a healthy quiz room
 * as an orphaned round — a quiz sets neither `gameStartedAt` nor a board timer
 * — and force-ends it through `endGame`. On 2026-09-05 that stole game
 * GHYRVS's once-per-game persistence slot 29 seconds before the quiz's own
 * `finishQuiz` ran.
 *
 * The guard now asks the quiz first. This file pins what the quiz answers:
 *
 *  - no quiz for the room  → declines, so board recovery is untouched
 *  - a live quiz           → re-sends that socket's own state snapshot
 *  - a stalled quiz        → finishes through the QUIZ path, never the board's
 *
 * The third case matters because "decline and do nothing" would trade the
 * board's wrong ending for a room that can never end at all — Class 4, a
 * silent no-op, swapped for a different silent no-op.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(() => 'ana'),
  transitionGameState: vi.fn(() => ({ success: true })),
}));
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: vi.fn().mockResolvedValue(null),
  updateClassroomGameStatus: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../classroomGamePersistence', () => ({
  persistClassroomGameScores: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../services/vocabQuizLessonWords', () => ({
  loadLessonVocabulary: vi.fn().mockResolvedValue({ words: [], language: 'en' }),
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../utils/timerManager', () => ({ clearGameTimer: vi.fn() }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { handleQuizRequestResults } from '../vocabQuizHandler';
import { setQuizSession, getQuizSession, clearAllQuizSessions } from '../../modules/vocabQuizStore';
import { createQuizSession, addQuizPlayer } from '../../services/vocabQuizEngine';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const GAME_CODE = 'GHYRVS';

const LESSON = [
  { word: 'abandon', definition: 'to leave behind for good', canIntegrate: true },
  { word: 'brittle', definition: 'hard but easily broken', canIntegrate: true },
  { word: 'candid', definition: 'honest and direct', canIntegrate: true },
  { word: 'dwindle', definition: 'to shrink little by little', canIntegrate: true },
  { word: 'endure', definition: 'to keep going through hardship', canIntegrate: true },
];

function startSession(now: number) {
  const session = createQuizSession({
    gameCode: GAME_CODE,
    classroomId: 'class-1',
    words: LESSON,
    focus: 'any',
    questionCount: 5,
    secondsPerQuestion: 20,
    seed: 'seed-1',
    now,
    language: 'en',
  });
  addQuizPlayer(session, { username: 'ana', userId: 'student-a' });
  session.questionStartedAt = now;
  setQuizSession(GAME_CODE, session);
  return session;
}

function makeSocket() {
  return { id: 'socket-ana', emit: vi.fn(), data: {} };
}

const fakeIo = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as never;

beforeEach(() => vi.clearAllMocks());
afterEach(() => clearAllQuizSessions());

describe('handleQuizRequestResults', () => {
  it('declines when the room has no quiz, leaving board recovery alone', () => {
    const socket = makeSocket();

    const handled = handleQuizRequestResults(fakeIo, socket as never, GAME_CODE);

    expect(handled).toBe(false);
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('answers a live quiz with that socket own state snapshot', () => {
    const now = Date.now();
    startSession(now);
    const socket = makeSocket();

    const handled = handleQuizRequestResults(fakeIo, socket as never, GAME_CODE);

    expect(handled).toBe(true);
    expect(socket.emit).toHaveBeenCalledWith(VOCAB_QUIZ_EVENTS.state, expect.anything());
  });

  it('leaves the live quiz running — it must not be ended by a client request', () => {
    startSession(Date.now());
    const socket = makeSocket();

    handleQuizRequestResults(fakeIo, socket as never, GAME_CODE);

    expect(getQuizSession(GAME_CODE)).toBeDefined();
  });

  it('does not touch a paused quiz, however long the teacher holds it', () => {
    const session = startSession(Date.now() - 10 * 60_000);
    session.paused = true;
    const socket = makeSocket();

    const handled = handleQuizRequestResults(fakeIo, socket as never, GAME_CODE);

    expect(handled).toBe(true);
    expect(getQuizSession(GAME_CODE)).toBeDefined();
  });

  it('finishes a stalled quiz through the quiz path rather than leaving the room stuck', async () => {
    // Question clock 20s; a start stamp 10 minutes back means the 250ms ticker
    // is gone (process restart, cleared interval) and nothing will ever end it.
    startSession(Date.now() - 10 * 60_000);
    const socket = makeSocket();

    const handled = handleQuizRequestResults(fakeIo, socket as never, GAME_CODE);
    await Promise.resolve();

    expect(handled).toBe(true);
    expect(getQuizSession(GAME_CODE)).toBeUndefined();
  });
});
