import { describe, it, expect } from 'vitest';
import { locales } from '@/i18n/config';
import {
  isEduAuthOrigin,
  nativeOAuthNext,
  nativeOAuthRedirectUrl,
  resolveAuthNext,
  authFailureHref,
} from '../authReturnPath';

describe('isEduAuthOrigin', () => {
  it.each([
    '/en/education',
    '/en/education/access?from=teacher',
    '/en/teacher',
    '/ru/student/join',
    '/he/join/ABC123',
    '/en/education/live?room=ABC',
  ])('treats %s as edu', (p) => expect(isEduAuthOrigin(p)).toBe(true));

  it.each(['/en', '/en/daily', '/en/pricing', '/es/esl-word-games', '/en/multiplayer', '', null])(
    'treats %s as outside edu',
    (p) => expect(isEduAuthOrigin(p)).toBe(false),
  );
});

describe('native sign-in return path', () => {
  it('keeps an edu origin with its query', () => {
    expect(nativeOAuthNext('/en/teacher', '')).toBe('/en/teacher');
    expect(nativeOAuthNext('/ru/student/join', '?code=ABC')).toBe('/ru/student/join?code=ABC');
  });

  it('carries nothing from the arcade, so it still lands on the homepage', () => {
    expect(nativeOAuthNext('/en', '')).toBeNull();
    expect(nativeOAuthNext('/en/daily', '?x=1')).toBeNull();
  });

  it('builds the Android https callback with next', () => {
    expect(nativeOAuthRedirectUrl('android', 'en', '/en/teacher')).toBe(
      'https://www.lexiclash.live/en/auth/callback?from_app=true&next=%2Fen%2Fteacher',
    );
  });

  it('builds the iOS deep link with next', () => {
    expect(nativeOAuthRedirectUrl('ios', 'ru', '/ru/student/join')).toBe(
      'lexiclash://auth/callback?locale=ru&next=%2Fru%2Fstudent%2Fjoin',
    );
  });

  it('leaves arcade redirect URLs exactly as before', () => {
    expect(nativeOAuthRedirectUrl('android', 'en', null)).toBe(
      'https://www.lexiclash.live/en/auth/callback?from_app=true',
    );
    expect(nativeOAuthRedirectUrl('ios', 'en', null)).toBe('lexiclash://auth/callback?locale=en');
  });

  it.each([
    ['/en/teacher', 'en'],
    ['/ru/student/join', 'ru'],
  ])('a native sign-in from %s resolves back to it on the callback', (origin, locale) => {
    const redirect = new URL(nativeOAuthRedirectUrl('android', locale, nativeOAuthNext(origin, '')));
    expect(resolveAuthNext(redirect.searchParams.get('next'), locale)).toEqual({ url: origin, isDefault: false });
  });

  it('a native sign-in from the arcade home resolves to the homepage', () => {
    const redirect = new URL(nativeOAuthRedirectUrl('android', 'en', nativeOAuthNext('/en', '')));
    expect(resolveAuthNext(redirect.searchParams.get('next'), 'en')).toEqual({ url: '/en', isDefault: true });
  });
});

describe('resolveAuthNext', () => {
  it('defaults to the locale home with no next', () => {
    expect(resolveAuthNext(null, 'en')).toEqual({ url: '/en', isDefault: true });
    expect(resolveAuthNext('/', 'he')).toEqual({ url: '/he', isDefault: true });
    expect(resolveAuthNext('/sv', 'sv')).toEqual({ url: '/sv', isDefault: true });
  });

  for (const from of locales) {
    for (const cb of locales) {
      it(`next=/${from}/teacher on a /${cb} callback never doubles the locale`, () => {
        const { url, isDefault } = resolveAuthNext(`/${from}/teacher?from=x`, cb);
        expect(url).toBe(`/${cb}/teacher?from=x`);
        expect(isDefault).toBe(false);
      });
    }
  }

  it('does not mistake a path that begins with a locale code for a locale', () => {
    expect(resolveAuthNext('/en/esl-word-games', 'es').url).toBe('/es/esl-word-games');
    expect(resolveAuthNext('/es', 'en').url).toBe('/en');
    expect(resolveAuthNext('/russian', 'en').url).toBe('/en/russian');
  });

  it.each(['//evil.example.com/x', 'https://evil.example.com', 'javascript:alert(1)', '/\\evil.example.com'])(
    'refuses an off-site next %s',
    (next) => expect(resolveAuthNext(next, 'en')).toEqual({ url: '/en', isDefault: true }),
  );
});

describe('authFailureHref', () => {
  it('returns an edu-originated sign-in to its edu entry', () => {
    expect(authFailureHref('en', '/en/education/access?from=teacher', 'timeout')).toBe(
      '/en/education/access?from=teacher&auth_error=true&reason=timeout',
    );
    expect(authFailureHref('en', '/ru/student/join', 'access_denied')).toBe(
      '/en/student/join?auth_error=true&reason=access_denied',
    );
  });

  it('keeps sending an arcade sign-in home', () => {
    expect(authFailureHref('en', '/en/daily', 'timeout')).toBe('/en?auth_error=true&reason=timeout');
    expect(authFailureHref('he', null)).toBe('/he?auth_error=true');
  });

  it('drops a stale auth_error from the edu path instead of stacking it', () => {
    expect(authFailureHref('en', '/en/teacher?auth_error=true&reason=x')).toBe('/en/teacher?auth_error=true');
  });
});
