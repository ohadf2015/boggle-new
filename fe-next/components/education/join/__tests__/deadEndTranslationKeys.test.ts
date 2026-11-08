import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { starterPracticePack } from '../starterPracticePack';

const LOCALES: Record<string, unknown> = { en, he, es, sv, ja, ru };
const ROOT = path.resolve(__dirname, '../../../..');
const FILES = [
  'components/education/ClassroomGameEndedState.tsx',
  'app/[locale]/education/live/EduLiveNoRoom.tsx',
  'app/[locale]/join/practice/PracticeClient.tsx',
  'components/education/join/DeadEndPracticeLink.tsx',
];

const lookup = (tree: unknown, key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree);

describe('dead-end screens resolve every key natively in all six locales', () => {
  const keys = new Set<string>();
  for (const f of FILES) {
    for (const m of readFileSync(path.join(ROOT, f), 'utf8').matchAll(/t\('((?:education|eduLiveRoom)\.[\w.]+)'/g)) keys.add(m[1]);
  }
  for (const loc of Object.keys(LOCALES)) keys.add(starterPracticePack(loc).nameKey);

  it('finds the keys', () => {
    expect(keys.has('education.student.deadEnd.practiceCta')).toBe(true);
  });

  it('every key is a string in every locale, and non-English copy is not the English text', () => {
    const problems: string[] = [];
    for (const key of keys) {
      const english = lookup(en, key);
      for (const [loc, tree] of Object.entries(LOCALES)) {
        const v = lookup(tree, key);
        if (typeof v !== 'string') problems.push(`${loc}: ${key} missing`);
        else if (loc !== 'en' && key.includes('deadEnd') && v === english) problems.push(`${loc}: ${key} still English`);
      }
    }
    expect(problems).toEqual([]);
  });
});
