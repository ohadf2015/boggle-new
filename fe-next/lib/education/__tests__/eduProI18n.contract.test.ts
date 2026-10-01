import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { en } from '../../../translations/en.js';
import { he } from '../../../translations/he.js';
import { sv } from '../../../translations/sv.js';
import { ja } from '../../../translations/ja.js';
import { es } from '../../../translations/es.js';
import { ru } from '../../../translations/ru.js';

const LOCALES: Record<string, unknown> = { en, he, sv, ja, es, ru };
const ROOT = join(__dirname, '../../..');

const USERS = [
  'components/teacher/reports/WordMasteryReport.tsx',
  'components/teacher/reports/MasteryStatCards.tsx',
  'components/teacher/reports/HardestWordsList.tsx',
  'components/teacher/reports/MasteryHeatmap.tsx',
  'components/teacher/reports/MasteryWordCards.tsx',
  'components/teacher/reports/MasteryLockedTeaser.tsx',
  'components/teacher/reports/masteryTones.tsx',
  'components/teacher/reports/MissedPracticeAction.tsx',
  'components/teacher/reports/FullReportDisclosure.tsx',
  'components/teacher/assignments/AssignmentCreatorDueDate.tsx',
  'app/[locale]/teacher/reports/PageClient.tsx',
  'app/[locale]/teacher/upgrade/PageClient.tsx',
];

function resolve(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
    dict,
  );
}

function leaves(node: unknown, prefix: string, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(prefix);
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

const usedKeys = [
  ...new Set(
    USERS.flatMap((rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      return [...src.matchAll(/'(eduPro\.[a-zA-Z.]+)'/g)].map((m) => m[1]);
    }),
  ),
];
const legendKeys = ['solid', 'shaky', 'missed', 'unseen'].map((k) => `eduPro.mastery.legend.${k}`);
const sectionKeys = ['assignments', 'arc', 'digest'].flatMap((k) => [`eduPro.reports.${k}Title`, `eduPro.reports.${k}Hint`]);

describe('eduPro copy contract', () => {
  it('finds the keys it is checking', () => {
    expect(usedKeys.length).toBeGreaterThan(20);
  });

  it.each(Object.keys(LOCALES))('%s resolves every eduPro key the UI renders', (locale) => {
    for (const key of [...usedKeys, ...legendKeys, ...sectionKeys]) {
      const value = resolve(LOCALES[locale], key);
      expect(value, `${locale} is missing ${key}`).toBeTypeOf('string');
      expect((value as string).trim(), `${locale} ${key} is empty`).not.toBe('');
    }
  });

  it('gives every locale the same eduPro key set as English', () => {
    const english = leaves((en as Record<string, unknown>).eduPro, 'eduPro').sort();
    for (const [locale, dict] of Object.entries(LOCALES)) {
      expect(leaves((dict as Record<string, unknown>).eduPro, 'eduPro').sort(), locale).toEqual(english);
    }
  });

  it('translates rather than copying English into he, ja and ru', () => {
    const english = leaves((en as Record<string, unknown>).eduPro, 'eduPro').filter((k) => !k.endsWith('proBadge'));
    for (const locale of ['he', 'ja', 'ru']) {
      for (const key of english) {
        expect(resolve(LOCALES[locale], key), `${locale} ${key} is still English`).not.toBe(resolve(en, key));
      }
    }
  });

  it('keeps interpolation placeholders intact in every locale', () => {
    for (const key of leaves((en as Record<string, unknown>).eduPro, 'eduPro')) {
      const vars = ((resolve(en, key) as string).match(/\{\w+\}/g) ?? []).sort();
      for (const [locale, dict] of Object.entries(LOCALES)) {
        const got = ((resolve(dict, key) as string).match(/\{\w+\}/g) ?? []).sort();
        expect(got, `${locale} ${key}`).toEqual(vars);
      }
    }
  });

  it('names no competitor in the reports digest copy', () => {
    for (const [locale, dict] of Object.entries(LOCALES)) {
      for (const key of ['teacher.digest.unpluggedReteachLiveFoil', 'teacher.digest.scheduleReteachHint']) {
        expect(resolve(dict, key) as string, `${locale} ${key}`).not.toMatch(/kahoot|blooket|gimkit|quizlet/i);
      }
    }
  });
});
