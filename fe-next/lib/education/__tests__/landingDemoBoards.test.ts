import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { findWordOnBoard } from '@/lib/education/eslCefrDemo';
import {
  landingDemoBoard,
  landingHintPath,
  displayDemoWord,
  LANDING_DEMO_LOCALES,
} from '@/lib/education/landingDemoBoards';

const dictPath = (locale: string) => join(process.cwd(), 'public', 'dicts', `${locale}.dict.gz`);
const hasDicts = LANDING_DEMO_LOCALES.every((locale) => existsSync(dictPath(locale)));
const dict = (locale: string) =>
  new Set(
    gunzipSync(readFileSync(dictPath(locale)))
      .toString('utf8')
      .split('\n'),
  );

describe('landing demo boards', () => {
  // public/dicts/*.dict.gz is gitignored and built by scripts/build-dict-assets.ts.
  // CI never runs that script, so membership checks must skip (same pattern as
  // curriculumGrade3En.test.ts). Traceability does not need the files.
  it.each(LANDING_DEMO_LOCALES)('%s: every target is traceable on the board', (locale) => {
    const board = landingDemoBoard(locale);
    expect(board.letters).toHaveLength(16);
    expect(board.targets.length).toBeGreaterThanOrEqual(4);
    for (const target of board.targets) {
      expect(findWordOnBoard(board.letters, target), `${locale}:${target} not traceable`).not.toBeNull();
      expect(target.length).toBeGreaterThanOrEqual(board.minLength);
    }
  });

  it.skipIf(!hasDicts).each(LANDING_DEMO_LOCALES)(
    '%s: every target is a real dictionary word (needs public/dicts/*.dict.gz)',
    (locale) => {
      const board = landingDemoBoard(locale);
      const words = dict(locale);
      for (const target of board.targets) {
        expect(words.has(target.toLowerCase()), `${locale}:${target} not in dictionary`).toBe(true);
      }
    },
  );

  it('deals a Hebrew board to a Hebrew visitor, not the English one', () => {
    const he = landingDemoBoard('he');
    expect(he.letters.join('')).toMatch(/[א-ת]/);
    expect(he.letters.join('')).not.toMatch(/[A-Z]/);
  });

  it('falls back to English for an unknown locale', () => {
    expect(landingDemoBoard('xx')).toEqual(landingDemoBoard('en'));
  });

  it('shows Hebrew words with their final letter forms', () => {
    expect(displayDemoWord('שלומ', 'he')).toBe('שלום');
    expect(displayDemoWord('ספר', 'he')).toBe('ספר');
    expect(displayDemoWord('CAT', 'en')).toBe('CAT');
  });

  it('hints the first unfound target and stops when all are found', () => {
    const { letters, targets } = landingDemoBoard('he');
    const first = landingHintPath('he', []);
    expect(first).toEqual(findWordOnBoard(letters, targets[0]));
    expect(landingHintPath('he', targets)).toBeNull();
  });
});
