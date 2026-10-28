import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pickLandingMessages } from '@/lib/i18n/pickLandingMessages';
import { LANDING_NAMESPACES, LANDING_EXTRA_KEYS } from '@/lib/i18n/landingNamespaces';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

// /daily/word-wheel is a heavy game path: SSR renders WordWheelChallenge's
// loading phase with the full catalogue while the client hydrates on the slim
// landing subset. A key outside the subset painted as a raw key path on the
// client and threw React #418 (text mismatch) on roughly half of loads.
const ROOT = join(__dirname, '../../..');
const src = readFileSync(join(ROOT, 'components/daily/WordWheelChallenge.tsx'), 'utf8');
const loadingBlock = src.slice(src.indexOf("if (phase === 'loading')"), src.indexOf("if (phase === 'loading')") + 900);
const KEYS = [...loadingBlock.matchAll(/\bt\(\s*['"]([A-Za-z]\w*(?:\.\w+)+)['"]/g)].map((m) => m[1]);

const resolve = (root: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>(
    (o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined),
    root,
  );

const locales = { en, he, sv, ja, es, ru } as Record<string, Record<string, unknown>>;

describe('Word Wheel SSR loading phase hydrates on the slim catalogue', () => {
  it('finds the loading-phase keys it guards', () => {
    expect(KEYS.length).toBeGreaterThan(0);
  });

  describe.each(Object.keys(locales))('%s', (lang) => {
    const full = locales[lang];
    const subset = pickLandingMessages(full, LANDING_NAMESPACES, LANDING_EXTRA_KEYS);

    it.each(KEYS)('%s matches the SSR text', (key) => {
      expect(typeof resolve(subset, key)).toBe('string');
      expect(resolve(subset, key)).toBe(resolve(full, key));
    });
  });
});
