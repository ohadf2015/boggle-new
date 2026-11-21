/**
 * Every teacher.digest key ClassroomWeekSection renders must resolve in all six locales.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '../../../../translations/en.js';
import { he } from '../../../../translations/he.js';
import { sv } from '../../../../translations/sv.js';
import { ja } from '../../../../translations/ja.js';
import { es } from '../../../../translations/es.js';
import { ru } from '../../../../translations/ru.js';

type Dict = Record<string, unknown>;
const LOCALES: Record<string, Dict> = { en, he, sv, ja, es, ru };
const src = readFileSync(join(process.cwd(), 'components/teacher/digest/ClassroomWeekSection.tsx'), 'utf8');
const keys = [...new Set([...src.matchAll(/['"](teacher\.digest\.[A-Za-z0-9_.]+)['"]/g)].map((m) => m[1]))];

function resolve(dict: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Dict)[part] : undefined), dict);
}

describe('ClassroomWeekSection i18n contract', () => {
  it('finds the keys it is guarding', () => {
    expect(keys).toContain('teacher.digest.classroomWeekTitle');
    expect(keys).toContain('teacher.digest.classroomWeekNudgeCta');
  });

  it.each(Object.keys(LOCALES))('every classroom-week key resolves to a string in %s', (locale) => {
    const missing = keys.filter((key) => typeof resolve(LOCALES[locale], key) !== 'string');
    expect(missing).toEqual([]);
  });
});
