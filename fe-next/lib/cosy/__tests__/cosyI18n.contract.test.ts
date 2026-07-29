/**
 * Locale parity for Cozy / Calm Mode strings: every cosy key must exist as a
 * non-empty string in all 5 locales (the calm cue must never render a raw key,
 * least of all for the elder / calm-seeking audience this mode targets).
 */
import { describe, it, expect } from 'vitest';
import { en } from '../../../translations/en.js';
import { he } from '../../../translations/he.js';
import { sv } from '../../../translations/sv.js';
import { ja } from '../../../translations/ja.js';
import { es } from '../../../translations/es.js';

const LOCALES: Record<string, { cosy?: Record<string, unknown> }> = { en, he, sv, ja, es };
const COSY_KEYS = [
  'wellDone',
  'affirmLovely',
  'affirmNicely',
  'affirmGoodWord',
  'noRush',
] as const;

describe('cosy i18n parity', () => {
  for (const [name, dict] of Object.entries(LOCALES)) {
    for (const key of COSY_KEYS) {
      it(`${name} has a non-empty cosy.${key}`, () => {
        const value = dict.cosy?.[key];
        expect(typeof value).toBe('string');
        expect((value as string).trim().length).toBeGreaterThan(0);
      });
    }
  }
});
