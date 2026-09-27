/**
 * Teacher-chosen Word Hunt target.
 *
 * A teacher picks the hunted word out of their own lesson vocabulary. Word Hunt
 * only serves targets in a fixed length band, so an ineligible pick has to be
 * refused AT PICK TIME with a reason — silently falling back to a random target
 * means the teacher sets "photosynthesis", the class hunts something else, and
 * nobody ever learns why.
 *
 * Shared by the setup UI and the server so the two can't drift: the client
 * disables what the server would reject, and the server re-checks anyway.
 */

import { describe, it, expect } from 'vitest';
import {
  isEligibleHuntTarget,
  eligibleHuntTargets,
  resolveTeacherHuntTarget,
} from './classroomHuntTarget';

describe('isEligibleHuntTarget', () => {
  it('accepts words inside the Word Hunt length band', () => {
    expect(isEligibleHuntTarget('PHOTON')).toBe(true); // 6
    expect(isEligibleHuntTarget('atoms')).toBe(true); // 5
    expect(isEligibleHuntTarget('neutron')).toBe(true); // 7
  });

  it('rejects words the mode can never serve', () => {
    expect(isEligibleHuntTarget('atom')).toBe(false); // 4, below the band
    expect(isEligibleHuntTarget('photosynthesis')).toBe(false); // 14, above
    expect(isEligibleHuntTarget('')).toBe(false);
  });

  it('rejects anything that is not a single plain word', () => {
    expect(isEligibleHuntTarget('solar system')).toBe(false);
    expect(isEligibleHuntTarget('e-mail')).toBe(false);
    expect(isEligibleHuntTarget('  photon  ')).toBe(true); // trims, then accepts
  });
});

describe('eligibleHuntTargets', () => {
  it('keeps only the lesson words a teacher can actually hunt', () => {
    expect(eligibleHuntTargets(['atom', 'photon', 'photosynthesis', 'neutron'])).toEqual([
      'photon',
      'neutron',
    ]);
  });

  it('de-duplicates case-insensitively so the picker shows one chip per word', () => {
    expect(eligibleHuntTargets(['photon', 'PHOTON', 'Photon'])).toEqual(['photon']);
  });

  it('returns an empty list rather than throwing on an empty lesson', () => {
    expect(eligibleHuntTargets([])).toEqual([]);
  });
});

describe('resolveTeacherHuntTarget', () => {
  const vocab = ['atom', 'photon', 'neutron'];

  it('honours a valid teacher pick that is in the lesson', () => {
    expect(resolveTeacherHuntTarget('photon', vocab)).toBe('photon');
  });

  it('matches the pick case-insensitively', () => {
    expect(resolveTeacherHuntTarget('PHOTON', vocab)).toBe('photon');
  });

  it('refuses a pick that is not in the lesson, so a tampered payload cannot inject a word', () => {
    expect(resolveTeacherHuntTarget('banana', vocab)).toBeNull();
  });

  it('refuses an ineligible lesson word instead of quietly serving it', () => {
    expect(resolveTeacherHuntTarget('atom', vocab)).toBeNull();
  });

  it('returns null when the teacher chose random', () => {
    expect(resolveTeacherHuntTarget(undefined, vocab)).toBeNull();
    expect(resolveTeacherHuntTarget('', vocab)).toBeNull();
  });
});
