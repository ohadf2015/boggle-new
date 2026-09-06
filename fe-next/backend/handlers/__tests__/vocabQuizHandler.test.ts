/**
 * Live Vocab Quiz — socket handler (RED first).
 *
 * Covers the seams the engine's unit tests cannot: does the board game get
 * short-circuited, do students actually receive a question, does a refresh
 * restore state, and — the one that decides whether the teacher's report has
 * any data in it — does the end path hand `persistClassroomGameScores` the
 * lesson words each student answered correctly.
 */
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: vi.fn(),
  updateClassroomGameStatus: vi.fn().mockResolvedValue(undefined),
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

describe('startVocabQuizForClassroom', () => {
  it('declines a room that is not a vocab quiz, so the board game starts normally', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('classic'));
    const { io } = makeIo();
    expect(await startVocabQuizForClassroom(io, GAME_CODE)).toBe(false);
    expect(getActiveQuiz(GAME_CODE)).toBeUndefined();
  });

  it('declines a room with no classroom game at all', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(null);
    const { io } = makeIo();
    expect(await startVocabQuizForClassroom(io, GAME_CODE)).toBe(false);
  });

  it('claims a vocab-quiz room and broadcasts the first question', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('vocab-quiz'));
    const { io, emit } = makeIo();

    expect(await startVocabQuizForClassroom(io, GAME_CODE)).toBe(true);
    const question = emit.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.question);
    expect(question).toBeDefined();
    expect(question![1]).toMatchObject({ index: 0, gameCode: GAME_CODE });
    expect((question![1] as { choices: string[] }).choices).toHaveLength(4);
  });

  it('moves the class out of the lobby, or the round runs with nobody watching', async () => {
    // The host and player shells mount their in-game view only after the normal
    // start sequence lands (the host gate is literally "is there a tableData").
    // Emitting quiz events alone would leave the whole class in the lobby.
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('vocab-quiz'));
    const { io, emit } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);

    const events = emit.mock.calls.map((c) => c[0]);
    expect(events).toContain('gameStarting');
    expect(events).toContain('startGame');

    const start = emit.mock.calls.find((c) => c[0] === 'startGame')![1] as {
      letterGrid: string[][]; gameMode: string;
    };
    // The shells need a grid to mount; the quiz never draws it.
    expect(start.letterGrid.length).toBeGreaterThan(0);
    expect(start.gameMode).toBeTruthy();

    // ...and the start sequence must precede the first question, so a client
    // that mounts on `startGame` is listening before the question arrives.
    expect(events.indexOf('startGame')).toBeLessThan(events.indexOf(VOCAB_QUIZ_EVENTS.question));
  });

  it('enrolls the human players from the room and leaves bots out', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('vocab-quiz'));
    const { io } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);

    const session = getActiveQuiz(GAME_CODE)!;
    expect([...session.players.keys()].sort()).toEqual(['ana', 'bo']);
    expect(session.players.get('ana')?.userId).toBe('user-ana');
  });

  it('honours the teacher question count and per-question seconds', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(
      classroomGame('vocab-quiz', { vocabQuizQuestionCount: 4, vocabQuizSeconds: 10 })
    );
    const { io } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);

    const session = getActiveQuiz(GAME_CODE)!;
    expect(session.questions).toHaveLength(4);
    expect(session.limitMs).toBe(10_000);
  });

  it('refuses to start — loudly, not silently — when the lesson has nothing playable', async () => {
    (lessonWords.loadLessonVocabulary as Mock).mockResolvedValue({ words: [word({ word: 'orphan' })], language: 'en' });
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('vocab-quiz'));
    const { io, emit } = makeIo();

    expect(await startVocabQuizForClassroom(io, GAME_CODE)).toBe(false);
    expect(emit.mock.calls.some((c) => c[0] === 'classroomGameError')).toBe(true);
    expect(getActiveQuiz(GAME_CODE)).toBeUndefined();
  });
});

describe('answering', () => {
  beforeEach(async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('vocab-quiz'));
    await startVocabQuizForClassroom(makeIo().io, GAME_CODE);
    (gameStateManager.getGameBySocketId as Mock).mockReturnValue(GAME_CODE);
    (gameStateManager.getUsernameBySocketId as Mock).mockReturnValue('ana');
  });

  it('scores an answer and replies privately to that student only', () => {
    const { socket, listeners, emitted } = makeSocket();
    const { io } = makeIo();
    registerVocabQuizHandlers(io, socket);

    const session = getActiveQuiz(GAME_CODE)!;
    listeners.get(VOCAB_QUIZ_EVENTS.answer)!({
      index: 0,
      choiceIndex: session.questions[0].answerIndex,
    });

    const result = emitted.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.answerResult);
    expect(result).toBeDefined();
    expect(result![1]).toMatchObject({ correct: true });
    expect(session.players.get('ana')!.score).toBeGreaterThan(0);
  });

  it('ignores a malformed payload rather than throwing', () => {
    const { socket, listeners } = makeSocket();
    registerVocabQuizHandlers(makeIo().io, socket);
    const answer = listeners.get(VOCAB_QUIZ_EVENTS.answer)!;

    expect(() => answer(null)).not.toThrow();
    expect(() => answer({ index: 'x', choiceIndex: {} })).not.toThrow();
    expect(() => answer({ index: 0, choiceIndex: 99 })).not.toThrow();
    expect(getActiveQuiz(GAME_CODE)!.players.get('ana')!.score).toBe(0);
  });

  it('replies to a state request with the current question and the time left', () => {
    const { socket, listeners, emitted } = makeSocket();
    registerVocabQuizHandlers(makeIo().io, socket);

    vi.advanceTimersByTime(6_000);
    listeners.get(VOCAB_QUIZ_EVENTS.requestState)!();

    const state = emitted.mock.calls.find((c) => c[0] === VOCAB_QUIZ_EVENTS.state);
    expect(state).toBeDefined();
    expect(state![1]).toMatchObject({ active: true, phase: 'question', index: 0 });
    expect((state![1] as { question: { remainingMs: number } }).question.remainingMs)
      .toBeLessThanOrEqual(14_000);
  });
});

describe('teacher live controls', () => {
  beforeEach(async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(classroomGame('vocab-quiz'));
    await startVocabQuizForClassroom(makeIo().io, GAME_CODE);
    (gameStateManager.getGameBySocketId as Mock).mockReturnValue(GAME_CODE);
    (gameStateManager.getUsernameBySocketId as Mock).mockReturnValue('Ms K');
  });

  it('pauses and resumes the round for the host', () => {
    const { socket, listeners } = makeSocket('socket-teacher');
    registerVocabQuizHandlers(makeIo().io, socket);

    listeners.get('pauseGame')!();
    expect(getActiveQuiz(GAME_CODE)!.paused).toBe(true);
    listeners.get('resumeGame')!();
    expect(getActiveQuiz(GAME_CODE)!.paused).toBe(false);
  });

  it('ignores pause from a student', () => {
    (gameStateManager.getUsernameBySocketId as Mock).mockReturnValue('ana');
    const { socket, listeners } = makeSocket('socket-ana');
    registerVocabQuizHandlers(makeIo().io, socket);

    listeners.get('pauseGame')!();
    expect(getActiveQuiz(GAME_CODE)!.paused).toBe(false);
  });

  it('skips the current question for the host', () => {
    const { socket, listeners } = makeSocket('socket-teacher');
    registerVocabQuizHandlers(makeIo().io, socket);

    listeners.get('skipTargetWord')!();
    vi.advanceTimersByTime(4_000);
    expect(getActiveQuiz(GAME_CODE)!.index).toBe(1);
  });

  it('ends the round early for the host', async () => {
    const { socket, listeners } = makeSocket('socket-teacher');
    registerVocabQuizHandlers(makeIo().io, socket);

    listeners.get('endRoundNow')!();
    await vi.runOnlyPendingTimersAsync();
    expect(getActiveQuiz(GAME_CODE)).toBeUndefined();
  });

  it('leaves a room with no quiz completely alone, so the board game keeps its own controls', () => {
    stopAllQuizzesForTest();
    const { socket, listeners } = makeSocket('socket-teacher');
    registerVocabQuizHandlers(makeIo().io, socket);
    expect(() => listeners.get('pauseGame')!()).not.toThrow();
    expect(() => listeners.get('endRoundNow')!()).not.toThrow();
  });
});

describe('round progression', () => {
  beforeEach(async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(
      classroomGame('vocab-quiz', { vocabQuizQuestionCount: 4, vocabQuizSeconds: 10 })
    );
  });

  it('reveals the answer when the question clock runs out, then moves on', async () => {
    const { io, emit } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);

    await vi.advanceTimersByTimeAsync(10_100);
    expect(emit.mock.calls.some((c) => c[0] === VOCAB_QUIZ_EVENTS.reveal)).toBe(true);
    expect(getActiveQuiz(GAME_CODE)!.phase).toBe('reveal');

    await vi.advanceTimersByTimeAsync(3_100);
    expect(getActiveQuiz(GAME_CODE)!.index).toBe(1);
    expect(getActiveQuiz(GAME_CODE)!.phase).toBe('question');
  });

  it('does not advance while the round is paused', async () => {
    const { io } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    const { socket, listeners } = makeSocket('socket-teacher');
    (gameStateManager.getGameBySocketId as Mock).mockReturnValue(GAME_CODE);
    (gameStateManager.getUsernameBySocketId as Mock).mockReturnValue('Ms K');
    registerVocabQuizHandlers(io, socket);

    listeners.get('pauseGame')!();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(getActiveQuiz(GAME_CODE)!.index).toBe(0);
    expect(getActiveQuiz(GAME_CODE)!.phase).toBe('question');
  });
});

describe('end of round persistence', () => {
  it('hands the lesson words each student got right to the classroom persistence path', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(
      classroomGame('vocab-quiz', { vocabQuizQuestionCount: 4, vocabQuizSeconds: 10 })
    );
    const { io, emit } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);

    const session = getActiveQuiz(GAME_CODE)!;
    const correctWords: string[] = [];
    // ana answers every question correctly; bo answers none.
    for (let q = 0; q < session.questions.length; q++) {
      const question = session.questions[session.index];
      correctWords.push(question.word);
      const { socket, listeners } = makeSocket();
      (gameStateManager.getGameBySocketId as Mock).mockReturnValue(GAME_CODE);
      (gameStateManager.getUsernameBySocketId as Mock).mockReturnValue('ana');
      registerVocabQuizHandlers(io, socket);
      listeners.get(VOCAB_QUIZ_EVENTS.answer)!({ index: session.index, choiceIndex: question.answerIndex });
      await vi.advanceTimersByTimeAsync(13_200);
    }

    expect(persistence.persistClassroomGameScores).toHaveBeenCalledTimes(1);
    const [, playerScores] = (persistence.persistClassroomGameScores as Mock).mock.calls[0];

    const ana = playerScores.find((p: { userId: string }) => p.userId === 'user-ana');
    expect(ana.wordsFound).toEqual(correctWords);
    expect(ana.score).toBeGreaterThan(0);

    const bo = playerScores.find((p: { userId: string }) => p.userId === 'user-bo');
    expect(bo.wordsFound).toEqual([]);

    expect(emit.mock.calls.some((c) => c[0] === VOCAB_QUIZ_EVENTS.ended)).toBe(true);
    expect(emit.mock.calls.some((c) => c[0] === 'classroomGameEnded')).toBe(true);
  });

  it('tells persistence which words it asked, so unasked words are not reported as missed', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(
      classroomGame('vocab-quiz', { vocabQuizQuestionCount: 4, vocabQuizSeconds: 10 })
    );
    const { io } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    const asked = getActiveQuiz(GAME_CODE)!.questions.map((q) => q.word);

    await vi.advanceTimersByTimeAsync(4 * 13_200);

    const [, , options] = (persistence.persistClassroomGameScores as Mock).mock.calls[0];
    expect(options.askedWords).toEqual(asked);
    // The lesson has 5 words but only 4 were asked — the 5th must not be
    // handed over as something the class failed.
    expect(options.askedWords.length).toBeLessThan(LESSON.length);
    expect(options.answersByUser).toBeDefined();
  });

  it('marks the room finished so the board engine never runs its own end path', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(
      classroomGame('vocab-quiz', { vocabQuizQuestionCount: 4, vocabQuizSeconds: 10 })
    );
    const { io } = makeIo();
    await startVocabQuizForClassroom(io, GAME_CODE);
    await vi.advanceTimersByTimeAsync(4 * 13_200);

    expect(gameStateManager.transitionGameState).toHaveBeenCalledWith(
      GAME_CODE,
      'END',
      expect.objectContaining({ immediate: true })
    );
    expect(classroomGameManager.updateClassroomGameStatus).toHaveBeenCalledWith(GAME_CODE, 'finished');
  });
});
