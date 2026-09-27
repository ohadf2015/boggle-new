/**
 * Every `teacher.digest.*` key ProgressDigestDashboard can render must resolve
 * in all six locales. Lookup keys in JSX would otherwise ship as raw paths.
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
  join(process.cwd(), 'components/teacher/digest/ProgressDigestDashboard.tsx'),
  'utf8'
);
const keys = [
  ...new Set([...src.matchAll(/['"](teacher\.digest\.[A-Za-z0-9_.]+)['"]/g)].map((m) => m[1])),
];

function resolve(dict: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Dict)[part] : undefined),
    dict
  );
}

describe('ProgressDigestDashboard i18n contract', () => {
  it('finds the keys it is guarding', () => {
    expect(keys).toContain('teacher.digest.title');
    expect(keys).toContain('teacher.digest.proCtaHint');
  });

  it.each(Object.keys(LOCALES))('every teacher.digest key resolves to a string in %s', (locale) => {
    const missing = keys.filter((k) => typeof resolve(LOCALES[locale], k) !== 'string');
    expect(missing).toEqual([]);
  });

  it('does not paste the English title into he/ja/ru', () => {
    const english = resolve(en, 'teacher.digest.title') as string;
    for (const locale of ['he', 'ja', 'ru'] as const) {
      expect(resolve(LOCALES[locale], 'teacher.digest.title')).not.toBe(english);
    }
  });
});
