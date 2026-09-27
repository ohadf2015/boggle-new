/**
 * Every `t()` key the class report renders must resolve in all six locales.
 *
 * The dynamic parity test in `lib/education/__tests__/educationI18nParity`
 * compares locale key SETS, so it cannot catch a block that is identical in
 * all six and simply sits under the WRONG parent — which is exactly how a
 * scripted insert of these keys first landed them under `admin.milogWords`,
 * where six matching locales would still have rendered raw key paths to a
 * teacher. This test walks from the component's side instead: it reads the
 * literal key strings out of the source files and resolves each one.
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
import {
  type PracticeKey,
  type CellState,
} from '../../../../lib/education/classReport';

type Dict = Record<string, unknown>;

const LOCALES: Record<string, Dict> = { en, he, sv, ja, es, ru };

const COMPONENT_DIR = join(process.cwd(), 'components/teacher/report');
const SOURCES = [
  'ClassReportSection.tsx',
  'WordStudentGrid.tsx',
  'WordTrendStrip.tsx',
  'StudentDrillDownPanel.tsx',
];

/** Literal `t('...')` keys under teacher.classReport, from the source itself. */
function literalKeys(): string[] {
  const keys = new Set<string>();
  for (const file of SOURCES) {
    const src = readFileSync(join(COMPONENT_DIR, file), 'utf8');
    for (const m of src.matchAll(/t\(\s*['"](teacher\.classReport\.[A-Za-z0-9_.]+)['"]/g)) {
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

/**
 * Keys built by template — `practice.<key>` in the drill-down panel and every
 * cell state's label. Templated keys are invisible to the literal scan, so
 * they are enumerated from the union types that produce them.
 */
const PRACTICE_KEYS: PracticeKey[] = ['flashcard', 'spelling', 'none', 'absent'];
const CELL_STATES: CellState[] = ['found', 'missed', 'absent'];
const TEMPLATED = [
  ...PRACTICE_KEYS.map((k) => `teacher.classReport.practice.${k}`),
  ...CELL_STATES.map((s) => `teacher.classReport.state.${s}`),
  'teacher.classReport.state.quizFound',
  'teacher.classReport.state.quizMissed',
];

describe('class report i18n contract', () => {
  it('scans a plausible number of literal keys — a broken regex must not pass vacuously', () => {
    expect(literalKeys().length).toBeGreaterThan(10);
  });

  for (const [name, dict] of Object.entries(LOCALES)) {
    it(`resolves every class-report key in ${name}`, () => {
      const unresolved: string[] = [];
      for (const key of [...literalKeys(), ...TEMPLATED]) {
        const value = resolve(dict, key);
        if (typeof value !== 'string' || value.trim() === '') unresolved.push(key);
      }
      expect(unresolved).toEqual([]);
    });

    it(`keeps the report block under teacher, not another parent, in ${name}`, () => {
      expect(resolve(dict, 'teacher.classReport.title')).toBeTypeOf('string');
      expect(resolve(dict, 'teacher.lastGame.mode.vocabQuiz')).toBeTypeOf('string');
      // The scripted insert once mis-anchored to `admin.player.lastGame`.
      expect(resolve(dict, 'admin.milogWords.vocabQuiz')).toBeUndefined();
    });
  }

  it('gives every notes label used by buildNotesText a string in every locale', () => {
    const notesKeys = [
      'title',
      'playedAt',
      'reteach',
      'checkIn',
      'absent',
      'nobodyFound',
      'allFound',
      'everyoneOk',
      'missedBy',
    ].map((k) => `teacher.classReport.notes.${k}`);

    for (const [name, dict] of Object.entries(LOCALES)) {
      for (const key of notesKeys) {
        expect(resolve(dict, key), `${name}.${key}`).toBeTypeOf('string');
      }
    }
  });
});
