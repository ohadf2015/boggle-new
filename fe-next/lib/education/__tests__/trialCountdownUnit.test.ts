/**
 * The trial badge renders a bare number stacked above a bare unit phrase, so the
 * unit string has to carry its own grammatical number — there is no
 * interpolation to agree with. Both consumers (HomeEducationCard's TrialPill and
 * TrialUrgencyBanner) previously inlined the same selection expression, and it
 * had no singular-hour branch at all: the final hour rendered "1" above
 * "hours left" in English, "1" above "часов осталось" in Russian (plural
 * genitive + impersonal verb, where "час остался" is required), and the
 * equivalent plural in es/he/sv.
 *
 * Note `daysLeft` is `Math.ceil(msLeft / DAY_MS)`, so `daysLeft === 1` already
 * means "inside the final 24 hours" — which is why the badge switches to hours
 * there, and why `education.trial.day_left` was never reachable.
 *
 * One function, both consumers, so the two cannot drift.
 */

import { describe, it, expect } from 'vitest';
import { trialCountdownUnit, teacherTrialStatus } from '../trial';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-09-15T12:00:00.000Z');

/** Build a real TrialStatus rather than a hand-made literal. */
function statusIn(ms: number) {
  const s = teacherTrialStatus(new Date(NOW + ms).toISOString(), NOW);
  if (!s) throw new Error('expected a trial status');
  return s;
}

describe('trialCountdownUnit', () => {
  describe('multiple days remaining', () => {
    it('counts whole days with the plural unit', () => {
      expect(trialCountdownUnit(statusIn(5 * DAY))).toEqual({
        key: 'education.trial.days_left',
        count: 5,
      });
    });

    it('uses the plural unit at two days', () => {
      expect(trialCountdownUnit(statusIn(2 * DAY - HOUR))).toEqual({
        key: 'education.trial.days_left',
        count: 2,
      });
    });
  });

  describe('inside the final day — switches to hours', () => {
    it('counts hours with the plural unit', () => {
      expect(trialCountdownUnit(statusIn(10 * HOUR))).toEqual({
        key: 'education.trial.hours_left',
        count: 10,
      });
    });

    it('uses the SINGULAR unit in the final hour', () => {
      expect(trialCountdownUnit(statusIn(HOUR))).toEqual({
        key: 'education.trial.hour_left',
        count: 1,
      });
    });

    it('uses the singular unit for any remainder inside the last hour', () => {
      // Math.ceil → 1 hour left with 20 minutes on the clock.
      expect(trialCountdownUnit(statusIn(20 * 60 * 1000))).toEqual({
        key: 'education.trial.hour_left',
        count: 1,
      });
    });

    it('still uses the plural unit at exactly two hours', () => {
      expect(trialCountdownUnit(statusIn(2 * HOUR))).toEqual({
        key: 'education.trial.hours_left',
        count: 2,
      });
    });
  });

  describe('expired', () => {
    it('reports zero hours rather than a negative count', () => {
      const expired = teacherTrialStatus(new Date(NOW - DAY).toISOString(), NOW);
      expect(expired).not.toBeNull();
      expect(trialCountdownUnit(expired!)).toEqual({
        key: 'education.trial.hours_left',
        count: 0,
      });
    });
  });
});
