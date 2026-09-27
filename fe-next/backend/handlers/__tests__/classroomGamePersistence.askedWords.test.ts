/**
 * Asked-word set in classroom persistence (RED first).
 *
 * A quiz asks a fixed number of questions from a lesson that may hold many
 * more words. The shared persistence path splits the lesson's FULL list into
 * found / missed, so every word the quiz never showed lands in every student's
 * missed list — and the teacher's "reteach these" column fills with words the
 * class was never asked. `lib/education/classReport.ts` already documents this
 * and names the fix: persist the asked set alongside the correct words.
 *
 * The asked set is a GAME-level fact: one question list is broadcast to
 * everyone. So it enters as one optional argument, and its absence must leave
 * board modes byte-identical — a board game really does make every lesson word
 * attemptable, so "all words asked" is the correct default there.
 *
 * The first two tests are the regression guard: board behaviour with no asked
 * set. Everything after that is the new behaviour.
 */
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

const upserts: Array<Record<string, unknown>> = [];
const sessionInserts: Array<Record<string, unknown>> = [];
let existingProgress: Record<string, unknown> | null = null;

vi.mock('../../modules/supabase/client.js', () => ({ getSupabase: vi.fn() }));
vi.mock('../../redisClient.js', () => ({ getRedisClient: vi.fn(() => null) }));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getSupabase } from '../../modules/supabase/client.js';
import { persistClassroomGameScores } from '../classroomGamePersistence';

const LESSON_WORDS = [
  { word: 'abandon', definition: 'to leave behind' },
  { word: 'brittle', definition: 'easily broken' },
  { word: 'candid', definition: 'honest' },
  { word: 'dwindle', definition: 'to shrink' },
  { word: 'endure', definition: 'to last' },
  { word: 'frantic', definition: 'panicked' },
];

function makeSupabase() {
  return {
    from(table: string) {
      if (table === 'vocabulary_lessons') {
        return {
          select: () => ({
            in: () => Promise.resolve({
              data: [{ id: 'lesson-1', words: LESSON_WORDS, language: 'en' }],
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
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: existingProgress, error: null }) }),
            }),
          }),
          upsert: (row: Record<string, unknown>) => {
            upserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
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
  vocabularyWords: LESSON_WORDS.map((w) => w.word),
  settings: { gameMode },
  players: [{ userId: 'user-ana', username: 'ana', socketId: 's1' }],
  createdAt: new Date().toISOString(),
  status: 'finished' as const,
});

const scores = [{ userId: 'user-ana', score: 300, wordsFound: ['abandon', 'brittle'] }];

const attemptedKeys = () =>
  Object.keys((upserts[0]?.words_attempted ?? {}) as Record<string, unknown>);

beforeEach(() => {
  vi.clearAllMocks();
  upserts.length = 0;
  sessionInserts.length = 0;
  existingProgress = null;
  (getSupabase as Mock).mockReturnValue(makeSupabase());
});

describe('board modes, with no asked set — behaviour must not change', () => {
  it('still marks every lesson word attempted', async () => {
    await persistClassroomGameScores(game('classic'), scores);
    expect(attemptedKeys().sort()).toEqual(LESSON_WORDS.map((w) => w.word).sort());
  });

  it('still splits the full lesson list into found and missed', async () => {
    await persistClassroomGameScores(game('classic'), scores);
    const results = sessionInserts[0].results as {
      lessonWordsFound: string[]; lessonWordsMissed: string[];
    };
    expect(results.lessonWordsFound.sort()).toEqual(['abandon', 'brittle']);
    expect(results.lessonWordsMissed.sort()).toEqual(
      ['candid', 'dwindle', 'endure', 'frantic'].sort()
    );
    expect(sessionInserts[0].words_attempted).toBe(6);
  });
});

describe('a quiz that asked only some of the lesson', () => {
  const asked = ['abandon', 'brittle', 'candid', 'dwindle'];

  it('never records an unasked word as attempted', async () => {
    await persistClassroomGameScores(game('vocab-quiz'), scores, { askedWords: asked });
    // 'endure' and 'frantic' were never shown — they must be absent entirely,
    // not present with correct: 0, which is what "missed" looks like.
    expect(attemptedKeys().sort()).toEqual(asked.sort());
    expect(attemptedKeys()).not.toContain('endure');
    expect(attemptedKeys()).not.toContain('frantic');
  });

  it('counts a wrong answer as attempted-not-mastered', async () => {
    await persistClassroomGameScores(game('vocab-quiz'), scores, { askedWords: asked });
    const attempts = upserts[0].words_attempted as Record<string, { attempts: number; correct: number }>;
    expect(attempts.candid).toEqual(expect.objectContaining({ attempts: 1, correct: 0 }));
    expect(attempts.abandon).toEqual(expect.objectContaining({ attempts: 1, correct: 1 }));
  });

  it('limits the missed list to words that were actually asked', async () => {
    await persistClassroomGameScores(game('vocab-quiz'), scores, { askedWords: asked });
    const results = sessionInserts[0].results as {
      lessonWordsFound: string[]; lessonWordsMissed: string[]; lessonWordsAsked?: string[];
    };
    expect(results.lessonWordsMissed.sort()).toEqual(['candid', 'dwindle']);
    expect(results.lessonWordsMissed).not.toContain('endure');
  });

  it('records the asked set so the report can stop guessing', async () => {
    await persistClassroomGameScores(game('vocab-quiz'), scores, { askedWords: asked });
    const results = sessionInserts[0].results as { lessonWordsAsked?: string[] };
    expect(results.lessonWordsAsked?.sort()).toEqual(asked.sort());
  });

  it('reports accuracy over the asked words, not the whole lesson', async () => {
    await persistClassroomGameScores(game('vocab-quiz'), scores, { askedWords: asked });
    expect(sessionInserts[0].words_attempted).toBe(4);
    expect(sessionInserts[0].words_correct).toBe(2);
    expect(sessionInserts[0].accuracy).toBe(50);
  });

  it('only masters words that were asked AND answered correctly', async () => {
    await persistClassroomGameScores(game('vocab-quiz'), scores, { askedWords: asked });
    expect((upserts[0].words_mastered as string[]).sort()).toEqual(['abandon', 'brittle']);
  });

  it('carries per-question answers when the caller supplies them', async () => {
    await persistClassroomGameScores(game('vocab-quiz'), scores, {
      askedWords: asked,
      answersByUser: {
        'user-ana': [
          { word: 'abandon', choiceIndex: 0, correct: true, ms: 1200 },
          { word: 'candid', choiceIndex: 2, correct: false, ms: 8000 },
        ],
      },
    });
    const results = sessionInserts[0].results as {
      answers?: Array<{ word: string; correct: boolean }>;
    };
    expect(results.answers).toHaveLength(2);
    expect(results.answers![1]).toEqual(
      expect.objectContaining({ word: 'candid', correct: false, ms: 8000 })
    );
  });

  it('ignores an asked word that is not in the lesson', async () => {
    await persistClassroomGameScores(game('vocab-quiz'), scores, {
      askedWords: [...asked, 'interloper'],
    });
    expect(attemptedKeys()).not.toContain('interloper');
  });

  it('falls back to the whole lesson when the asked set is empty', async () => {
    // An empty set means "we do not know", not "nothing was asked" — recording
    // zero attempts for a round that happened would erase it from the report.
    await persistClassroomGameScores(game('vocab-quiz'), scores, { askedWords: [] });
    expect(attemptedKeys()).toHaveLength(6);
  });
});
