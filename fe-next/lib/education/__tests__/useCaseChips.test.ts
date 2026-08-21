import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { USE_CASE_CHIPS, USE_CASE_CHIP_KEYS, isChipEcho, normalizeUseCase } from '../useCaseChips';

const LOCALES = ['en', 'es', 'he', 'ja', 'ru', 'sv'];

/**
 * USE_CASE_CHIPS is a copy of the form's example chips. If someone reworded a chip in
 * translations/ and this list went stale, the admin panel would quietly start counting
 * that chip's echoes as free-written teacher reasons — the exact conflation the module
 * exists to prevent. So compare against the translation files themselves.
 *
 * Read as text rather than imported: these modules are ~11k lines each and the values
 * are all we need.
 */
function chipsFromTranslations(locale: string): string[] {
  const src = readFileSync(join(process.cwd(), 'translations', `${locale}.js`), 'utf8');
  return USE_CASE_CHIP_KEYS.map((key) => {
    const m = src.match(new RegExp(`"${key}":\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    if (!m) throw new Error(`${locale}.js has no education.access.${key}`);
    return JSON.parse(`"${m[1]}"`) as string;
  });
}

describe('USE_CASE_CHIPS mirrors the access-request form', () => {
  it.each(LOCALES)('%s chips are all present in the list', (locale) => {
    for (const chip of chipsFromTranslations(locale)) {
      expect(USE_CASE_CHIPS).toContain(chip);
    }
  });

  it('has no entry that no locale offers any more', () => {
    const live = new Set(LOCALES.flatMap(chipsFromTranslations));
    expect(USE_CASE_CHIPS.filter((c) => !live.has(c))).toEqual([]);
  });
});

describe('isChipEcho', () => {
  it('matches a chip regardless of case, padding and trailing period', () => {
    expect(isChipEcho('  weekly vocabulary battles with my class. ')).toBe(true);
  });

  it('matches a non-English chip', () => {
    expect(isChipEcho('Tareas que mis estudiantes disfrutan de verdad')).toBe(true);
  });

  it('leaves a teacher’s own words alone', () => {
    // Real 2026-08-21 rows: free text that merely resembles a chip must not be folded in.
    expect(isChipEcho('For vocabulary practice with my 2nd to 6th graders.')).toBe(false);
    expect(isChipEcho('weekly vocabulary battles')).toBe(false);
  });

  it('does not treat blank as a chip', () => {
    expect(isChipEcho('')).toBe(false);
    expect(isChipEcho(null)).toBe(false);
  });
});

describe('normalizeUseCase', () => {
  it('groups the same answer submitted twice with different padding', () => {
    expect(normalizeUseCase('For puzzles, quizzes, live games ')).toBe(
      normalizeUseCase('for puzzles, quizzes, live games'),
    );
  });
});
