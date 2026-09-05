/**
 * Every `teacher.wordDetails.*` key the word editor asks for must exist in
 * every locale.
 *
 * A live smoke run showed literal key paths — `teacher.wordDetails.meanings`,
 * `.prefix`, `.root`, `.rootMeaning`, `.suffix` — as field labels in the MORE
 * panel. Adding a field to the editor and forgetting one locale is invisible
 * in unit tests, because component tests stub `t` to echo its argument: the
 * assertion passes on the key path itself.
 *
 * This test reads the editor sources, collects the keys, and checks them
 * against the real locale files.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

import { MORPHEME_FIELDS } from '../lesson-creation/WordSkillFields';

const LOCALES: Record<string, unknown> = { en, he, es, sv, ja, ru };

const SOURCES = [
  join(__dirname, '..', 'WordListEditor.tsx'),
  join(__dirname, '..', 'lesson-creation', 'WordSkillFields.tsx'),
];

const PREFIX = 'teacher.wordDetails.';

/** Literal `teacher.wordDetails.someKey` occurrences in the editor sources. */
function literalKeys(): string[] {
  const found = new Set<string>();
  for (const file of SOURCES) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/teacher\.wordDetails\.([A-Za-z0-9_]+)/g)) {
      found.add(match[1]);
    }
  }
  return [...found];
}

/**
 * The template-literal call sites, spelled out. `t(`teacher.wordDetails.${field}`)`
 * cannot be read off the source, so the interpolated set is enumerated from the
 * same constant the component maps over.
 */
function interpolatedKeys(): string[] {
  return MORPHEME_FIELDS.flatMap((field) => [field, `${field}Placeholder`]);
}

function lookup(bundle: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
    return undefined;
  }, bundle);
}

describe('teacher.wordDetails keys used by the word editor', () => {
  const keys = [...new Set([...literalKeys(), ...interpolatedKeys()])].sort();

  it('finds the keys the editor actually asks for', () => {
    // Guards the scanner itself: if the regex silently matches nothing, every
    // per-locale assertion below would pass vacuously.
    expect(keys.length).toBeGreaterThan(10);
    expect(keys).toEqual(expect.arrayContaining(['meanings', 'prefix', 'root', 'rootMeaning', 'suffix']));
  });

  for (const [locale, bundle] of Object.entries(LOCALES)) {
    it(`${locale} defines every one of them as a non-empty string`, () => {
      const missing = keys.filter((key) => {
        const value = lookup(bundle, `${PREFIX}${key}`);
        return typeof value !== 'string' || value.trim().length === 0;
      });
      expect(missing, `${locale} is missing ${PREFIX}{${missing.join(', ')}}`).toEqual([]);
    });
  }
});
