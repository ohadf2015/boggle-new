import { describe, expect, it } from 'vitest';
import {
  countryFromRequestHeaders,
  decideAttributionWrite,
  emailSignupNeedsCatchup,
  signupMethod,
} from '../signupAttributionApply';

const EMPTY = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  referrer: null,
  landing_path: null,
  signup_surface: null,
  language: null,
  country_code: null,
  user_role: 'student',
  is_test_account: false,
};

describe('decideAttributionWrite', () => {
  it('writes empty columns and emits when this request wins signup_surface', () => {
    const d = decideAttributionWrite({
      profile: EMPTY,
      incoming: { signup_surface: 'header_or_menu', utm_source: 'google', language: 'en' },
      user: { app_metadata: { provider: 'google' } },
    });
    expect(d.update).toEqual({ signup_surface: 'header_or_menu', utm_source: 'google', language: 'en' });
    expect(d.emit).toBe(true);
    expect(d.method).toBe('google');
    expect(d.source).toBe('header_or_menu');
  });

  it('does not overwrite a non-null column and does not re-emit a Google signup', () => {
    const d = decideAttributionWrite({
      profile: { ...EMPTY, signup_surface: 'header_or_menu', utm_source: 'tiktok' },
      incoming: { signup_surface: 'results_inline', utm_source: 'google', referrer: 'google.com' },
      user: { app_metadata: { provider: 'google' } },
    });
    expect(d.update).toEqual({ referrer: 'google.com' });
    expect(d.emit).toBe(false);
  });

  it('emits the email catch-up when the trigger already wrote the surface', () => {
    const user = {
      app_metadata: { provider: 'email' },
      user_metadata: { signup_surface: 'edu_access', intended_role: 'teacher' },
    };
    const d = decideAttributionWrite({
      profile: { ...EMPTY, signup_surface: 'edu_access', landing_path: '/en/education' },
      incoming: { signup_surface: 'edu_access', language: 'nl' },
      user,
    });
    expect(d.update.signup_surface).toBeUndefined();
    expect(d.update.language).toBe('nl');
    expect(d.update.user_role).toBe('teacher');
    expect(d.emit).toBe(true);
    expect(d.method).toBe('email');
    expect(d.source).toBe('edu_access');
    expect(emailSignupNeedsCatchup(user)).toBe(true);
  });

  it('does not catch up an old account or one that already emitted', () => {
    expect(emailSignupNeedsCatchup({ app_metadata: { provider: 'email' }, user_metadata: {} })).toBe(false);
    const user = {
      app_metadata: { provider: 'email' },
      user_metadata: { signup_surface: 'header_or_menu', signup_completed_emitted: true },
    };
    const d = decideAttributionWrite({
      profile: { ...EMPTY, signup_surface: 'header_or_menu' },
      incoming: {},
      user,
    });
    expect(d.emit).toBe(false);
    expect(d.update).toEqual({});
  });

  it('never demotes a teacher and never trusts a non-teacher metadata role', () => {
    const teacher = decideAttributionWrite({
      profile: { ...EMPTY, user_role: 'teacher' },
      incoming: {},
      user: { user_metadata: { intended_role: 'teacher' } },
    });
    expect(teacher.update.user_role).toBeUndefined();
    const student = decideAttributionWrite({
      profile: EMPTY,
      incoming: {},
      user: { user_metadata: { intended_role: 'student' } },
    });
    expect(student.update.user_role).toBeUndefined();
  });

  it('reads a country from CDN headers and ignores XX', () => {
    expect(countryFromRequestHeaders({ headers: { get: (n) => (n === 'cf-ipcountry' ? 'nl' : null) } })).toBe('NL');
    expect(countryFromRequestHeaders({ headers: { get: () => 'XX' } })).toBeNull();
    expect(signupMethod({ identities: [{ provider: 'google' }] })).toBe('google');
  });
});
