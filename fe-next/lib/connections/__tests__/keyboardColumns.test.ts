/**
 * The keyboard sizes every letter key off ONE column width so a 6-key row
 * renders keys identical to a 10-key row. Submit and backspace sit on their own
 * row under the letters, so the letter budget is simply the longest row: no
 * locale has to squeeze action keys in beside its letters (Hebrew's 6/8/8 rows
 * once pushed backspace up to the top row to keep keys from turning into pills).
 */
import { describe, it, expect } from 'vitest';
import { getKeyboardRows, letterColumnCount } from '../keyboard';

describe('letterColumnCount', () => {
  it('is the longest row for every locale', () => {
    expect(letterColumnCount(getKeyboardRows('en'))).toBe(10);
    expect(letterColumnCount(getKeyboardRows('ru'))).toBe(12);
    expect(letterColumnCount(getKeyboardRows('he'))).toBe(8);
  });

  it('is safe on degenerate input', () => {
    expect(letterColumnCount([])).toBeGreaterThan(0);
    expect(letterColumnCount([[]])).toBeGreaterThan(0);
  });
});
