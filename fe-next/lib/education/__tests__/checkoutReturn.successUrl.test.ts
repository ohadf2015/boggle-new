import { describe, it, expect } from 'vitest';
import {
  buildCheckoutSuccessUrl,
  returnPathFromReferer,
  safeTeacherReturnPath,
} from '../checkoutReturn';

const APP = 'https://www.lexiclash.live';
const REPORT = '/he/teacher/reports?classroomId=3f0c2a9e-1b2c-4d5e-8f90-123456789abc';

describe('safeTeacherReturnPath', () => {
  it('keeps a class report path and its query', () => {
    expect(safeTeacherReturnPath(REPORT, 'he')).toBe(REPORT);
  });

  it('keeps a classroom analytics path', () => {
    expect(safeTeacherReturnPath('/es/teacher/classroom/abc-123/analytics', 'es')).toBe(
      '/es/teacher/classroom/abc-123/analytics',
    );
  });

  it('re-prefixes with the checkout locale, for every shipped locale including es and ru', () => {
    expect(safeTeacherReturnPath('/en/teacher/reports', 'ru')).toBe('/ru/teacher/reports');
    expect(safeTeacherReturnPath('/ru/teacher/reports', 'es')).toBe('/es/teacher/reports');
    expect(safeTeacherReturnPath('/teacher/reports', 'ja')).toBe('/ja/teacher/reports');
  });

  it('drops a stale checkout marker and the hash', () => {
    expect(safeTeacherReturnPath('/en/teacher/reports?classroomId=c1&checkout=success&checkout_id=x#top', 'en')).toBe(
      '/en/teacher/reports?classroomId=c1',
    );
    expect(safeTeacherReturnPath('/en/teacher/reports?checkout=success', 'en')).toBe('/en/teacher/reports');
  });

  it.each([
    ['protocol-relative', '//evil.example/teacher'],
    ['absolute url', 'https://evil.example/en/teacher'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['backslash host', '/\\evil.example/teacher'],
    ['dot segments', '/en/teacher/../../admin'],
    ['encoded slash', '/en/teacher/%2F%2Fevil.example'],
    ['encoded dots', '/en/teacher/%2e%2e/admin'],
    ['not a teacher page', '/en/student/lessons'],
    ['consumer home', '/en'],
    ['teacher prefix trick', '/en/teachers-lounge'],
    ['control character', '/en/teacher/reports\nSet-Cookie: x'],
    ['not a string', 42],
    ['empty', ''],
  ])('refuses a %s', (_label, raw) => {
    expect(safeTeacherReturnPath(raw, 'en')).toBeNull();
  });

  it('refuses an overlong path', () => {
    expect(safeTeacherReturnPath(`/en/teacher/reports?x=${'a'.repeat(600)}`, 'en')).toBeNull();
  });
});

describe('buildCheckoutSuccessUrl', () => {
  it('returns a checkout started from a class report to that report', () => {
    expect(buildCheckoutSuccessUrl({ appUrl: APP, locale: 'he', returnPath: REPORT })).toBe(
      `${APP}${REPORT}&checkout=success&checkout_id={CHECKOUT_ID}`,
    );
  });

  it('keeps the {CHECKOUT_ID} placeholder literal so Polar can substitute it', () => {
    const url = buildCheckoutSuccessUrl({ appUrl: APP, locale: 'en', returnPath: '/en/teacher/reports' });
    expect(url).toContain('checkout_id={CHECKOUT_ID}');
    expect(url).not.toContain('%7B');
  });

  it('falls back to the teacher home when there is no return path', () => {
    expect(buildCheckoutSuccessUrl({ appUrl: APP, locale: 'en' })).toBe(
      `${APP}/en/teacher?checkout=success&checkout_id={CHECKOUT_ID}`,
    );
  });

  it('falls back to the teacher home for a hostile return path', () => {
    expect(buildCheckoutSuccessUrl({ appUrl: APP, locale: 'sv', returnPath: '//evil.example/x' })).toBe(
      `${APP}/sv/teacher?checkout=success&checkout_id={CHECKOUT_ID}`,
    );
  });

  it('uses the default locale for an unknown checkout locale', () => {
    expect(buildCheckoutSuccessUrl({ appUrl: APP, locale: 'xx', returnPath: '/he/teacher/reports' })).toBe(
      `${APP}/en/teacher/reports?checkout=success&checkout_id={CHECKOUT_ID}`,
    );
  });

  it('sends a path under an unknown locale to the teacher home', () => {
    expect(buildCheckoutSuccessUrl({ appUrl: APP, locale: 'en', returnPath: '/xx/teacher/reports' })).toBe(
      `${APP}/en/teacher?checkout=success&checkout_id={CHECKOUT_ID}`,
    );
  });
});

describe('returnPathFromReferer', () => {
  it('takes the path and query of a same-origin teacher page', () => {
    expect(returnPathFromReferer(`${APP}${REPORT}`, APP)).toBe(REPORT);
  });

  it('ignores a referer from another origin', () => {
    expect(returnPathFromReferer(`https://evil.example${REPORT}`, APP)).toBeNull();
  });

  it('ignores a missing or malformed referer', () => {
    expect(returnPathFromReferer(null, APP)).toBeNull();
    expect(returnPathFromReferer('not a url', APP)).toBeNull();
    expect(returnPathFromReferer(`${APP}${REPORT}`, undefined)).toBeNull();
  });
});
