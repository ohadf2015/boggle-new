/**
 * A quiz round must reopen its classroom code too.
 *
 * The board path does this from `gameStartHandler` — but the quiz branch
 * RETURNS out of that handler (`gameStartHandler.ts:403-407`, position
 * load-bearing and commented as such) long before the reopen runs. So a class
 * playing a second quiz round off the same projector code would be the one mode
 * where a reconnecting student is told the code was never recognised: the same
 * bug, surviving in the one branch that returns early.
 *
 * Recurring pitfall class 2/3 in one — a per-mode branch that skips the shared
 * reset, and two routes to "a round is starting" that behave differently.
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
import { startVocabQuizForClassroom, stopAllQuizzesForTest } from '../vocabQuizHandler';

const word = (w: string, definition: string): VocabularyWord => ({ word: w, definition, canIntegrate: true });

const LESSON: VocabularyWord[] = [
  word('abandon', 'to leave behind for good'),
  word('brittle', 'hard but easily broken'),
  word('candid', 'honest and direct'),
  word('dwindle', 'to shrink little by little'),
];

const CODE = 'QZ1234';
const io = { to: vi.fn(() => ({ emit: vi.fn() })), emit: vi.fn() } as never;

function quizRoom(gameMode: string) {
  return {
    gameCode: CODE,
    classroomId: 'c1',
    teacherId: 't1',
    lessonIds: ['l1'],
    vocabularyWords: LESSON.map((w) => w.word),
    settings: { gameMode, questionCount: 4, secondsPerQuestion: 10 },
    players: [],
    status: 'finished',
  };
}

describe('startVocabQuizForClassroom reopens the classroom code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (gameStateManager.getGame as Mock).mockReturnValue({
      gameCode: CODE,
      users: { Teacher: { isHost: true, socketId: 's-t' }, Maya: { socketId: 's-m', authUserId: 'u-maya' } },
    });
    (lessonWords.loadLessonVocabulary as Mock).mockResolvedValue({ words: LESSON, language: 'en' });
  });

  afterEach(() => stopAllQuizzesForTest());

  it('marks the code live again when a second quiz round starts', async () => {
    // GIVEN a classroom whose previous quiz round ended (status 'finished')
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(quizRoom('vocab-quiz'));

    // WHEN the teacher runs another quiz round in the same room
    const started = await startVocabQuizForClassroom(io, CODE);

    // THEN the quiz took over AND the projector code resolves again — handed
    // the record this path already read, so the reopen costs no second read.
    expect(started).toBe(true);
    expect(classroomGameManager.reopenClassroomGameForRound).toHaveBeenCalledWith(
      CODE,
      expect.objectContaining({ gameCode: CODE })
    );
  });

  it('does not reopen a room the quiz declines to take over', async () => {
    // A board-mode classroom game: the board path does its own reopen, and
    // doing it here as well would be a second source of truth.
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(quizRoom('classic'));

    const started = await startVocabQuizForClassroom(io, CODE);

    expect(started).toBe(false);
    expect(classroomGameManager.reopenClassroomGameForRound).not.toHaveBeenCalled();
  });

  it('does not reopen when the lesson has no quizzable words', async () => {
    // The quiz refuses to start and the room falls back to a board game, which
    // reopens the code on its own path. Reopening here would advertise a round
    // that never began.
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(quizRoom('vocab-quiz'));
    (lessonWords.loadLessonVocabulary as Mock).mockResolvedValue({ words: [], language: 'en' });

    const started = await startVocabQuizForClassroom(io, CODE);

    expect(started).toBe(false);
    expect(classroomGameManager.reopenClassroomGameForRound).not.toHaveBeenCalled();
  });
});
