/**
 * The accuracy dial, from the classroom record to the quiz round (RED first).
 *
 * The dials live under `settings.pressure` on the classroom game record
 * (written by updateClassroomGamePressure); the quiz handler must hand the
 * speed dial to the engine or a teacher who launched a calm quiz gets reflex
 * scoring anyway — settings that look applied and are not (pitfall 2).
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
  getActiveQuiz,
  stopAllQuizzesForTest,
} from '../vocabQuizHandler';

const word = (w: string): VocabularyWord => ({ word: w, canIntegrate: true, definition: `def of ${w}` });
const LESSON = ['abandon', 'brittle', 'candid', 'dwindle', 'endure'].map(word);
const GAME_CODE = 'ABC123';

function makeIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to } as never, emit };
}

function quizGame(pressure?: Record<string, unknown>) {
  return {
    gameCode: GAME_CODE,
    classroomId: 'class-1',
    teacherId: 'teacher-1',
    teacherName: 'Ms K',
    lessonIds: ['lesson-1'],
    lessonNames: ['Unit 3'],
    vocabularyWords: LESSON.map((w) => w.word),
    players: [{ userId: 'user-ana', username: 'ana', socketId: 'socket-ana' }],
    settings: { gameMode: 'vocab-quiz', ...(pressure ? { pressure } : {}) },
    createdAt: new Date().toISOString(),
    status: 'playing' as const,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  (lessonWords.loadLessonVocabulary as Mock).mockResolvedValue({ words: LESSON, language: 'en' });
  (gameStateManager.getGame as Mock).mockReturnValue({
    gameCode: GAME_CODE,
    isClassroom: true,
    hostSocketId: 'socket-teacher',
    users: { ana: { socketId: 'socket-ana', authUserId: 'user-ana', isHost: false, isBot: false } },
  });
  (gameStateManager.transitionGameState as Mock).mockReturnValue({ success: true });
});

afterEach(() => {
  stopAllQuizzesForTest();
  vi.useRealTimers();
});

describe('startVocabQuizForClassroom — pressure dials', () => {
  it('accuracy-only quiz: speedScoring false reaches the engine', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(
      quizGame({ leaderboard: 'hidden', timer: 'gentle', speedScoring: false })
    );
    const { io } = makeIo();
    expect(await startVocabQuizForClassroom(io, GAME_CODE)).toBe(true);
    expect(getActiveQuiz(GAME_CODE)!.speedScoring).toBe(false);
  });

  it('no dials on the record: reflexes count (the loud default)', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(quizGame());
    const { io } = makeIo();
    expect(await startVocabQuizForClassroom(io, GAME_CODE)).toBe(true);
    expect(getActiveQuiz(GAME_CODE)!.speedScoring).toBe(true);
  });
});
