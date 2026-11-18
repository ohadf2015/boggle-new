import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

const upserts: Array<Record<string, unknown>> = [];
const sessionInserts: Array<Record<string, unknown>> = [];
let lessonWords: Array<{ word: string }> = [];
let lessonLanguage = 'en';

vi.mock('../../modules/supabase/client.js', () => ({ getSupabase: vi.fn() }));
vi.mock('../../redisClient.js', () => ({ getRedisClient: vi.fn(() => null) }));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getSupabase } from '../../modules/supabase/client.js';
import { persistClassroomGameScores } from '../classroomGamePersistence';
import { keyOf as keyOfWord, restrictToOffered } from '../classroomLessonVocabulary';
import { lessonTargetsWithDrops } from '@/lib/word-craft/lessonBag';

function makeSupabase() {
  return {
    from(table: string) {
      if (table === 'vocabulary_lessons') {
        return {
          select: () => ({
            in: () => Promise.resolve({
              data: [{ id: 'lesson-1', words: lessonWords, language: lessonLanguage }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'practice_sessions') {
        return {
          insert: (row: Record<string, unknown>) => {
            sessionInserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'student_lesson_progress') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          }),
          upsert: (row: Record<string, unknown>) => {
            upserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'classroom_rounds') {
        return { insert: () => Promise.resolve({ error: null }), upsert: () => Promise.resolve({ error: null }) };
      }
      return {
        select: () => ({
          eq: () => ({ in: () => Promise.resolve({ data: [{ student_id: 'user-ana' }], error: null }) }),
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    },
    rpc: () => Promise.resolve({ error: null }),
  };
}

const game = (gameMode: string) => ({
  gameCode: 'ABC123',
  classroomId: 'class-1',
  teacherId: 'teacher-1',
  teacherName: 'Ms K',
  lessonIds: ['lesson-1'],
  lessonNames: ['Unit 3'],
  vocabularyWords: lessonWords.map((w) => w.word),
  settings: { gameMode },
  players: [{ userId: 'user-ana', username: 'ana', socketId: 's1' }],
  createdAt: new Date().toISOString(),
  status: 'finished' as const,
});

const scores = [{ userId: 'user-ana', score: 300, wordsFound: ['abandon', 'brittle'] }];

type Results = {
  gameCode: string;
  lessonWordsFound: string[];
  lessonWordsMissed: string[];
  lessonWordsAsked?: string[];
  lessonWordsOffered?: string[];
};
const results = () => sessionInserts[0].results as Results;

beforeEach(() => {
  vi.clearAllMocks();
  upserts.length = 0;
  sessionInserts.length = 0;
  lessonLanguage = 'en';
  lessonWords = ['abandon', 'brittle', 'candid', 'dwindle', 'endure', 'frantic', 'gallant', 'hollow'].map((word) => ({ word }));
  (getSupabase as Mock).mockReturnValue(makeSupabase());
});

describe('GIVEN a board that carried 3 of 8 lesson words', () => {
  const offeredWords = ['ABANDON', 'BRITTLE', 'CANDID'];

  it('WHEN a student finds 2 of them THEN accuracy is measured over the 3 offered words', async () => {
    await persistClassroomGameScores(game('classic') as never, scores, { offeredWords });
    expect(sessionInserts[0]).toMatchObject({ words_attempted: 3, words_correct: 2, accuracy: 67 });
  });

  it('WHEN the row is written THEN words that were never on the board are not missed', async () => {
    await persistClassroomGameScores(game('classic') as never, scores, { offeredWords });
    expect(results().lessonWordsMissed).toEqual(['candid']);
    expect(results().lessonWordsOffered).toEqual(['abandon', 'brittle', 'candid']);
  });

  it('WHEN the row is written THEN it is not presented as quiz-grade asked evidence', async () => {
    await persistClassroomGameScores(game('classic') as never, scores, { offeredWords });
    expect(results().lessonWordsAsked).toBeUndefined();
  });

  it('WHEN lesson progress is written THEN only offered words count as attempted', async () => {
    await persistClassroomGameScores(game('classic') as never, scores, { offeredWords });
    expect(Object.keys(upserts[0].words_attempted as object).sort()).toEqual(['abandon', 'brittle', 'candid']);
  });
});

describe('GIVEN a Hebrew lesson whose board stored final-letter forms', () => {
  it('WHEN the student finds the word THEN it still matches the lesson word', async () => {
    lessonLanguage = 'he';
    lessonWords = [{ word: 'שלום' }, { word: 'ספר' }];
    await persistClassroomGameScores(game('classic') as never, [{ userId: 'user-ana', score: 5, wordsFound: ['שלומ'] }], {
      offeredWords: ['שלום'],
    });
    expect(sessionInserts[0]).toMatchObject({ words_attempted: 1, words_correct: 1, accuracy: 100 });
  });
});

describe('GIVEN a round that offered no lesson words', () => {
  it('WHEN it is persisted THEN the round is recorded with no accuracy instead of 0', async () => {
    await persistClassroomGameScores(game('wheel-rush') as never, scores, { offeredWords: [] });
    expect(sessionInserts).toHaveLength(1);
    expect(sessionInserts[0]).toMatchObject({ mode: 'wheel-rush', score: 300, words_attempted: 0, words_correct: 0, accuracy: null });
    expect(results().gameCode).toBe('ABC123');
  });

  it('WHEN it is persisted THEN nobody gets a missed word or a progress entry', async () => {
    await persistClassroomGameScores(game('wheel-rush') as never, scores, { offeredWords: [] });
    expect(results().lessonWordsFound).toEqual([]);
    expect(results().lessonWordsMissed).toEqual([]);
    expect(upserts).toHaveLength(0);
  });
});

describe('GIVEN offered words that match nothing in the lesson', () => {
  it('WHEN persisted THEN the row reports no accuracy rather than falling back to the whole lesson', async () => {
    await persistClassroomGameScores(game('classic') as never, scores, { offeredWords: ['interloper'] });
    expect(sessionInserts[0]).toMatchObject({ words_attempted: 0, accuracy: null });
    expect(results().lessonWordsMissed).toEqual([]);
  });
});

describe('GIVEN the offered words are unknown', () => {
  it('WHEN persisted THEN the whole lesson still counts', async () => {
    await persistClassroomGameScores(game('classic') as never, scores);
    expect(sessionInserts[0]).toMatchObject({ words_attempted: 8, words_correct: 2, accuracy: 25 });
    expect(results().lessonWordsOffered).toBeUndefined();
  });
});

describe.each([
  ['en', ['planet', 'Comet']],
  ['he', ['שלום', 'ספר']],
  ['es', ['niño', 'canción']],
  ['sv', ['skön', 'påse']],
] as const)('GIVEN Wordcraft targets dealt from a %s lesson', (language, words) => {
  it('WHEN they are matched to the lesson THEN every target is recognised', () => {
    const { targets } = lessonTargetsWithDrops(words, language);
    const lesson = { language, words: new Map(words.map((word) => [keyOfWord(word, language), word])) };
    expect(targets).toHaveLength(words.length);
    expect(restrictToOffered(lesson, targets).words.size).toBe(words.length);
  });
});
