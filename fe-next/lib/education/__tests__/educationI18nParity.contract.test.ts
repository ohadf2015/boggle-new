/**
 * Locale parity for the whole education / teacher / student string surface.
 *
 * A key present in `en` but missing from another locale renders the RAW KEY to a
 * real user — and this repo keeps shipping that bug: the classroom-create enum
 * listed 4 languages against 6 locales and 400'd every `es` teacher, and on
 * 2026-08-25 `education.landing.furtherReading.*` was missing from `ru` on a
 * public SEO page.
 *
 * Deliberately DYNAMIC rather than a hand-maintained key list. A hardcoded list
 * is the same antipattern as the enum that caused the original incident: it
 * passes while silently not covering whatever was added last. Comparing key SETS
 * means any future key added to one locale and forgotten in another fails here,
 * with no list to remember to update.
 *
 * `en` is the reference because it is where new copy lands first.
 */
import { describe, it, expect } from 'vitest';
import { en } from '../../../translations/en.js';
import { he } from '../../../translations/he.js';
import { sv } from '../../../translations/sv.js';
import { ja } from '../../../translations/ja.js';
import { es } from '../../../translations/es.js';
import { ru } from '../../../translations/ru.js';

type Dict = Record<string, unknown>;

/** All six shipped locales — see `i18n/config.ts`. */
const OTHER_LOCALES: Record<string, Dict> = { he, sv, ja, es, ru };

/** Subtrees that make up the education product surface. */
const ROOTS = ['education', 'teacher', 'student'] as const;

/** Flatten to dotted leaf paths. Arrays are leaves — order/content is not a parity concern. */
function leafPaths(value: unknown, prefix = '', out: string[] = []): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Dict)) {
      leafPaths(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else if (prefix) {
    out.push(prefix);
  }
  return out;
}

function resolve(root: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Dict)[part];
    return undefined;
  }, root);
}

describe('education i18n locale parity', () => {
  for (const root of ROOTS) {
    const reference = leafPaths((en as Dict)[root]).sort();

    it(`en.${root} has strings to compare against`, () => {
      expect(reference.length).toBeGreaterThan(0);
    });

    for (const [locale, dict] of Object.entries(OTHER_LOCALES)) {
      it(`${locale}.${root} defines every key en.${root} defines`, () => {
        const subtree = (dict[root] ?? {}) as Dict;
        const present = new Set(leafPaths(subtree));
        const missing = reference.filter((path) => !present.has(path));
        // Named in the failure so the fix is copy-paste obvious.
        expect(missing, `${locale} is missing ${missing.length} key(s) under ${root}`).toEqual([]);
      });

      it(`${locale}.${root} has no empty string values`, () => {
        const subtree = (dict[root] ?? {}) as Dict;
        const blank = leafPaths(subtree).filter((path) => {
          const value = resolve(subtree, path);
          return typeof value === 'string' && value.trim().length === 0;
        });
        expect(blank, `${locale} has ${blank.length} blank string(s) under ${root}`).toEqual([]);
      });
    }
  }
});
