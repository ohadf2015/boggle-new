/**
 * Every ProGate feature must have real copy in every locale.
 *
 * `ProGate` builds its keys dynamically:
 *
 *     t(`teacher.proGate.${feature}.title`)
 *     t(`teacher.proGate.${feature}.body`)
 *
 * NOTHING ELSE IN THE REPO CAN CATCH A MISSING ONE. The locale-parity contract
 * compares key SETS between locales, so a key absent from all six is in perfect
 * parity and passes. A static scan for `t('...')` literals cannot see a template
 * literal at all. That blind spot is why `teacher.proGate.analytics.title` and
 * `.body` rendered as raw dotted key paths, live, on the teacher Assignments
 * screen — the upsell card showed a user the internal name of its own copy.
 *
 * The only way to close it is to iterate the feature list AT RUNTIME, which is
 * why `PRO_FEATURES` is an exported const array and `ProFeature` is derived from
 * it rather than the other way round. A new feature added to that array fails
 * here until its copy exists in all six locales.
 */
import { describe, it, expect } from 'vitest';
import { PRO_FEATURES } from '../ProGate';
import { en } from '../../../translations/en.js';
import { he } from '../../../translations/he.js';
import { sv } from '../../../translations/sv.js';
import { ja } from '../../../translations/ja.js';
import { es } from '../../../translations/es.js';
import { ru } from '../../../translations/ru.js';

const LOCALES: Record<string, unknown> = { en, he, sv, ja, es, ru };

/** Walk a dotted path exactly the way `t()` resolves one. */
function resolve(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, key) =>
      node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined,
    dict
  );
}

describe('ProGate copy contract', () => {
  it('has at least one feature to check', () => {
    // A guard that iterates an empty list is a guard that asserts nothing.
    expect(PRO_FEATURES.length).toBeGreaterThan(0);
  });

  for (const feature of PRO_FEATURES) {
    for (const field of ['title', 'body'] as const) {
      const path = `teacher.proGate.${feature}.${field}`;

      it(`resolves ${path} in every locale`, () => {
        for (const [locale, dict] of Object.entries(LOCALES)) {
          const value = resolve(dict, path);
          expect(value, `${locale} is missing ${path}`).toBeTypeOf('string');
          expect((value as string).trim(), `${locale}'s ${path} is empty`).not.toBe('');
          // The raw key path leaking through as the VALUE is the same bug in a
          // different costume.
          expect((value as string), `${locale}'s ${path} is the key itself`).not.toBe(path);
        }
      });
    }
  }

  it('gives each locale its own words rather than copying English', () => {
    // Pasting the English string into he/ja/ru is how a "translated" key ships
    // untranslated. The CTA sibling is already native in all six.
    for (const feature of PRO_FEATURES) {
      const english = resolve(en, `teacher.proGate.${feature}.title`) as string;
      for (const locale of ['he', 'ja', 'ru'] as const) {
        const value = resolve(LOCALES[locale], `teacher.proGate.${feature}.title`) as string;
        expect(value, `${locale} still shows the English title`).not.toBe(english);
      }
    }
  });
});
