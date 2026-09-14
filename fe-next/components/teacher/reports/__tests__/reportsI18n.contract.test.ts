/**
 * Every `t()` key the Pro-gated progress reports render must resolve in all
 * six locales.
 *
 * The class report (components/teacher/report) has had this guard since the
 * mis-anchored-locales incident; the OLDER printable reports
 * (components/teacher/reports) shipped with hardcoded English table headers,
 * "Teacher:" prefixes, "Mastered"/"Practicing" badges and "1h 5m" strings —
 * on the surface we sell Pro from. This walks the same pattern: literal keys
 * read out of the source files, resolved against every locale dictionary.
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

const COMPONENT_DIR = join(process.cwd(), 'components/teacher/reports');
const SOURCES = ['ClassProgressReport.tsx', 'StudentProgressReport.tsx'];

/** Literal `t('...')` keys from the source itself. */
function literalKeys(): string[] {
  const keys = new Set<string>();
  for (const file of SOURCES) {
    const src = readFileSync(join(COMPONENT_DIR, file), 'utf8');
    for (const m of src.matchAll(/t\(\s*['"](teacher\.reports\.[A-Za-z0-9_.]+)['"]/g)) {
      keys.add(m[1]);
    }
    // Quoted keys in lookup maps (e.g. ISSUE_LABEL_KEY) are rendered through
    // t() one indirection later — the literal scan above cannot see them.
    for (const m of src.matchAll(/['"](teacher\.reports\.[A-Za-z0-9_.]+)['"]/g)) {
      keys.add(m[1]);
    }
  }
  return [...keys].sort();
}

function resolve(dict: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Dict)[part];
    return undefined;
  }, dict);
}

describe('progress reports i18n contract', () => {
  it('scans a plausible number of keys — a broken regex must not pass vacuously', () => {
    expect(literalKeys().length).toBeGreaterThan(15);
  });

  for (const [name, dict] of Object.entries(LOCALES)) {
    it(`resolves every progress-report key in ${name}`, () => {
      const unresolved: string[] = [];
      for (const key of literalKeys()) {
        const value = resolve(dict, key);
        if (typeof value !== 'string' || value.trim() === '') unresolved.push(key);
      }
      expect(unresolved).toEqual([]);
    });

    it(`keeps the reports block under teacher, not another parent, in ${name}`, () => {
      expect(resolve(dict, 'teacher.reports.title')).toBeTypeOf('string');
      expect(resolve(dict, 'teacher.reports.mastery.mastered')).toBeTypeOf('string');
      expect(resolve(dict, 'teacher.reports.issue.lowAccuracy')).toBeTypeOf('string');
    });
  }

  it('resolves the shared classroom words key used for performer counts', () => {
    for (const [name, dict] of Object.entries(LOCALES)) {
      expect(resolve(dict, 'education.classroomGame.words'), name).toBeTypeOf('string');
    }
  });
});
