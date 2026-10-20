/**
 * Every `teacher.digest.*` key WeeklyEmailReport can render must resolve to a
 * string in all six locales — same contract as WeeklyProgressDigestCard.
 */
import { describe, it, expect } from 'vitest';
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

const src = readFileSync(
  join(process.cwd(), 'components/teacher/digest/WeeklyEmailReport.tsx'),
  'utf8',
);
const keys = [
  ...new Set([...src.matchAll(/['"](teacher\.digest\.[A-Za-z0-9_.]+)['"]/g)].map((m) => m[1])),
];

function resolve(dict: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Dict)[part] : undefined),
    dict,
  );
}

describe('WeeklyEmailReport i18n contract', () => {
  it('finds the keys it is guarding', () => {
    expect(keys).toContain('teacher.digest.emailReportTitle');
    expect(keys).toContain('teacher.digest.emailReportCopy');
  });

  it.each(Object.keys(LOCALES))('every teacher.digest key resolves to a string in %s', (locale) => {
    const missing = keys.filter((k) => typeof resolve(LOCALES[locale], k) !== 'string');
    expect(missing).toEqual([]);
  });

  it('the formatter keys used by weeklyEmailReport resolve in English', () => {
    const formatterSrc = readFileSync(
      join(process.cwd(), 'lib/education/weeklyEmailReport.ts'),
      'utf8',
    );
    const formatterKeys = [
      ...new Set([...formatterSrc.matchAll(/['"](teacher\.digest\.[A-Za-z0-9_.]+)['"]/g)].map((m) => m[1])),
    ];
    const missing = formatterKeys.filter((k) => typeof resolve(en, k) !== 'string');
    expect(missing).toEqual([]);
  });
});
