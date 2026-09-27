/**
 * The keyboard sizes every letter key off ONE column width so a 6-key row
 * renders keys identical to a 10-key row (commit 96a7f46f3, "uniform key widths
 * across all keyboard rows"). That budget has to include the submit and
 * backspace keys, which share the LAST row with letters.
 *
 * Dividing by the longest row alone over-subscribes the last row whenever
 * lastRowLetters + action keys exceeds it. Letters carry flex-shrink while the
 * action keys hold a min-width, so the letters silently give up the difference
 * and the bottom row renders narrower than the rest — the exact property the
 * uniform-width work set out to guarantee.
 *
 * Hebrew is the locale this actually breaks (rows 6/8/8: the last row is
 * already as long as the longest), and Hebrew is the locale with real players.
 */
import { describe, it, expect } from 'vitest';
import { getKeyboardRows, letterColumnCount, backspaceRowIndex } from '../keyboard';

describe('letterColumnCount', () => {
  it('uses the longest row when the last row has room for the action keys', () => {
    // QWERTY: longest 10, last row 7 letters + 3 action columns = 10 → no change.
    expect(letterColumnCount(getKeyboardRows('en'))).toBe(10);
  });

  it('uses the longest row for Russian, which also fits exactly', () => {
    // ЙЦУКЕН: longest 12, last row 9 + 3 = 12.
    expect(letterColumnCount(getKeyboardRows('ru'))).toBe(12);
  });

  it('moves Hebrew backspace to the short top row instead of widening every key', () => {
    // Hebrew rows are 6/8/8 — the last row is already the longest. Budgeting
    // both action keys onto it (8 + 3 = 11 columns) shrank EVERY key to 1/11
    // and left the 6-key top row floating in dead space. Backspace sits on the
    // top row instead (top-right, like a physical Hebrew keyboard): rows become
    // 6+1.5 / 8 / 8+1.5, so the budget is 9.5 and keys are ~16% wider.
    const rows = getKeyboardRows('he');
    expect(backspaceRowIndex(rows)).toBe(0);
    expect(letterColumnCount(rows)).toBe(9.5);
  });

  it('keeps backspace on the last row when it fits (en, ru)', () => {
    expect(backspaceRowIndex(getKeyboardRows('en'))).toBe(2);
    expect(backspaceRowIndex(getKeyboardRows('ru'))).toBe(2);
  });

  it('never returns fewer columns than the longest row', () => {
    for (const locale of ['en', 'he', 'ru', 'es', 'sv']) {
      const rows = getKeyboardRows(locale);
      expect(letterColumnCount(rows)).toBeGreaterThanOrEqual(Math.max(...rows.map((r) => r.length)));
    }
  });

  it('is safe on degenerate input', () => {
    expect(letterColumnCount([])).toBeGreaterThan(0);
    expect(letterColumnCount([[]])).toBeGreaterThan(0);
  });
});
