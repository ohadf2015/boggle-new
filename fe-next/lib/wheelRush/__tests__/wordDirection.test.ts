/**
 * Tests for wheelWordDir — the source of truth for the built-word row's
 * text direction in MP Wheel Rush.
 *
 * Bug being fixed: the MP wheel derived direction from the `gameLanguage`
 * prop, which can arrive null at in-game render (the in-game view drops the
 * roomLanguage fallback the waiting view has). When null, languageDir() →
 * 'ltr', so a Hebrew puzzle rendered letters left-to-right — REVERSED versus
 * the daily Word Wheel, whose container inherits dir="rtl" from <html>.
 *
 * Fix: direction follows the ACTUAL letters on screen (Unicode range), not the
 * fragile language prop. Hebrew letters → rtl regardless of the prop; Latin
 * letters → ltr even on a Hebrew UI (preserving cross-language intent: a
 * Hebrew-UI player in an English game must still read words L→R).
 */
import { describe, it, expect } from 'vitest';
import { wheelWordDir } from '../wordDirection';

describe('wheelWordDir', () => {
  it('returns rtl for Hebrew letters even when gameLanguage is null', () => {
    // This is the bug: prop missing, but letters are Hebrew.
    expect(wheelWordDir(['ש', 'ל', 'ו', 'ם'], null)).toBe('rtl');
  });

  it('returns rtl for Hebrew letters when gameLanguage is he', () => {
    expect(wheelWordDir(['ש', 'ל', 'ו', 'ם'], 'he')).toBe('rtl');
  });

  it('returns ltr for Latin letters even when UI is Hebrew (cross-language game)', () => {
    // Hebrew-UI player in an English game — English must read L→R.
    expect(wheelWordDir(['W', 'O', 'R', 'D'], 'he')).toBe('ltr');
  });

  it('returns ltr for Latin letters with English gameLanguage', () => {
    expect(wheelWordDir(['W', 'O', 'R', 'D'], 'en')).toBe('ltr');
  });

  it('accepts a joined string as well as an array', () => {
    expect(wheelWordDir('שלום', null)).toBe('rtl');
    expect(wheelWordDir('WORD', null)).toBe('ltr');
  });

  it('detects a single Hebrew letter mixed anywhere in the set', () => {
    expect(wheelWordDir(['A', 'B', 'ש'], 'en')).toBe('rtl');
  });

  it('falls back to the gameLanguage hint when no letters are present yet (puzzle not loaded)', () => {
    expect(wheelWordDir([], 'he')).toBe('rtl');
    expect(wheelWordDir(null, 'he')).toBe('rtl');
    expect(wheelWordDir(undefined, 'en')).toBe('ltr');
    expect(wheelWordDir([], null)).toBe('ltr');
  });
});
