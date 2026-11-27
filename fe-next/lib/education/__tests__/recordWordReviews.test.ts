import { describe, expect, it } from 'vitest';
import { MAX_REVIEWS_PER_REQUEST, MAX_WORDS_PER_DAY, recordWordReviews, type WordReviewRow } from '../recordWordReviews';
import { addDays, type WordResult } from '../wordMemory';
import { memoryDb } from './memoryDb';

const D0 = '2026-11-01';
const STUDENT = 'stu-1';
const LESSON = 'lesson-1';
const lesson = { language: 'en' as const, words: ['Apple', 'banana', 'cherry'] };
const r = (word: string, correct: boolean, kind: WordResult['kind']): WordResult => ({ word, correct, kind });
const record = (m: ReturnType<typeof memoryDb>, reviews: WordResult[], today = D0, l: { language: 'en' | 'he'; words: string[] } = lesson) =>
  recordWordReviews(m.db, { studentId: STUDENT, lessonId: LESSON, lesson: l, reviews, today });
const mastered = (m: ReturnType<typeof memoryDb>) => m.tables.student_lesson_progress.find((p) => p.student_id === STUDENT)?.words_mastered;
const row = (m: ReturnType<typeof memoryDb>, word: string) => m.tables.word_review_state.find((x) => x.word === word) as WordReviewRow | undefined;

describe('recordWordReviews', () => {
  it('GIVEN one live find WHEN recorded THEN the word is a plant and NOT mastered', async () => {
    const m = memoryDb({ progress: [{ student_id: STUDENT, lesson_id: LESSON, words_mastered: [] }] });
    const out = await record(m, [r('apple', true, 'find')]);
    expect(row(m, 'Apple')).toMatchObject({ student_id: STUDENT, lesson_id: LESSON, strength: 'plant', correct_days: 1 });
    expect(out.mastered).toEqual([]);
    expect(mastered(m)).toEqual([]);
  });

  it('GIVEN recall on two different days WHEN recorded THEN the word becomes a flower and joins words_mastered', async () => {
    const m = memoryDb();
    await record(m, [r('apple', true, 'recall')]);
    expect(row(m, 'Apple')?.strength).toBe('plant');
    const out = await record(m, [r('APPLE', true, 'spell')], addDays(D0, 1));
    expect(row(m, 'Apple')).toMatchObject({ strength: 'flower', correct_days: 2, last_correct_date: addDays(D0, 1) });
    expect(out.mastered).toEqual(['Apple']);
    expect(mastered(m)).toEqual(['Apple']);
  });

  it('GIVEN a mastered word that wilted WHEN answered wrong THEN it drops out of words_mastered', async () => {
    const m = memoryDb();
    await record(m, [r('apple', true, 'recall')]);
    await record(m, [r('apple', true, 'recall')], addDays(D0, 1));
    expect(mastered(m)).toEqual(['Apple']);
    const due = row(m, 'Apple')!.next_review_date;
    await record(m, [r('apple', false, 'recall')], addDays(due, 3));
    expect(row(m, 'Apple')?.strength).toBe('plant');
    expect(mastered(m)).toEqual([]);
  });

  it('GIVEN a mastered word that wilted WHEN recognised right THEN it stays mastered', async () => {
    const m = memoryDb();
    await record(m, [r('apple', true, 'recall')]);
    await record(m, [r('apple', true, 'recall')], addDays(D0, 1));
    const due = row(m, 'Apple')!.next_review_date;
    await record(m, [r('apple', true, 'recognise')], addDays(due, 3));
    expect(mastered(m)).toEqual(['Apple']);
  });

  it('GIVEN a mastery change WHEN written THEN it is ONE atomic call with only the adds and removes', async () => {
    const m = memoryDb({ progress: [{ student_id: STUDENT, lesson_id: LESSON, words_mastered: ['cherry', 'banana'] }] });
    m.tables.word_review_state.push({ student_id: STUDENT, lesson_id: LESSON, word: 'banana', ease_factor: 2.5, interval: 1, repetitions: 1, next_review_date: D0, last_review_date: D0, correct_days: 2, last_correct_date: D0, best_gap_days: 1, strength: 'flower' });
    await record(m, [r('banana', false, 'spell'), r('apple', true, 'recall')], addDays(D0, 5));
    await record(m, [r('apple', true, 'recall')], addDays(D0, 6));
    expect(m.upserts.filter((u) => u.table === 'student_lesson_progress')).toEqual([]);
    expect(m.rpcs.map((c) => c.args)).toEqual([
      { p_student_id: STUDENT, p_lesson_id: LESSON, p_add: [], p_remove: ['banana'] },
      { p_student_id: STUDENT, p_lesson_id: LESSON, p_add: ['Apple'], p_remove: [] },
    ]);
    expect(mastered(m)).toEqual(['cherry', 'Apple']);
  });

  it('GIVEN another writer added a word between our read and write THEN it survives (no read-then-overwrite)', async () => {
    const m = memoryDb({
      beforeRpc: (t) => { (t.student_lesson_progress[0].words_mastered as string[]).push('cherry'); },
      progress: [{ student_id: STUDENT, lesson_id: LESSON, words_mastered: [] }],
    });
    await record(m, [r('apple', true, 'recall')]);
    await record(m, [r('apple', true, 'recall')], addDays(D0, 1));
    expect(mastered(m)).toEqual(['cherry', 'Apple']);
  });

  it('GIVEN mixed case and spacing WHEN recorded THEN one row under the lesson spelling', async () => {
    const m = memoryDb();
    await record(m, [r(' APPLE ', true, 'recall'), r('apple', false, 'recall'), r('Apple', true, 'recognise')]);
    expect(m.tables.word_review_state).toHaveLength(1);
    expect(row(m, 'Apple')).toBeDefined();
  });

  it('GIVEN a Hebrew lesson WHEN a word arrives without its final letter form THEN it matches the lesson word', async () => {
    const m = memoryDb();
    const he = { language: 'he' as const, words: ['שלום'] };
    const out = await record(m, [r('שלומ', true, 'recall')], D0, he);
    expect(out.recorded).toBe(1);
    expect(row(m, 'שלום')).toBeDefined();
  });

  it('GIVEN words outside the lesson WHEN recorded THEN they are dropped, nothing is written for them', async () => {
    const m = memoryDb();
    const out = await record(m, [r('zebra', true, 'recall'), r('banana', true, 'recall')]);
    expect(out).toMatchObject({ recorded: 1, dropped: 1 });
    expect(m.tables.word_review_state.map((x) => x.word)).toEqual(['banana']);
  });

  it('GIVEN no lesson word at all WHEN recorded THEN no read and no write happen', async () => {
    const m = memoryDb({ failRead: 'word_review_state' });
    const out = await record(m, [r('zebra', true, 'recall')]);
    expect(out).toEqual({ recorded: 0, dropped: 1, mastered: null });
    expect(m.upserts).toEqual([]);
  });

  it('GIVEN more answers than the per-request cap WHEN recorded THEN only the cap is applied', async () => {
    const m = memoryDb();
    const many = Array.from({ length: MAX_REVIEWS_PER_REQUEST + 50 }, () => r('apple', true, 'recognise'));
    const out = await record(m, many);
    expect(out.recorded).toBe(MAX_REVIEWS_PER_REQUEST);
    expect(out.dropped).toBe(50);
  });

  it('GIVEN the student already hit the daily word cap WHEN new words arrive THEN they are dropped, words seen today still count', async () => {
    const filler = Array.from({ length: MAX_WORDS_PER_DAY - 1 }, (_, i) => ({ student_id: STUDENT, lesson_id: 'other', word: `w${i}`, last_review_date: D0 }));
    const m = memoryDb({ reviews: filler });
    const out = await record(m, [r('apple', true, 'recall'), r('banana', true, 'recall'), r('apple', true, 'recall')]);
    expect(out.recorded).toBe(2);
    expect(row(m, 'Apple')).toBeDefined();
    expect(row(m, 'banana')).toBeUndefined();
  });

  it('GIVEN many words WHEN recorded THEN rows are written in ONE batched upsert on the unique key', async () => {
    const m = memoryDb();
    await record(m, [r('apple', true, 'recall'), r('banana', false, 'spell'), r('cherry', true, 'find')]);
    const reviewUpserts = m.upserts.filter((u) => u.table === 'word_review_state');
    expect(reviewUpserts).toHaveLength(1);
    expect(reviewUpserts[0]).toMatchObject({ onConflict: 'student_id,lesson_id,word' });
    expect(reviewUpserts[0].rows).toHaveLength(3);
  });

  it('GIVEN words mastered before the engine WHEN one is found again THEN it stays mastered (grandfathered) and untouched ones stay too', async () => {
    const m = memoryDb({ progress: [{ student_id: STUDENT, lesson_id: LESSON, words_mastered: ['Apple', 'banana'] }] });
    const out = await record(m, [r('apple', true, 'find')]);
    expect(row(m, 'Apple')?.strength).toBe('flower');
    expect(out.mastered).toEqual(['Apple', 'banana']);
  });

  it('GIVEN nothing changed in mastery WHEN recorded THEN mastery is not written', async () => {
    const m = memoryDb({ progress: [{ student_id: STUDENT, lesson_id: LESSON, words_mastered: [] }] });
    await record(m, [r('apple', true, 'find')]);
    expect(m.rpcs).toEqual([]);
  });

  it('GIVEN an existing row stored under an older spelling WHEN reviewed THEN that row is updated, not duplicated', async () => {
    const m = memoryDb({
      reviews: [{ student_id: STUDENT, lesson_id: LESSON, word: 'apple', ease_factor: 2.5, interval: 1, repetitions: 1, next_review_date: D0, last_review_date: addDays(D0, -1), correct_days: 1, last_correct_date: addDays(D0, -1), best_gap_days: 0, strength: 'plant' }],
    });
    await record(m, [r('Apple', true, 'recall')]);
    expect(m.tables.word_review_state).toHaveLength(1);
    expect(row(m, 'apple')?.strength).toBe('flower');
  });

  it('GIVEN a read error WHEN recorded THEN it throws (never a silent no-op)', async () => {
    await expect(record(memoryDb({ failRead: 'word_review_state' }), [r('apple', true, 'recall')])).rejects.toThrow(/read failed/);
    await expect(record(memoryDb({ failRead: 'student_lesson_progress' }), [r('apple', true, 'recall')])).rejects.toThrow(/read failed/);
  });

  it('GIVEN a write error WHEN recorded THEN it throws', async () => {
    await expect(record(memoryDb({ failWrite: 'word_review_state' }), [r('apple', true, 'recall')])).rejects.toThrow(/write failed/);
    const m = memoryDb({ failWrite: 'apply_words_mastered', progress: [{ student_id: STUDENT, lesson_id: LESSON, words_mastered: ['apple'] }] });
    m.tables.word_review_state.push({ student_id: STUDENT, lesson_id: LESSON, word: 'apple', ease_factor: 2.5, interval: 1, repetitions: 0, next_review_date: D0, last_review_date: D0, correct_days: 0, last_correct_date: null, best_gap_days: 0, strength: 'sprout' });
    await expect(record(m, [r('apple', false, 'recall')])).rejects.toThrow(/write failed/);
  });
});
