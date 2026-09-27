import { describe, it, expect } from 'vitest';
import { validateSelection, type ValidationContext } from '../validation';
import { boardWordMinLength } from '../extra-word-check';
import { cellId } from '../cell-id';
import type { BlastLevel } from '../../types';
import { LOCALE_CONFIGS } from '../../locale-config';

// Board reads:  col0 = A,T   col1 = P,O   (row 0 = bottom)
// Row 0 spells "AP" / "PA"; row 1 spells "TO" / "OT"; col0 up-down "AT"/"TA".
// All are real English words, none is a theme word — exactly the accidental
// two-letter noise that made every board offer dozens of stray clears.
const level: BlastLevel = {
  id: 'bonus-min-len',
  levelNumber: 12,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['A', 'T'] },
    { index: 1, tiles: ['P', 'O'] },
  ],
  words: ['AP'],
  resolvableOrder: ['AP'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 12,
};

const ctx: ValidationContext = {
  level,
  config: LOCALE_CONFIGS.en,
  foundWords: new Set(),
  bonusDict: new Set(['TO', 'AT', 'TOP']),
  bonusDictEnabled: true,
  dictionaryCheck: (w) => ['TO', 'AT', 'OT', 'TOP'].includes(w.toUpperCase()),
};

describe('bonus words respect the board word floor', () => {
  it('exposes the same floor the level generator screens with', () => {
    expect(boardWordMinLength(LOCALE_CONFIGS.en)).toBe(4);
    expect(boardWordMinLength(LOCALE_CONFIGS.he)).toBe(4);
    expect(boardWordMinLength(LOCALE_CONFIGS.sv)).toBe(4);
    expect(boardWordMinLength(LOCALE_CONFIGS.es)).toBe(4);
  });

  it('never demands a bonus word longer than the locale can produce', () => {
    // ja tops out at 4-kana words. A flat floor of 4 would mean a bonus word
    // must be exactly as long as the LONGEST possible theme word, which deletes
    // the mechanic for that locale.
    for (const config of Object.values(LOCALE_CONFIGS)) {
      expect(boardWordMinLength(config)).toBeLessThanOrEqual(config.wordLengthRange.max);
      expect(boardWordMinLength(config)).toBeGreaterThan(config.wordLengthRange.min - 1);
    }
    expect(boardWordMinLength(LOCALE_CONFIGS.ja)).toBe(3);
  });

  it('rejects a short bonus word from the curated bonus dictionary', () => {
    // "TO" reading row 1 left-to-right.
    const result = validateSelection([cellId(0, 1), cellId(1, 1)], ctx);
    expect(result.kind).toBe('reject');
    if (result.kind === 'reject') expect(result.reason).toBe('length');
  });

  it('rejects a short bonus word from the free-form dictionary fallback', () => {
    // "AT" reading col 0 bottom-to-top.
    const result = validateSelection([cellId(0, 0), cellId(0, 1)], ctx);
    expect(result.kind).toBe('reject');
    if (result.kind === 'reject') expect(result.reason).toBe('length');
  });

  it('still accepts a theme word shorter than the bonus floor', () => {
    // "AP" is the level's own word — the floor must never block the answer.
    const result = validateSelection([cellId(0, 0), cellId(1, 0)], ctx);
    expect(result.kind).toBe('theme_match');
  });

  it('still accepts a bonus word at or above the floor', () => {
    const longLevel: BlastLevel = {
      ...level,
      columns: [
        { index: 0, tiles: ['S'] },
        { index: 1, tiles: ['T'] },
        { index: 2, tiles: ['O'] },
        { index: 3, tiles: ['P'] },
      ],
      words: ['XYZ'],
      resolvableOrder: ['XYZ'],
    };
    const result = validateSelection(
      [cellId(0, 0), cellId(1, 0), cellId(2, 0), cellId(3, 0)],
      { ...ctx, level: longLevel, dictionaryCheck: (w) => w.toUpperCase() === 'STOP' },
    );
    expect(result.kind).toBe('bonus');
    if (result.kind === 'bonus') expect(result.word.toUpperCase()).toBe('STOP');
  });
});
