/** Boss Battle — the class-vs-boss variant of the live quiz, end to end through the socket handler. */
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
import {
  startVocabQuizForClassroom,
  registerVocabQuizHandlers,
  getActiveQuiz,
  stopAllQuizzesForTest,
} from '../vocabQuizHandler';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

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


type BossPayload = { hp: number; maxHp: number; lastHits: number; defeated: boolean };

function answerAs(io: never, username: string, choiceIndex: number) {
  const { socket, listeners } = makeSocket(`socket-${username}`);
  (gameStateManager.getGameBySocketId as Mock).mockReturnValue(GAME_CODE);
  (gameStateManager.getUsernameBySocketId as Mock).mockReturnValue(username);
  registerVocabQuizHandlers(io, socket);
  const session = getActiveQuiz(GAME_CODE)!;
  listeners.get(VOCAB_QUIZ_EVENTS.answer)!({ index: session.index, choiceIndex });
}

const BOSS = { vocabQuizVariant: 'boss', vocabQuizQuestionCount: 10, vocabQuizSeconds: 10, treasureChestsEnabled: false };

describe('Boss Battle', () => {
  it('puts the boss at full health on the very first question', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('vocab-quiz', BOSS));
    const { io, emit } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    const question = emit.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.question)![1] as { boss?: BossPayload };
    // five lesson words cap the round at 5 questions: 5 x 2 students x 0.6
    expect(question.boss).toEqual({ maxHp: 6, hp: 6, lastHits: 0, defeated: false });
  });

  it('turns treasure chests off: steals and swaps have no place in a class-vs-boss round', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(
      classroomGame('vocab-quiz', { ...BOSS, treasureChestsEnabled: true })
    );
    await startVocabQuizForClassroom(makeIo().io, GAME_CODE);
    expect(getActiveQuiz(GAME_CODE)!.treasureChestsEnabled).toBe(false);
  });

  it('leaves a plain quiz without a boss', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('vocab-quiz'));
    const { io, emit } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    const question = emit.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.question)![1] as { boss?: BossPayload };
    expect(question.boss).toBeUndefined();
  });

  it('shows the class hits on the reveal and in a refreshed snapshot', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('vocab-quiz', BOSS));
    const { io, emit } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    const q = getActiveQuiz(GAME_CODE)!.questions[0];
    answerAs(io, 'ana', q.answerIndex);
    answerAs(io, 'bo', q.answerIndex);
    await vi.advanceTimersByTimeAsync(300);

    const reveal = emit.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.reveal)![1] as { boss?: BossPayload };
    expect(reveal.boss).toMatchObject({ hp: 4, lastHits: 2, defeated: false });

    const { socket, listeners, emitted } = makeSocket('socket-ana');
    (gameStateManager.getUsernameBySocketId as Mock).mockReturnValue('ana');
    registerVocabQuizHandlers(io, socket);
    listeners.get(VOCAB_QUIZ_EVENTS.requestState)!();
    const snap = emitted.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.state)![1] as { boss?: BossPayload };
    expect(snap.boss).toMatchObject({ hp: 4, maxHp: 6 });
  });

  it('tells the student privately how hard their answer hit', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('vocab-quiz', BOSS));
    const { io } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    const q = getActiveQuiz(GAME_CODE)!.questions[0];
    const { socket, listeners, emitted } = makeSocket('socket-ana');
    (gameStateManager.getGameBySocketId as Mock).mockReturnValue(GAME_CODE);
    (gameStateManager.getUsernameBySocketId as Mock).mockReturnValue('ana');
    registerVocabQuizHandlers(io, socket);
    listeners.get(VOCAB_QUIZ_EVENTS.answer)!({ index: 0, choiceIndex: q.answerIndex });
    const result = emitted.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.answerResult)![1] as { bossHit?: number };
    expect(result.bossHit).toBe(1);
  });

  it('ends the round the moment the boss falls, and says so in the finale', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(
      classroomGame('vocab-quiz', { ...BOSS, vocabQuizQuestionCount: 4 })
    );
    const { io, emit } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    // maxHp 5: 2 + 2 hits, then the class streak of three crits for 4.
    for (let round = 0; round < 3; round++) {
      const s = getActiveQuiz(GAME_CODE)!;
      const q = s.questions[s.index];
      answerAs(io, 'ana', q.answerIndex);
      answerAs(io, 'bo', q.answerIndex);
      await vi.advanceTimersByTimeAsync(3_400);
    }
    await vi.advanceTimersByTimeAsync(1_000);
    const ended = emit.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.ended);
    expect(ended).toBeDefined();
    expect((ended![1] as { boss?: BossPayload }).boss).toMatchObject({ hp: 0, defeated: true });
    expect(emit.mock.calls.filter((c) => c[0] === VOCAB_QUIZ_EVENTS.question)).toHaveLength(3);
    // The round is three questions long now: the finale and the report count only what was asked.
    expect((ended![1] as { totalQuestions: number }).totalQuestions).toBe(3);
    const reveals = emit.mock.calls.filter((c) => c[0] === VOCAB_QUIZ_EVENTS.reveal).map((c) => c[1] as { isLast: boolean; nextHint?: unknown; total: number });
    expect(reveals[2]).toMatchObject({ isLast: true, total: 3 });
    expect(reveals[2].nextHint).toBeUndefined();
    await vi.waitFor(() => expect(persistence.persistClassroomGameScores).toHaveBeenCalled());
    const [, , opts] = (persistence.persistClassroomGameScores as Mock).mock.calls[0];
    expect(opts.askedWords).toHaveLength(3);
  });
});
