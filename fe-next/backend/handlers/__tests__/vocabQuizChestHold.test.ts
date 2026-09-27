/**
 * The reveal beat waits for unopened chests.
 *
 * Found in the browser: two students answered within a second, the reveal
 * started, and 3s later the next question wiped the chest picker before the
 * student who got it right could tap. The reveal now holds while a correct
 * answerer still has a chest to open — capped, so one idle phone cannot stall
 * the class.
 */
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
import {
  startVocabQuizForClassroom,
  registerVocabQuizHandlers,
  getActiveQuiz,
  stopAllQuizzesForTest,
} from '../vocabQuizHandler';
import {
  VOCAB_QUIZ_EVENTS,
  VOCAB_QUIZ_REVEAL_MS,
  VOCAB_QUIZ_CHEST_HOLD_MS,
  VOCAB_QUIZ_CHEST_REVEAL_BEAT_MS,
} from '@/shared/types/vocabQuiz';

const LESSON: VocabularyWord[] = ['abandon', 'brittle', 'candid', 'dwindle', 'endure'].map((w, i) => ({
  word: w,
  definition: `definition number ${i} for ${w}`,
  canIntegrate: true,
}));
const GAME = 'HOLD01';

const io = { to: vi.fn(() => ({ emit: vi.fn() })) } as never;

function socketFor(username: string) {
  const listeners = new Map<string, (d: unknown) => void>();
  const socket = { id: `socket-${username}`, on: vi.fn((e: string, fn: (d: unknown) => void) => listeners.set(e, fn)), emit: vi.fn() };
  registerVocabQuizHandlers(io, socket as never);
  return listeners;
}

async function startWithBothAnswered(settings: Record<string, unknown> = {}) {
  (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
    gameCode: GAME, classroomId: 'c', teacherId: 't', teacherName: 'Ms K', lessonIds: ['l'], lessonNames: ['U'],
    vocabularyWords: LESSON.map((w) => w.word),
    players: [],
    settings: { gameMode: 'vocab-quiz', vocabQuizFocus: 'definition', ...settings },
    createdAt: new Date().toISOString(), status: 'playing',
  });
  await startVocabQuizForClassroom(io, GAME);
  const session = getActiveQuiz(GAME)!;
  const q = session.questions[0];
  const ana = socketFor('ana');
  const bo = socketFor('bo');
  (gameStateManager.getUsernameBySocketId as Mock).mockImplementation((id: string) => id.replace('socket-', ''));
  ana.get(VOCAB_QUIZ_EVENTS.answer)!({ index: 0, choiceIndex: q.answerIndex });
  bo.get(VOCAB_QUIZ_EVENTS.answer)!({ index: 0, choiceIndex: (q.answerIndex + 1) % q.choices.length });
  await vi.advanceTimersByTimeAsync(300);
  return { session, ana };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  (lessonWords.loadLessonVocabulary as Mock).mockResolvedValue({ words: LESSON, language: 'en' });
  (gameStateManager.getGame as Mock).mockReturnValue({
    gameCode: GAME,
    isClassroom: true,
    users: {
      ana: { socketId: 'socket-ana', authUserId: null, isHost: false, isBot: false },
      bo: { socketId: 'socket-bo', authUserId: null, isHost: false, isBot: false },
    },
  });
  (gameStateManager.getGameBySocketId as Mock).mockReturnValue(GAME);
});

afterEach(() => {
  stopAllQuizzesForTest();
  vi.useRealTimers();
});

describe('reveal holds for unopened chests', () => {
  it('does not advance after the normal reveal while a correct answerer still has a chest', async () => {
    const { session } = await startWithBothAnswered();
    expect(session.phase).toBe('reveal');
    await vi.advanceTimersByTimeAsync(VOCAB_QUIZ_REVEAL_MS + 200);
    expect(session.phase).toBe('reveal');
    expect(session.index).toBe(0);
  });

  it('after the last chest opens, lingers one short beat so the student sees what they won', async () => {
    const { session, ana } = await startWithBothAnswered();
    await vi.advanceTimersByTimeAsync(VOCAB_QUIZ_REVEAL_MS + 200);
    ana.get(VOCAB_QUIZ_EVENTS.openChest)!({ index: 0, chest: 0 });
    await vi.advanceTimersByTimeAsync(VOCAB_QUIZ_CHEST_REVEAL_BEAT_MS - 500);
    expect(session.index).toBe(0);
    await vi.advanceTimersByTimeAsync(800);
    expect(session.index).toBe(1);
    expect(session.phase).toBe('question');
  });

  it('a chest opened right at the cap does not stretch the reveal past it', async () => {
    const { session, ana } = await startWithBothAnswered();
    await vi.advanceTimersByTimeAsync(VOCAB_QUIZ_REVEAL_MS + VOCAB_QUIZ_CHEST_HOLD_MS - 300);
    ana.get(VOCAB_QUIZ_EVENTS.openChest)!({ index: 0, chest: 0 });
    await vi.advanceTimersByTimeAsync(700);
    expect(session.index).toBe(1);
  });

  it('never waits longer than the cap for an idle phone', async () => {
    const { session } = await startWithBothAnswered();
    await vi.advanceTimersByTimeAsync(VOCAB_QUIZ_REVEAL_MS + VOCAB_QUIZ_CHEST_HOLD_MS + 400);
    expect(session.index).toBe(1);
  });

  it('ends the hold as soon as every eligible student has picked AND acknowledged their reveal', async () => {
    const { session, ana } = await startWithBothAnswered();
    await vi.advanceTimersByTimeAsync(VOCAB_QUIZ_REVEAL_MS + 200);
    ana.get(VOCAB_QUIZ_EVENTS.openChest)!({ index: 0, chest: 0 });
    await vi.advanceTimersByTimeAsync(300);
    expect(session.index).toBe(0); // picked, reveal not seen yet
    ana.get(VOCAB_QUIZ_EVENTS.chestSeen)!({ index: 0 });
    await vi.advanceTimersByTimeAsync(300);
    // Well inside the old 2.5s linger — the room moves on the moment it was seen.
    expect(session.index).toBe(1);
  });

  it('a seen-ack for a stale question does not release the current hold', async () => {
    const { session, ana } = await startWithBothAnswered();
    await vi.advanceTimersByTimeAsync(VOCAB_QUIZ_REVEAL_MS + 200);
    ana.get(VOCAB_QUIZ_EVENTS.chestSeen)!({ index: 3 });
    await vi.advanceTimersByTimeAsync(600);
    expect(session.index).toBe(0);
  });

  it('does not wait for a correct answerer who has left the room', async () => {
    const { session } = await startWithBothAnswered();
    (gameStateManager.getGame as Mock).mockReturnValue({
      gameCode: GAME,
      isClassroom: true,
      users: {
        ana: { socketId: 'socket-ana', authUserId: null, isHost: false, isBot: false, disconnected: true },
        bo: { socketId: 'socket-bo', authUserId: null, isHost: false, isBot: false },
      },
    });
    await vi.advanceTimersByTimeAsync(VOCAB_QUIZ_REVEAL_MS + 400);
    expect(session.index).toBe(1);
  });

  it('keeps the normal pace when the teacher turned chests off', async () => {
    const { session } = await startWithBothAnswered({ treasureChestsEnabled: false });
    await vi.advanceTimersByTimeAsync(VOCAB_QUIZ_REVEAL_MS + 400);
    expect(session.index).toBe(1);
  });
});
