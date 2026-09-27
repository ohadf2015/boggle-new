import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { pickLandingMessages } from '../pickLandingMessages';
import { LANDING_NAMESPACES, LANDING_EXTRA_KEYS } from '../landingNamespaces';
import { MODE_META } from '@/lib/landing/modeMeta';

// Sentry JAVASCRIPT-NEXTJS-25A/25B/25C/26P/26Q/26S: the landing first-paint subset
// dropped keys the landing actually renders, so they logged "Translation missing"
// (and painted raw keys) until the full catalogue upgraded in.
const resolve = (root: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>(
    (o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined),
    root,
  );

describe('landing i18n subset covers what landing renders', () => {
  const subset = pickLandingMessages(en as Record<string, unknown>, LANDING_NAMESPACES, LANDING_EXTRA_KEYS);

  const keys = [
    ...Object.values(MODE_META).flatMap((m) => [m.titleKey, m.descKey]),
    'education.nav.forTeachers',
    'education.nav.myClassroom',
  ];

  it.each(keys)('resolves %s', (key) => {
    expect(typeof resolve(subset, key)).toBe('string');
  });
});
