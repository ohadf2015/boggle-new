import { describe, it, expect, beforeEach } from 'vitest';
import {
  CHECKOUT_ORIGIN_KEY,
  CHECKOUT_ORIGIN_TTL_MS,
  forgetCheckoutOriginAwayFrom,
  rememberCheckoutOrigin,
  takeCheckoutOrigin,
} from '../checkoutReturn';

const REPORT = '/he/teacher/reports?classroomId=c-1';
const NOW = 1_800_000_000_000;

describe('checkout origin (client-side return to the page checkout started on)', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns a report the teacher started checkout on, once', () => {
    rememberCheckoutOrigin(sessionStorage, REPORT, NOW);
    expect(takeCheckoutOrigin(sessionStorage, { locale: 'he', currentPath: '/he/teacher', now: NOW + 60_000 })).toBe(REPORT);
    expect(sessionStorage.getItem(CHECKOUT_ORIGIN_KEY)).toBeNull();
    expect(takeCheckoutOrigin(sessionStorage, { locale: 'he', currentPath: '/he/teacher', now: NOW + 61_000 })).toBeNull();
  });

  it('does nothing when the teacher already landed on that page', () => {
    rememberCheckoutOrigin(sessionStorage, REPORT, NOW);
    expect(takeCheckoutOrigin(sessionStorage, { locale: 'he', currentPath: REPORT, now: NOW })).toBeNull();
    expect(sessionStorage.getItem(CHECKOUT_ORIGIN_KEY)).toBeNull();
  });

  it('forgets an origin older than the TTL', () => {
    rememberCheckoutOrigin(sessionStorage, REPORT, NOW);
    expect(
      takeCheckoutOrigin(sessionStorage, { locale: 'he', currentPath: '/he/teacher', now: NOW + CHECKOUT_ORIGIN_TTL_MS + 1 }),
    ).toBeNull();
  });

  it.each([
    ['the plans page', '/en/teacher/upgrade'],
    ['a foreign origin', 'https://evil.example/en/teacher/reports'],
    ['a non-teacher page', '/en/admin'],
    ['protocol-relative', '//evil.example/en/teacher'],
  ])('refuses %s', (_label, path) => {
    rememberCheckoutOrigin(sessionStorage, path, NOW);
    expect(takeCheckoutOrigin(sessionStorage, { locale: 'en', currentPath: '/en/teacher', now: NOW })).toBeNull();
  });

  it('refuses a tampered storage value', () => {
    sessionStorage.setItem(CHECKOUT_ORIGIN_KEY, '{"path":"//evil.example","at":1}');
    expect(takeCheckoutOrigin(sessionStorage, { locale: 'en', currentPath: '/en/teacher', now: NOW })).toBeNull();
    sessionStorage.setItem(CHECKOUT_ORIGIN_KEY, 'not json');
    expect(takeCheckoutOrigin(sessionStorage, { locale: 'en', currentPath: '/en/teacher', now: NOW })).toBeNull();
  });

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
    };
    expect(() => rememberCheckoutOrigin(broken, REPORT, NOW)).not.toThrow();
    expect(takeCheckoutOrigin(broken, { locale: 'he', currentPath: '/he/teacher', now: NOW })).toBeNull();
  });
});

describe('an abandoned checkout origin', () => {
  beforeEach(() => sessionStorage.clear());

  it('is kept while the teacher is still on that page', () => {
    rememberCheckoutOrigin(sessionStorage, REPORT, NOW);
    forgetCheckoutOriginAwayFrom(sessionStorage, '/he/teacher/reports');
    expect(sessionStorage.getItem(CHECKOUT_ORIGIN_KEY)).not.toBeNull();
  });

  it('is dropped once the teacher moves to another page, so a later checkout is not sent back', () => {
    rememberCheckoutOrigin(sessionStorage, REPORT, NOW);
    forgetCheckoutOriginAwayFrom(sessionStorage, '/he/teacher/upgrade');
    expect(sessionStorage.getItem(CHECKOUT_ORIGIN_KEY)).toBeNull();
  });
});
