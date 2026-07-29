/**
 * TDD for de-rounded Blast milestones (2026-06-07 fun pass).
 *
 * Round milestone numbers (100, 500, 1000) feel engineered. We jitter the
 * TRIGGER thresholds off the round values per game (seeded) so the celebration
 * moments land organically — and the pill shows the player's real score.
 */
import { BLAST_MILESTONE_BASES, jitterMilestones } from '../blastMilestones';

describe('jitterMilestones', () => {
  it('returns one threshold per base', () => {
    expect(jitterMilestones(123)).toHaveLength(BLAST_MILESTONE_BASES.length);
  });

  it('is deterministic for a given seed', () => {
    expect(jitterMilestones(42)).toEqual(jitterMilestones(42));
  });

  it('differs across seeds', () => {
    expect(jitterMilestones(1)).not.toEqual(jitterMilestones(2));
  });

  it('produces strictly increasing thresholds', () => {
    for (let s = 0; s < 200; s++) {
      const m = jitterMilestones(s);
      for (let i = 1; i < m.length; i++) {
        expect(m[i]).toBeGreaterThan(m[i - 1]);
      }
    }
  });

  it('keeps each threshold near its base but OFF the round number most of the time', () => {
    let offRound = 0;
    const total = 200 * BLAST_MILESTONE_BASES.length;
    for (let s = 0; s < 200; s++) {
      const m = jitterMilestones(s);
      m.forEach((v, i) => {
        const base = BLAST_MILESTONE_BASES[i];
        // within a sane band of the base (never wildly off)
        expect(Math.abs(v - base)).toBeLessThanOrEqual(Math.max(20, base * 0.08) + 1);
        if (v !== base) offRound++;
      });
    }
    // The vast majority should be de-rounded.
    expect(offRound / total).toBeGreaterThan(0.8);
  });

  it('returns positive integers', () => {
    for (const v of jitterMilestones(999)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});
