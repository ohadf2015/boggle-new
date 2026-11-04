import { describe, expect, it } from 'vitest';
import {
  correctionApply,
  correctionDecision,
  editDistance,
  joinConfirmRedirect,
  signedInNeedsRecovery,
} from '../unconfirmedJoinEmail';

describe('correctionDecision', () => {
  it('accepts the school-domain typos that stranded real students', () => {
    expect(correctionDecision(
      'a@student.mpac.nsw.edu.au',
      'a@students.mpac.nsw.edu.au',
    )).toBe('ok');
    expect(correctionDecision(
      'a@studnets.mpac.nsw.edu.au',
      'a@students.mpac.nsw.edu.au',
    )).toBe('ok');
  });

  it('refuses a different address, the same address, and garbage', () => {
    expect(correctionDecision('a@school.edu', 'b@other-school.edu')).toBe('not_a_typo');
    expect(correctionDecision('a@school.edu', 'A@School.edu')).toBe('same');
    expect(correctionDecision('not-an-email', 'a@school.edu')).toBe('invalid');
  });

  it('counts a single insertion as distance 1', () => {
    expect(editDistance('student', 'students')).toBe(1);
  });
});

describe('correctionApply', () => {
  it('rewrites only an unconfirmed account', () => {
    expect(correctionApply('ok', { id: 'u1', emailConfirmedAt: null })).toBe('correct');
    expect(correctionApply('ok', { id: 'u1', emailConfirmedAt: '2026-11-03T00:00:00Z' })).toBe('noop');
    expect(correctionApply('ok', null)).toBe('noop');
  });

  it('does not look like a successful correction when the address is not a typo', () => {
    expect(correctionApply('not_a_typo', { id: 'u1', emailConfirmedAt: null })).toBe('not_a_typo');
    expect(correctionApply('same', null)).toBe('invalid');
  });

  it('surfaces a lookup failure instead of pretending the mail went out', () => {
    expect(correctionApply('ok', null, true)).toBe('lookup_failed');
  });
});

describe('signedInNeedsRecovery', () => {
  it('is true only for a real unconfirmed email session', () => {
    expect(signedInNeedsRecovery({ email: 'a@school.edu', email_confirmed_at: null })).toBe(true);
    expect(signedInNeedsRecovery({ email: 'a@school.edu', email_confirmed_at: '2026-01-01' })).toBe(false);
    expect(signedInNeedsRecovery({ email: null, is_anonymous: true })).toBe(false);
    expect(signedInNeedsRecovery(null)).toBe(false);
  });
});

describe('joinConfirmRedirect', () => {
  it('returns the student to the class code and refuses an off-site locale or code', () => {
    expect(joinConfirmRedirect('https://www.lexiclash.live/', 'he', 'AB12CD'))
      .toBe('https://www.lexiclash.live/he/join/AB12CD');
    expect(joinConfirmRedirect('https://www.lexiclash.live', 'https://evil', 'AB12CD'))
      .toBe('https://www.lexiclash.live/en/join/AB12CD');
    expect(joinConfirmRedirect('https://www.lexiclash.live', 'en', '../admin'))
      .toBe('https://www.lexiclash.live/en/auth/callback');
  });
});
