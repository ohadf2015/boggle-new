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
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

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

  describe('per-locale plural forms', () => {
    const LOCALES = { en, he, es, sv, ja, ru } as Record<string, unknown>;
    const lookup = (tree: unknown, key: string) =>
      key.split('.').reduce<unknown>((n, p) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[p] : undefined), tree);
    const text = (locale: string, ms: number) => {
      const { key } = trialCountdownUnit(statusIn(ms), locale);
      return lookup(LOCALES[locale], key);
    };

    it('Given Russian, When 2, 5 or 21 days remain, Then the unit agrees with the number', () => {
      expect(text('ru', 2 * DAY - HOUR)).toBe('дня осталось');
      expect(text('ru', 5 * DAY)).toBe('дней осталось');
      expect(text('ru', 21 * DAY)).toBe('день остался');
    });

    it('Given Russian, When 1, 2, 5 or 21 hours remain, Then the unit agrees with the number', () => {
      expect(text('ru', HOUR)).toBe('час остался');
      expect(text('ru', 2 * HOUR)).toBe('часа осталось');
      expect(text('ru', 5 * HOUR)).toBe('часов осталось');
      expect(text('ru', 21 * HOUR)).toBe('час остался');
    });

    it('Given English, When 1 or 2 hours remain, Then singular and plural units are kept', () => {
      expect(text('en', HOUR)).toBe('hour left');
      expect(text('en', 2 * HOUR)).toBe('hours left');
    });

    it('Given any of the six locales, When every count from 0 to 30 days or hours renders, Then its unit key exists', () => {
      for (const locale of Object.keys(LOCALES)) {
        for (let n = 0; n <= 30; n++) {
          expect(typeof text(locale, n * DAY + HOUR), `${locale} ${n}d`).toBe('string');
          if (n < 24) expect(typeof text(locale, n * HOUR + 1), `${locale} ${n}h`).toBe('string');
        }
      }
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
