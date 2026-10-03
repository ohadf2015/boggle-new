import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: vi.fn(),
  updateClassroomGameStatus: vi.fn().mockResolvedValue(undefined),
  reopenClassroomGameForRound: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  transitionGameState: vi.fn(() => ({ success: true })),
}));
vi.mock('../../services/vocabQuizLessonWords', () => ({
  loadLessonVocabulary: vi.fn(),
  loadLessonVocabularyWords: vi.fn(),
}));
vi.mock('../classroomGamePersistence', () => ({
  persistClassroomGameScores: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../utils/timerManager', () => ({ clearGameTimer: vi.fn() }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import * as classroomGameManager from '../../modules/classroomGameManager';
import * as gameStateManager from '../../modules/gameStateManager';
import * as lessonWords from '../../services/vocabQuizLessonWords';
import * as persistence from '../classroomGamePersistence';
import logger from '../../utils/logger';
import {
  startVocabQuizForClassroom,
  registerVocabQuizHandlers,
  getActiveQuiz,
  stopAllQuizzesForTest,
} from '../vocabQuizHandler';
import { VOCAB_QUIZ_EVENTS, VOCAB_QUIZ_FIRST_QUESTION_LEAD_MS } from '@/shared/types/vocabQuiz';
import { COUNT_STEP_MS, GO_HOLD_MS } from '@/components/multiplayer/round/MpCountdownStage';

const word = (over: Partial<VocabularyWord> & { word: string }): VocabularyWord => ({
  canIntegrate: true,
  ...over,
});

const LESSON: VocabularyWord[] = [
  word({ word: 'abandon', definition: 'to leave behind for good' }),
  word({ word: 'brittle', definition: 'hard but easily broken' }),
  word({ word: 'candid', definition: 'honest and direct' }),
  word({ word: 'dwindle', definition: 'to shrink little by little' }),
  word({ word: 'endure', definition: 'to keep going through hardship' }),
];

const GAME_CODE = 'ABC123';

function makeIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to } as never, to, emit };
}

function makeSocket(id = 'socket-ana') {
  const listeners = new Map<string, (...args: unknown[]) => unknown>();
  const socket = {
    id,
    on: vi.fn((event: string, fn: (...args: unknown[]) => unknown) => listeners.set(event, fn)),
    emit: vi.fn(),
    data: { verifiedUserId: 'user-ana' },
  };
  return { socket: socket as never, listeners, emitted: socket.emit };
}

function classroomGame(gameMode: string, settings: Record<string, unknown> = {}) {
  return {
    gameCode: GAME_CODE,
    classroomId: 'class-1',
    teacherId: 'teacher-1',
    teacherName: 'Ms K',
    lessonIds: ['lesson-1'],
    lessonNames: ['Unit 3'],
    vocabularyWords: LESSON.map((w) => w.word),
    players: [
      { userId: 'user-ana', username: 'ana', socketId: 'socket-ana' },
      { userId: 'user-bo', username: 'bo', socketId: 'socket-bo' },
    ],
    settings: { gameMode, ...settings },
    createdAt: new Date().toISOString(),
    status: 'playing' as const,
  };
}

function roomState() {
  return {
    gameCode: GAME_CODE,
    isClassroom: true,
    hostSocketId: 'socket-teacher',
    users: {
      ana: { socketId: 'socket-ana', authUserId: 'user-ana', isHost: false, isBot: false },
      bo: { socketId: 'socket-bo', authUserId: 'user-bo', isHost: false, isBot: false },
      'Bot Max': { socketId: 'bot-1', authUserId: null, isHost: false, isBot: true },
      'Ms K': { socketId: 'socket-teacher', authUserId: 'teacher-1', isHost: true, isBot: false },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  (lessonWords.loadLessonVocabulary as Mock).mockResolvedValue({ words: LESSON, language: 'en' });
  (gameStateManager.getGame as Mock).mockReturnValue(roomState());
  (gameStateManager.transitionGameState as Mock).mockReturnValue({ success: true });
});

afterEach(() => {
  stopAllQuizzesForTest();
  vi.useRealTimers();
});


// Question 1 used to start under the 3-2-1-GO overlay, so every student lost
// the countdown's seconds off a question they could not yet see.
describe('first question waits out the countdown', () => {
  beforeEach(() => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(
      classroomGame('vocab-quiz', { vocabQuizQuestionCount: 4, vocabQuizSeconds: 10 })
    );
  });

  it('matches the lead to the client countdown', () => {
    expect(VOCAB_QUIZ_FIRST_QUESTION_LEAD_MS).toBe(3 * COUNT_STEP_MS + GO_HOLD_MS);
  });

  it('gives question 1 its full clock plus the countdown', async () => {
    const { io, emit } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    const question = emit.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.question)![1] as {
      remainingMs: number; limitMs: number;
    };
    expect(question.limitMs).toBe(10_000);
    expect(question.remainingMs).toBe(10_000 + VOCAB_QUIZ_FIRST_QUESTION_LEAD_MS);
  });

  it('does not reveal question 1 until its full clock has run after the countdown', async () => {
    const { io, emit } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    await vi.advanceTimersByTimeAsync(10_100);
    expect(emit.mock.calls.some((c) => c[0] === VOCAB_QUIZ_EVENTS.reveal)).toBe(false);
    await vi.advanceTimersByTimeAsync(VOCAB_QUIZ_FIRST_QUESTION_LEAD_MS);
    expect(emit.mock.calls.some((c) => c[0] === VOCAB_QUIZ_EVENTS.reveal)).toBe(true);
  });

  it('starts question 2 straight after the reveal, with no second lead', async () => {
    const { io, emit } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    await vi.advanceTimersByTimeAsync(10_100 + VOCAB_QUIZ_FIRST_QUESTION_LEAD_MS + 3_100);
    const questions = emit.mock.calls.filter((c) => c[0] === VOCAB_QUIZ_EVENTS.question);
    const second = questions[questions.length - 1][1] as { index: number; remainingMs: number };
    expect(second.index).toBe(1);
    expect(second.remainingMs).toBeLessThanOrEqual(10_000);
  });
});
