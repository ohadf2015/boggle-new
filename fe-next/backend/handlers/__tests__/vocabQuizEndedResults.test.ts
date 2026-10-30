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
});
