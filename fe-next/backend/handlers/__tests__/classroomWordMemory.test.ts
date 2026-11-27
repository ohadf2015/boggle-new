/**
 * A word is mastered by recall on two days, never by being found once in a
 * live game. Runs the real live-round mapping and the real engine against an
 * in-memory database.
 */
import { describe, expect, it } from 'vitest';
import { keyOf, liveWordResults, type LessonVocabulary } from '../classroomLessonVocabulary';
import { recordWordReviews } from '@/lib/education/recordWordReviews';
import { memoryDb } from '@/lib/education/__tests__/memoryDb';

const vocab: LessonVocabulary = { language: 'en', words: new Map([[keyOf('cat', 'en'), 'cat'], [keyOf('dog', 'en'), 'dog']]) };
const lesson = { language: 'en' as const, words: [...vocab.words.values()] };
const base = { studentId: 'stu-1', lessonId: 'lesson-1', lesson };
const masteredOf = (m: ReturnType<typeof memoryDb>) => m.tables.student_lesson_progress[0]?.words_mastered ?? [];

describe('live finds vs mastery', () => {
  it('GIVEN a student who finds a lesson word in a live game WHEN the round is recorded THEN the word is not mastered', async () => {
    const m = memoryDb({ progress: [{ student_id: 'stu-1', lesson_id: 'lesson-1', words_mastered: [] }] });
    const reviews = liveWordResults(vocab, new Set([keyOf('CAT', 'en')]), null);
    await recordWordReviews(m.db, { ...base, reviews, today: '2026-11-02' });
    expect(masteredOf(m)).toEqual([]);
    // Finding it again every day for a month still only shows it was seen.
    for (let d = 3; d < 30; d++) await recordWordReviews(m.db, { ...base, reviews, today: `2026-11-${String(d).padStart(2, '0')}` });
    expect(masteredOf(m)).toEqual([]);
  });

  it('GIVEN a student who recalls the word on two different days THEN it is mastered', async () => {
    const m = memoryDb();
    await recordWordReviews(m.db, { ...base, reviews: [{ word: 'cat', correct: true, kind: 'recall' }], today: '2026-11-02' });
    expect(masteredOf(m)).toEqual([]);
    await recordWordReviews(m.db, { ...base, reviews: [{ word: 'Cat', correct: true, kind: 'spell' }], today: '2026-11-03' });
    expect(masteredOf(m)).toEqual(['cat']);
  });

  it('GIVEN a live quiz WHEN answers are right THEN they count as recognition only (seen, not mastered)', async () => {
    const m = memoryDb();
    const answers = [{ word: 'dog', correct: true, ms: 800 }];
    await recordWordReviews(m.db, { ...base, reviews: liveWordResults(vocab, new Set(), answers), today: '2026-11-02' });
    await recordWordReviews(m.db, { ...base, reviews: liveWordResults(vocab, new Set(), answers), today: '2026-11-03' });
    expect(m.tables.word_review_state[0]).toMatchObject({ word: 'dog', strength: 'sprout' });
    expect(masteredOf(m)).toEqual([]);
  });
});
