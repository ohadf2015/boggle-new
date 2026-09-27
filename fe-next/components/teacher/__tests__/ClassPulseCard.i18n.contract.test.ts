/**
 * Every `teacher.pulse.*` key ClassPulseCard can render must resolve in all six
 * locales.
 *
 * Regression (Sentry, /teacher): `teacher.pulse.state.loading` — the card's own
 * loading chip — shipped with no entry in any locale, so every teacher saw the
 * raw key while the class pulse loaded. Labels live in lookup maps
 * (`labelKey: '...'`), so a render test with a mocked t() never noticed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '../../../translations/en.js';
import { he } from '../../../translations/he.js';
import { sv } from '../../../translations/sv.js';
import { ja } from '../../../translations/ja.js';
import { es } from '../../../translations/es.js';
import { ru } from '../../../translations/ru.js';

type Dict = Record<string, unknown>;

const LOCALES: Record<string, Dict> = { en, he, sv, ja, es, ru };

const src = readFileSync(join(process.cwd(), 'components/teacher/ClassPulseCard.tsx'), 'utf8');
const keys = [...new Set([...src.matchAll(/['"](teacher\.pulse\.[A-Za-z0-9_.]+)['"]/g)].map((m) => m[1]))];

function resolve(dict: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Dict)[part] : undefined), dict);
}

describe('ClassPulseCard i18n contract', () => {
  it('finds the keys it is guarding', () => {
    expect(keys).toContain('teacher.pulse.state.loading');
  });

  it.each(Object.keys(LOCALES))('every teacher.pulse key resolves to a string in %s', (locale) => {
    const missing = keys.filter((k) => typeof resolve(LOCALES[locale], k) !== 'string');
    expect(missing).toEqual([]);
  });
});
