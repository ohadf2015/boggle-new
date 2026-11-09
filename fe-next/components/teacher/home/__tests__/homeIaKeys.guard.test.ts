import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

type Tree = { [k: string]: string | Tree };
const BUNDLES = { en, he, sv, ja, es, ru } as unknown as Record<string, Tree>;
const get = (tree: Tree, key: string) => key.split('.').reduce<unknown>((n, p) => (n && typeof n === 'object' ? (n as Tree)[p] : undefined), tree);

const KEYS = [
  'eduShell.home.shareCode',
  'eduShell.home.shareTitle',
  'eduShell.home.seeResults',
  'eduShell.home.allResults',
  'eduShell.setup.starterListHint',
  'eduShell.host.proOptions',
  'teacher.reports.homeworkShortcut',
  'teacher.reports.freeSummary.title',
  'teacher.reports.freeSummary.games',
  'teacher.reports.freeSummary.students',
  'teacher.reports.freeSummary.classes',
  'teacher.reports.freeSummary.hint',
];

const placeholders = (s: string) => [...s.matchAll(/\{\{?\s*(\w+)\s*\}?\}/g)].map((m) => m[1]).sort();

describe('teacher Home, results and lobby keys added for the one-vocabulary pass', () => {
  for (const [lang, bundle] of Object.entries(BUNDLES)) {
    it.each(KEYS)(`${lang} %s is translated with the en placeholders`, (key) => {
      const value = get(bundle, key);
      expect(typeof value).toBe('string');
      expect(placeholders(value as string)).toEqual(placeholders(get(BUNDLES.en, key) as string));
      if (lang !== 'en') expect(value).not.toBe(get(BUNDLES.en, key));
    });
  }

  it('teacher Home strings say "game" and "word list", not lesson, pack or session', () => {
    const home = (en as unknown as Tree).eduShell as Tree;
    const flat = JSON.stringify([home.home, (home.setup as Tree).words]);
    expect(flat).not.toMatch(/\b(lesson|lessons|pack|packs|session|sessions)\b/i);
  });
});
