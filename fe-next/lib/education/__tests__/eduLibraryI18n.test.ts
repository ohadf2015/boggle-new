import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';
import { GRADE_BANDS, LIBRARY_TOPICS } from '../library';
import { REPORT_REASONS } from '../libraryClient';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const BUNDLES = { en, he, sv, ja, es, ru } as Record<string, Record<string, unknown>>;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : sources(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

const FILES = [
  ...sources(path.join(ROOT, 'components/teacher/lesson-creation')),
  path.join(ROOT, 'components/teacher/LessonBuilder.tsx'),
];

const literalKeys = new Set<string>();
for (const file of FILES) {
  for (const m of readFileSync(file, 'utf8').matchAll(/['"`](eduLibrary\.[A-Za-z0-9_.]+)['"`]/g)) literalKeys.add(m[1]);
}

const dynamicKeys = [
  ...GRADE_BANDS.map((g) => `eduLibrary.grade.${g}`),
  ...LIBRARY_TOPICS.map((tp) => `eduLibrary.topic.${tp}`),
  ...REPORT_REASONS.map((r) => `eduLibrary.report.reason.${r}`),
  ...['digits', 'tooLong', 'wrongScript', 'blocked'].map((i) => `eduLibrary.issue.${i}`),
  ...['all', 'verified', 'teacher'].map((s) => `eduLibrary.discover.source.${s}`),
  ...['chips', 'details'].map((v) => `eduLibrary.editor.view.${v}`),
];

const ALL_KEYS = [...new Set([...literalKeys, ...dynamicKeys])];

function resolve(bundle: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), bundle);
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('eduLibrary translations', () => {
  it('finds the keys the library UI uses', () => {
    expect(literalKeys.size).toBeGreaterThan(80);
  });

  for (const [lang, bundle] of Object.entries(BUNDLES)) {
    it(`${lang}: every key resolves to a non-empty string with the same placeholders as English`, () => {
      const missing: string[] = [];
      const mismatched: string[] = [];
      for (const key of ALL_KEYS) {
        const value = resolve(bundle, key);
        if (typeof value !== 'string' || !value.trim()) {
          missing.push(key);
          continue;
        }
        const reference = resolve(en, key);
        if (typeof reference === 'string' && placeholders(reference).join() !== placeholders(value).join()) mismatched.push(key);
      }
      expect(missing).toEqual([]);
      expect(mismatched).toEqual([]);
    });
  }

  it('is not a copy of English in the other locales', () => {
    for (const lang of ['he', 'sv', 'ja', 'es', 'ru']) {
      expect(resolve(BUNDLES[lang], 'eduLibrary.share.help')).not.toBe(resolve(en, 'eduLibrary.share.help'));
    }
  });
});
