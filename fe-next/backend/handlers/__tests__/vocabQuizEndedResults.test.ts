import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const room: Record<string, unknown> = {};

vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(() => room),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(() => 'ana'),
  transitionGameState: vi.fn(() => ({ success: true })),
}));
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: vi.fn().mockResolvedValue(null),
  updateClassroomGameStatus: vi.fn().mockResolvedValue(undefined),
  saveClassroomSessionScores: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../classroomGamePersistence', () => ({
  persistClassroomGameScores: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../utils/timerManager', () => ({ clearGameTimer: vi.fn() }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { finishQuiz } from '../../services/vocabQuizRound';
import { setQuizSession, clearAllQuizSessions } from '../../modules/vocabQuizStore';
import { createQuizSession, addQuizPlayer } from '../../services/vocabQuizEngine';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';
import { getClassroomGame } from '../../modules/classroomGameManager';
import { resendFinishedResults } from '../finishedResultsResend';

const LESSON = ['abandon', 'brittle', 'candid', 'dwindle', 'endure'].map((word) => ({
  word, definition: `meaning of ${word}`, canIntegrate: true,
}));

function startSession() {
  const session = createQuizSession({
    gameCode: 'QUIZ01', classroomId: 'class-1', words: LESSON, focus: 'any',
    questionCount: 5, secondsPerQuestion: 20, seed: 'seed-1', now: Date.now(), language: 'en',
  });
  addQuizPlayer(session, { username: 'ana', userId: 'student-a' });
  setQuizSession('QUIZ01', session);
}

const emit = vi.fn();
const fakeIo = { to: vi.fn(() => ({ emit })) } as never;

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(room)) delete room[key];
});
afterEach(() => clearAllQuizSessions());

describe('finishQuiz', () => {
  it('keeps the ended payload on the room so a late or reconnecting socket can still see it', async () => {
    startSession();

    await finishQuiz(fakeIo, 'QUIZ01');

    const broadcast = emit.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.ended)?.[1];
    expect(broadcast).toBeDefined();
    expect(room.cachedResultsPayload).toEqual({ vocabQuizEnded: broadcast });
  });

  it('ends a classroom quiz on the shared results payload, recap first, finale after', async () => {
    startSession();
    vi.mocked(getClassroomGame).mockResolvedValueOnce({
      gameCode: 'QUIZ01', classroomId: 'class-1', teacherId: 't', teacherName: 'Ms Lee', lessonIds: ['l'],
      lessonNames: ['Unit'], vocabularyWords: LESSON.map((w) => w.word), settings: {}, players: [],
      createdAt: '', status: 'playing',
    } as never);

    await finishQuiz(fakeIo, 'QUIZ01');

    const order = emit.mock.calls.map((c) => c[0]);
    expect(order.indexOf('validatedScores')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('validationComplete')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('validatedScores')).toBeLessThan(order.indexOf(VOCAB_QUIZ_EVENTS.ended));
    const results = emit.mock.calls.find((c) => c[0] === 'validatedScores')?.[1];
    expect(results.classroomSummary.podium.map((p: { username: string }) => p.username)).toEqual(['ana']);
    expect(results.gameMode).toBe('vocab-quiz');
    expect((room.cachedResultsPayload as Record<string, unknown>).classroomSummary).toBeDefined();

    const socketEmit = vi.fn();
    resendFinishedResults({ emit: socketEmit, connected: true } as never, 'QUIZ01', room as never);
    expect(socketEmit.mock.calls.map((c) => c[0])).toEqual(['validatedScores', 'validationComplete', VOCAB_QUIZ_EVENTS.ended]);
  });
});
