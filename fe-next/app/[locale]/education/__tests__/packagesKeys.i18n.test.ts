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
const SOURCES = [join(ROOT, 'components', 'education', 'EducationPackages.tsx')];

const USED_KEYS = [
  ...new Set(
    SOURCES.flatMap(
      (file) => readFileSync(file, 'utf8').match(/education\.packages\.[a-zA-Z0-9.]+/g) ?? [],
    ),
  ),
  'education.forSchools.form.class_size',
].sort();

const LANGUAGES: Record<string, unknown> = { en, es, he, ja, ru, sv };

function resolve(bundle: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, part) =>
      node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
    bundle,
  );
}

describe('education packages translations', () => {
  it('finds the keys the packages page actually uses', () => {
    expect(USED_KEYS.length).toBeGreaterThanOrEqual(12);
  });

  it.each(Object.keys(LANGUAGES))('%s defines every key with a non-empty string', (lang) => {
    const missing = USED_KEYS.filter((key) => {
      const value = resolve(LANGUAGES[lang], key);
      return typeof value !== 'string' || value.trim() === '';
    });
    expect(missing).toEqual([]);
  });
});
