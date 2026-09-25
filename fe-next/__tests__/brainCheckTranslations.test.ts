/**
 * Brain Check copy must resolve through the real imported bundle in every
 * locale (grep-based audits have been fooled by duplicate top-level keys).
 */
import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

const KEYS = [
  'title', 'subtitle', 'start', 'nextIn', 'howItWorks', 'loadFailed', 'guestPitch', 'rejected',
  'fixedConditions', 'warmupDone', 'needMoreRuns', 'needMoreDays',
  'method.fixed', 'method.warmup', 'method.noise', 'method.transfer',
  'verdict.improved', 'verdict.stable', 'verdict.declined',
];
const get = (o: unknown, path: string) => path.split('.').reduce((a: any, k) => a?.[k], o);

describe.each(Object.entries({ en, he, sv, ja, es, ru }))('%s brain.check', (_l, bundle) => {
  it.each(KEYS)('%s is a non-empty string', (k) => {
    expect(typeof get(bundle, `brain.check.${k}`)).toBe('string');
    expect(get(bundle, `brain.check.${k}`).length).toBeGreaterThan(0);
  });
  it('drills.levelEased / levelLabel exist', () => {
    expect(typeof get(bundle, 'brain.drills.levelEased')).toBe('string');
    expect(get(bundle, 'brain.drills.levelLabel')).toContain('{level}');
  });
});
