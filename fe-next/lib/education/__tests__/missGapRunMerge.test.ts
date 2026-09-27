/**
 * Replaying homework must never make a student look worse — RED first.
 *
 * The finish screen's "Play again" is one tap away, and the run is upserted on
 * (class_key, due_key, student_key). A 6/6 run followed by a bored 1/6 replay
 * therefore REPLACED the row the teacher sees, so the student's grade fell for
 * practising more. The migration comment even claimed "a replay improves the
 * row" — this is the module that makes that sentence true.
 */
import { describe, it, expect } from 'vitest';
import { mergeMissGapRun } from '../missGapRunMerge';

const BEST = {
  words_total: 6,
  words_correct: 6,
  accuracy: 100,
  stars: 3,
  best_streak: 6,
  duration_ms: 90_000,
  on_time: true,
};

const WORSE = {
  words_total: 6,
  words_correct: 1,
  accuracy: 17,
  stars: 1,
  best_streak: 1,
  duration_ms: 40_000,
  on_time: true,
};

describe('mergeMissGapRun', () => {
  it('keeps the best score when a replay goes worse', () => {
    const merged = mergeMissGapRun(BEST, WORSE);
    expect(merged.words_correct).toBe(6);
    expect(merged.accuracy).toBe(100);
    expect(merged.stars).toBe(3);
    expect(merged.best_streak).toBe(6);
  });

  it('takes the improvement when a replay goes better', () => {
    const merged = mergeMissGapRun(WORSE, BEST);
    expect(merged.words_correct).toBe(6);
    expect(merged.accuracy).toBe(100);
    expect(merged.stars).toBe(3);
  });

  it('writes the new row untouched when there is nothing to merge with', () => {
    expect(mergeMissGapRun(null, WORSE)).toEqual(WORSE);
    expect(mergeMissGapRun(undefined, WORSE).accuracy).toBe(17);
  });

  it('keeps the FASTEST duration, not the largest', () => {
    expect(mergeMissGapRun(BEST, WORSE).duration_ms).toBe(40_000);
    expect(mergeMissGapRun(WORSE, BEST).duration_ms).toBe(40_000);
  });

  it('an on-time run can never be undone by a later late one', () => {
    const late = { ...BEST, on_time: false };
    expect(mergeMissGapRun(BEST, late).on_time).toBe(true);
    expect(mergeMissGapRun(late, BEST).on_time).toBe(true);
  });

  it('leaves fields the new row owns alone (words_total follows the new run)', () => {
    const merged = mergeMissGapRun({ ...BEST, words_total: 8 }, WORSE);
    expect(merged.words_total).toBe(6);
  });
});
