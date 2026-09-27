/**
 * Tests for `validateDrillSubmission` — server-side sanity checks for
 * `/api/drills/submit` payloads. Stops cheaters from posting absurd
 * scores, near-zero durations, or impossible word counts to inflate
 * XP / brain-score / leaderboard standing.
 */

import {
  validateDrillSubmission,
  type DrillSubmissionInput,
} from '../drillSubmissionValidation';

const valid: DrillSubmissionInput = {
  drillType: 'combo-master',
  level: 2,
  score: 80,
  wordsFound: 6,
  durationSeconds: 30,
};

describe('validateDrillSubmission', () => {
  it('accepts a normal session', () => {
    expect(validateDrillSubmission(valid)).toEqual({ ok: true });
  });

  describe('drillType', () => {
    it('rejects unknown drill types', () => {
      const out = validateDrillSubmission({ ...valid, drillType: 'fake-drill' as never });
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/drill type/i);
    });
  });

  describe('level', () => {
    it.each([0, 6, -1, 1.5, NaN, Infinity])('rejects invalid level %p', (level) => {
      const out = validateDrillSubmission({ ...valid, level: level as number });
      expect(out.ok).toBe(false);
    });

    it('accepts levels 1..5', () => {
      for (const level of [1, 2, 3, 4, 5]) {
        expect(validateDrillSubmission({ ...valid, level })).toEqual({ ok: true });
      }
    });
  });

  describe('score', () => {
    it('rejects negative scores', () => {
      const out = validateDrillSubmission({ ...valid, score: -1 });
      expect(out.ok).toBe(false);
    });

    it('rejects non-finite scores', () => {
      expect(validateDrillSubmission({ ...valid, score: NaN }).ok).toBe(false);
      expect(validateDrillSubmission({ ...valid, score: Infinity }).ok).toBe(false);
    });

    it('rejects scores above the per-level max', () => {
      // Level 1 max is 500; reject 501+
      const out = validateDrillSubmission({ ...valid, level: 1, score: 501 });
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/score/i);
    });

    it('accepts scores at the per-level max', () => {
      expect(validateDrillSubmission({ ...valid, level: 1, score: 500 })).toEqual({ ok: true });
      expect(validateDrillSubmission({ ...valid, level: 5, score: 2000 })).toEqual({ ok: true });
    });
  });

  describe('wordsFound', () => {
    it('rejects negative or non-finite', () => {
      expect(validateDrillSubmission({ ...valid, wordsFound: -1 }).ok).toBe(false);
      expect(validateDrillSubmission({ ...valid, wordsFound: NaN }).ok).toBe(false);
    });

    it('rejects implausibly high word counts (caps at 200)', () => {
      const out = validateDrillSubmission({ ...valid, wordsFound: 201 });
      expect(out.ok).toBe(false);
    });

    it('accepts zero (player ran out of time without finding any)', () => {
      expect(validateDrillSubmission({ ...valid, wordsFound: 0, score: 0 })).toEqual({ ok: true });
    });
  });

  describe('durationSeconds', () => {
    it('rejects non-finite or negative', () => {
      expect(validateDrillSubmission({ ...valid, durationSeconds: NaN }).ok).toBe(false);
      expect(validateDrillSubmission({ ...valid, durationSeconds: -5 }).ok).toBe(false);
    });

    it('rejects sessions shorter than 0.5s per word found (humans cannot type that fast)', () => {
      const out = validateDrillSubmission({ ...valid, wordsFound: 20, durationSeconds: 5 });
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/duration|too fast/i);
    });

    it('accepts plausible WPM (1s per word)', () => {
      const out = validateDrillSubmission({ ...valid, wordsFound: 10, durationSeconds: 10 });
      expect(out.ok).toBe(true);
    });

    it('rejects sessions longer than 10 minutes (drill timers max out at 90s)', () => {
      const out = validateDrillSubmission({ ...valid, durationSeconds: 601 });
      expect(out.ok).toBe(false);
    });
  });
});
