/**
 * Sentry JAVASCRIPT-NEXTJS-216 / -21G / -219 — "Translation missing for key:
 * education.landing.pro.<x> in language: en", firing continuously on the live
 * /education page. The whole `education.landing.pro` namespace shipped absent from
 * all six translation files, so the Pro pricing comparison — the only place the
 * $9 tier is explained — rendered raw key paths to every visitor.
 *
 * The key list is DERIVED from the source, not hand-maintained: a hand-copied list
 * is the exact thing that fails to notice the next key someone adds. Every project
 * language is checked, because a key present only in `en` is the same bug for the
 * other five.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { en } from '@/translations/en.js';
import { es } from '@/translations/es.js';
import { he } from '@/translations/he.js';
import { ja } from '@/translations/ja.js';
import { ru } from '@/translations/ru.js';
import { sv } from '@/translations/sv.js';

const ROOT = join(__dirname, '..', '..', '..', '..');

/** Every surface that renders the Pro comparison. */
const SOURCES = [
  join(ROOT, 'components', 'education', 'ProFramingSection.tsx'),
  join(ROOT, 'app', '[locale]', 'teacher', 'upgrade', 'PageClient.tsx'),
];

const USED_KEYS = [
  ...new Set(
    SOURCES.flatMap(
      (file) =>
        readFileSync(file, 'utf8').match(/education\.landing\.pro\.[a-zA-Z0-9_]+/g) ?? []
    )
  ),
].sort();

const LANGUAGES: Record<string, unknown> = { en, es, he, ja, ru, sv };

function resolve(bundle: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      bundle
    );
}

describe('education.landing.pro translations', () => {
  it('finds the keys the Pro comparison actually uses', () => {
    // Guards the derivation itself: a regex that silently matches nothing would make
    // every language assertion below vacuously pass.
    expect(USED_KEYS.length).toBeGreaterThanOrEqual(15);
  });

  it.each(Object.keys(LANGUAGES))('%s defines every key with a non-empty string', (lang) => {
    const missing = USED_KEYS.filter((key) => {
      const value = resolve(LANGUAGES[lang], key);
      return typeof value !== 'string' || value.trim() === '';
    });
    expect(missing).toEqual([]);
  });

  it.each(['classLimit', 'studentLimit', 'whyNow'])(
    'keeps the {count} placeholder in %s so the tier cap is never hardcoded in copy',
    (key) => {
      for (const lang of Object.keys(LANGUAGES)) {
        const value = resolve(LANGUAGES[lang], `education.landing.pro.${key}`);
        expect(value, `${lang}.${key}`).toContain('{count}');
      }
    }
  );
});
