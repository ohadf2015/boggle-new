// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  EDU_AUTH_ORIGIN_COOKIE,
  eduAuthOriginFromCookies,
  forgetEduAuthOrigin,
  rememberAuthOrigin,
  withRememberedEduOrigin,
  resolveAuthNext,
} from '../authReturnPath';

const remembered = () => eduAuthOriginFromCookies(document.cookie);

describe('remembered edu sign-in origin', () => {
  beforeEach(() => forgetEduAuthOrigin());

  it.each(['/en/teacher', '/he/student/join?code=ABC', '/en/join/ABC123', '/en/education/access?from=teacher'])(
    'a sign-in started on %s is remembered',
    (path) => {
      rememberAuthOrigin(path);
      expect(remembered()).toBe(path);
    },
  );

  it('a later sign-in from the arcade forgets the edu origin', () => {
    rememberAuthOrigin('/en/teacher');
    rememberAuthOrigin('/en/daily');
    expect(remembered()).toBeNull();
  });

  it('a retry from the callback page keeps the edu origin', () => {
    rememberAuthOrigin('/en/teacher');
    rememberAuthOrigin('/en/auth/callback');
    expect(remembered()).toBe('/en/teacher');
  });

  it('never remembers an arcade page', () => {
    rememberAuthOrigin('/en');
    rememberAuthOrigin('/en/multiplayer');
    expect(document.cookie).not.toContain(EDU_AUTH_ORIGIN_COOKIE);
  });

  it.each([
    `${EDU_AUTH_ORIGIN_COOKIE}=${encodeURIComponent('//evil.example.com/teacher')}`,
    `${EDU_AUTH_ORIGIN_COOKIE}=${encodeURIComponent('https://evil.example.com/en/teacher')}`,
    `${EDU_AUTH_ORIGIN_COOKIE}=${encodeURIComponent('/en/daily')}`,
    `${EDU_AUTH_ORIGIN_COOKIE}=${encodeURIComponent('/en/auth/callback?next=/en/teacher')}`,
    `${EDU_AUTH_ORIGIN_COOKIE}=%E0%A4%A`,
  ])('rejects a tampered or non-edu marker %s', (cookie) => {
    expect(eduAuthOriginFromCookies(`a=1; ${cookie}; b=2`)).toBeNull();
  });
});

describe('withRememberedEduOrigin', () => {
  it.each([null, '', '/', '//evil.example.com'])(
    'no real next (%s) falls back to the remembered edu origin',
    (next) => expect(withRememberedEduOrigin(next, '/he/teacher')).toBe('/he/teacher'),
  );

  it.each(['/en', '/he?x=1'])('a sign-in started on the homepage (%s) is not sent to a stale edu marker', (next) => {
    expect(withRememberedEduOrigin(next, '/he/teacher')).toBe(next);
  });

  it('a real next always wins over the marker', () => {
    expect(withRememberedEduOrigin('/en/daily', '/en/teacher')).toBe('/en/daily');
    expect(withRememberedEduOrigin('/ru/student/join', '/en/teacher')).toBe('/ru/student/join');
  });

  it('with no marker a bare sign-in still lands on the homepage, whoever signs in', () => {
    const next = withRememberedEduOrigin(null, null);
    expect(resolveAuthNext(next, 'he')).toEqual({ url: '/he', isDefault: true });
  });

  it('with an edu marker a bare sign-in lands back in edu', () => {
    const next = withRememberedEduOrigin(null, '/he/education/access?from=teacher');
    expect(resolveAuthNext(next, 'he')).toEqual({ url: '/he/education/access?from=teacher', isDefault: false });
  });
});
