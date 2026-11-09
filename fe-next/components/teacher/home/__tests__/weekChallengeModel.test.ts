import { describe, it, expect } from 'vitest';
import { firstWordSet, nextWordSet, pickWeekChallenge, type ChallengeAssignment, type ChallengeLesson } from '../weekChallengeModel';

const a = (over: Partial<ChallengeAssignment>): ChallengeAssignment => ({
  id: 'a1', lesson_id: 'l1', due_date: null, created_at: '2026-11-01T10:00:00Z',
  completion_count: 0, student_count: 24, vocabulary_lessons: { name: 'Planets' }, ...over,
});
const l = (over: Partial<ChallengeLesson>): ChallengeLesson => ({ id: 'l1', name: 'Planets', language: 'en', classroom_id: 'c1', updated_at: '2026-11-01T00:00:00Z', words: ['orbit'], ...over });

describe('pickWeekChallenge', () => {
  const today = '2026-11-09';

  it('given an assignment due later this week, then it is the open challenge with its finish count', () => {
    expect(pickWeekChallenge([a({ due_date: '2026-11-16T00:00:00+00:00', completion_count: 7 })], today)).toEqual({
      state: 'open', assignmentId: 'a1', lessonId: 'l1', lessonName: 'Planets', due: '2026-11-16', finished: 7, students: 24,
    });
  });

  it('given an assignment due today, then it is still open', () => {
    expect(pickWeekChallenge([a({ due_date: '2026-11-09T00:00:00Z' })], today)?.state).toBe('open');
  });

  it('given no due date, then it counts as open', () => {
    expect(pickWeekChallenge([a({ due_date: null })], today)?.due).toBeNull();
  });

  it('given two open assignments, then the newest wins', () => {
    const pick = pickWeekChallenge([
      a({ id: 'old', due_date: '2026-11-20', created_at: '2026-11-01T00:00:00Z' }),
      a({ id: 'new', due_date: '2026-11-18', created_at: '2026-11-08T00:00:00Z' }),
    ], today);
    expect(pick?.assignmentId).toBe('new');
  });

  it('given only a closed challenge with finishers in the last two weeks, then its results are waiting', () => {
    const pick = pickWeekChallenge([a({ due_date: '2026-11-02', completion_count: 3 })], today);
    expect(pick).toMatchObject({ state: 'ended', finished: 3 });
  });

  it('given a closed challenge nobody finished, or one older than two weeks, then there is nothing to show', () => {
    expect(pickWeekChallenge([a({ due_date: '2026-11-02', completion_count: 0 })], today)).toBeNull();
    expect(pickWeekChallenge([a({ due_date: '2026-10-20', completion_count: 5 })], today)).toBeNull();
  });

  it('given no assignments, then null', () => {
    expect(pickWeekChallenge([], today)).toBeNull();
  });
});

describe('nextWordSet', () => {
  it('never repeats the current list', () => {
    expect(nextWordSet([l({ id: 'l1' })], 'l1', 'c1', 'en')).toBeNull();
  });

  it('prefers this class, then the class language, then the newest edit', () => {
    const lessons = [
      l({ id: 'other-class', classroom_id: 'c2', updated_at: '2026-11-08T00:00:00Z' }),
      l({ id: 'this-class-old', classroom_id: 'c1', updated_at: '2026-10-01T00:00:00Z' }),
      l({ id: 'this-class-new', classroom_id: 'c1', updated_at: '2026-11-05T00:00:00Z' }),
      l({ id: 'this-class-he', classroom_id: 'c1', language: 'he', updated_at: '2026-11-09T00:00:00Z' }),
    ];
    expect(nextWordSet(lessons, 'l1', 'c1', 'en')?.id).toBe('this-class-new');
  });

  it('skips empty lists', () => {
    expect(nextWordSet([l({ id: 'empty', words: [] })], 'l1', 'c1', 'en')).toBeNull();
  });
});

describe('firstWordSet', () => {
  it('uses the preferred list when it exists, else the best other list', () => {
    const lessons = [l({ id: 'x' }), l({ id: 'y', updated_at: '2026-11-08T00:00:00Z' })];
    expect(firstWordSet(lessons, 'x', 'c1', 'en')?.id).toBe('x');
    expect(firstWordSet(lessons, 'missing', 'c1', 'en')?.id).toBe('y');
    expect(firstWordSet([], null, 'c1', 'en')).toBeNull();
  });
});
