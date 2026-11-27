import { describe, expect, it } from 'vitest';
import {
  addDays,
  applyReview,
  dayDiff,
  effectiveStrength,
  isDue,
  isMasteredStrength,
  isRecallKind,
  type MemoryState,
  type ReviewKind,
} from '../wordMemory';

const D0 = '2026-11-01';
const day = (n: number) => addDays(D0, n);
const recall = (correct = true, kind: ReviewKind = 'recall') => ({ correct, kind });

/** Applies reviews in order, each `[dayOffset, review]`. */
function run(steps: Array<[number, { correct: boolean; kind: ReviewKind }]>, start: MemoryState | null = null) {
  let s = start;
  for (const [d, r] of steps) s = applyReview(s, r, day(d));
  return s as MemoryState;
}

describe('date helpers', () => {
  it('GIVEN two ISO days WHEN diffed THEN whole days, across month and DST boundaries', () => {
    expect(dayDiff('2026-11-01', '2026-11-08')).toBe(7);
    expect(dayDiff('2026-03-28', '2026-03-30')).toBe(2);
    expect(dayDiff('2026-12-31', '2027-01-01')).toBe(1);
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
  });
});

describe('isRecallKind', () => {
  it.each(['recall', 'spell', 'use', 'context', 'find'] as const)('GIVEN %s THEN recall-level', (k) => expect(isRecallKind(k)).toBe(true));
  it('GIVEN recognise THEN not recall-level', () => expect(isRecallKind('recognise')).toBe(false));
});

describe('applyReview: schedule', () => {
  it('GIVEN a new word WHEN answered right THEN due tomorrow, one repetition', () => {
    const s = applyReview(null, recall(), D0);
    expect(s).toMatchObject({ repetitions: 1, interval: 1, nextReviewDate: day(1), lastReviewDate: D0 });
  });

  it('GIVEN due reviews WHEN recalled right each time THEN the interval grows 1 → 3 → ×ease', () => {
    const s1 = run([[0, recall()]]);
    const s2 = run([[1, recall()]], s1);
    expect(s2.interval).toBe(3);
    const s3 = run([[4, recall()]], s2);
    expect(s3.interval).toBe(Math.round(3 * s2.easeFactor));
    expect(s3.nextReviewDate).toBe(day(4 + s3.interval));
  });

  it('GIVEN the same history WHEN the kind is harder THEN the word moves further out', () => {
    const steps = (kind: ReviewKind) => {
      let s: MemoryState | null = null;
      for (let i = 0; i < 3; i++) s = applyReview(s, recall(true, kind), s ? s.nextReviewDate : D0);
      return s as MemoryState;
    };
    expect(steps('use').interval).toBeGreaterThan(steps('recall').interval);
    expect(steps('recall').interval).toBeGreaterThan(steps('recognise').interval);
    expect(steps('recognise').interval).toBeGreaterThanOrEqual(steps('find').interval);
  });

  it('GIVEN a word not yet due WHEN reviewed early THEN the schedule does not advance', () => {
    const s1 = run([[0, recall()], [1, recall()]]);
    const early = applyReview(s1, recall(), day(2));
    expect(early).toMatchObject({ repetitions: s1.repetitions, interval: s1.interval, nextReviewDate: s1.nextReviewDate });
    expect(early.lastReviewDate).toBe(day(2));
  });

  it('GIVEN a learned word WHEN answered wrong THEN reps reset, due again today, ease drops', () => {
    const s = run([[0, recall()], [1, recall()], [4, recall()]]);
    const wrong = applyReview(s, recall(false), day(5));
    expect(wrong).toMatchObject({ repetitions: 0, interval: 1, nextReviewDate: day(5) });
    expect(wrong.easeFactor).toBeLessThan(s.easeFactor);
  });

  it('GIVEN many wrong answers THEN ease never goes below 1.3, and many right never above 5', () => {
    let s: MemoryState | null = null;
    for (let i = 0; i < 20; i++) s = applyReview(s, recall(false), D0);
    expect(s!.easeFactor).toBe(1.3);
    let t: MemoryState | null = null;
    let d = 0;
    for (let i = 0; i < 40; i++) {
      t = applyReview(t, recall(true, 'use'), day(d));
      d = dayDiff(D0, t.nextReviewDate);
    }
    expect(t!.easeFactor).toBeLessThanOrEqual(5);
    expect(t!.interval).toBeLessThanOrEqual(365);
  });

  it('GIVEN a wrong answer earlier today WHEN right later today THEN due tomorrow (comes back sooner)', () => {
    const s = run([[0, recall(false)], [0, recall()]]);
    expect(s).toMatchObject({ repetitions: 1, interval: 1, nextReviewDate: day(1) });
  });
});

describe('applyReview: strength stages', () => {
  it('GIVEN a new word WHEN recognised THEN sprout, never higher however often', () => {
    expect(applyReview(null, recall(true, 'recognise'), D0).strength).toBe('sprout');
    const many = run(Array.from({ length: 30 }, (_, i) => [i * 8, recall(true, 'recognise')] as [number, { correct: boolean; kind: ReviewKind }]));
    expect(many.strength).toBe('sprout');
    expect(many.correctDays).toBe(0);
  });

  it('GIVEN a new word WHEN answered wrong THEN sprout (attempted)', () => {
    expect(applyReview(null, recall(false), D0).strength).toBe('sprout');
  });

  it.each(['recall', 'spell', 'use', 'context', 'find'] as const)('GIVEN a new word WHEN %s is right THEN plant', (kind) => {
    expect(applyReview(null, recall(true, kind), D0).strength).toBe('plant');
  });

  it('GIVEN one recall WHEN recalled again the same day THEN still plant', () => {
    const s = run([[0, recall()], [0, recall(true, 'spell')]]);
    expect(s.strength).toBe('plant');
    expect(s.correctDays).toBe(1);
  });

  it('GIVEN one recall WHEN recalled on a second day THEN flower', () => {
    const s = run([[0, recall()], [1, recall(true, 'spell')]]);
    expect(s.strength).toBe('flower');
    expect(s.correctDays).toBe(2);
  });

  it('GIVEN a recall WHEN recalled again after 7+ days THEN gold, best gap recorded', () => {
    const s = run([[0, recall()], [1, recall()], [8, recall()]]);
    expect(s.strength).toBe('gold');
    expect(s.bestGapDays).toBe(7);
  });

  it('GIVEN a gap of 6 days THEN not gold', () => {
    expect(run([[0, recall()], [1, recall()], [7, recall()]]).strength).toBe('flower');
  });

  it('GIVEN a recognise answer between two recalls THEN the gap is measured from the last recall', () => {
    const s = run([[0, recall()], [5, recall(true, 'recognise')], [8, recall()]]);
    expect(s.strength).toBe('gold');
  });

  it('GIVEN a flower word WHEN only recognised later THEN it stays flower (no promotion, no demotion)', () => {
    const s = run([[0, recall()], [1, recall()], [2, recall(true, 'recognise')]]);
    expect(s.strength).toBe('flower');
  });

  it('GIVEN a gold word WHEN answered wrong THEN still gold until it wilts', () => {
    const s = run([[0, recall()], [1, recall()], [8, recall()], [9, recall(false)]]);
    expect(s.strength).toBe('gold');
    expect(effectiveStrength(s, day(9))).toBe('gold');
    expect(effectiveStrength(s, day(10))).toBe('flower');
  });

  it('GIVEN a grandfathered word (mastered before the engine) WHEN first found THEN it starts at flower', () => {
    const s = applyReview(null, recall(true, 'find'), D0, { grandfathered: true });
    expect(s.strength).toBe('flower');
  });
});

describe('effectiveStrength: wilting at read time', () => {
  it('GIVEN no row THEN seed', () => expect(effectiveStrength(null, D0)).toBe('seed'));

  it('GIVEN a word on or before its due day THEN stored strength', () => {
    const s = run([[0, recall()], [1, recall()]]);
    expect(effectiveStrength(s, s.nextReviewDate)).toBe('flower');
  });

  it('GIVEN a word past its due day THEN one stage down, however long overdue', () => {
    const s = run([[0, recall()], [1, recall()]]);
    expect(effectiveStrength(s, addDays(s.nextReviewDate, 1))).toBe('plant');
    expect(effectiveStrength(s, addDays(s.nextReviewDate, 400))).toBe('plant');
  });

  it('GIVEN an overdue sprout THEN still sprout (a seen word never becomes unseen)', () => {
    const s = applyReview(null, recall(false), D0);
    expect(effectiveStrength(s, day(30))).toBe('sprout');
  });

  it.each(['recognise', 'find'] as const)('GIVEN an overdue flower WHEN a %s is right THEN it stays flower (a right answer never lowers a word)', (kind) => {
    const s = run([[0, recall()], [1, recall()]]);
    const after = applyReview(s, recall(true, kind), addDays(s.nextReviewDate, 2));
    expect(after.strength).toBe('flower');
  });

  it('GIVEN an overdue flower WHEN answered wrong THEN the wilt is stored (plant)', () => {
    const s = run([[0, recall()], [1, recall()]]);
    expect(applyReview(s, recall(false), addDays(s.nextReviewDate, 2)).strength).toBe('plant');
  });

  it('GIVEN a grandfathered flower found live two days later THEN it stays flower', () => {
    const s = applyReview(null, recall(true, 'find'), D0, { grandfathered: true });
    expect(applyReview(s, recall(true, 'find'), day(3)).strength).not.toBe('plant');
  });

  it('GIVEN an overdue plant WHEN recalled on a later day THEN flower again', () => {
    const s = run([[0, recall()]]);
    const after = applyReview(s, recall(), day(5));
    expect(after.strength).toBe('flower');
  });
});

describe('isDue / isMasteredStrength', () => {
  it('GIVEN next review today or earlier THEN due; later THEN not; no row THEN not', () => {
    const s = applyReview(null, recall(), D0);
    expect(isDue(s, D0)).toBe(false);
    expect(isDue(s, day(1))).toBe(true);
    expect(isDue(null, D0)).toBe(false);
  });

  it('GIVEN strengths THEN only flower and gold are mastered', () => {
    expect(['seed', 'sprout', 'plant', 'flower', 'gold'].map((s) => isMasteredStrength(s as never))).toEqual([false, false, false, true, true]);
  });
});
