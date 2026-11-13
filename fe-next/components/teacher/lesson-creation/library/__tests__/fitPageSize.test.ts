import { describe, it, expect } from 'vitest';
import { fitPageSize } from '../useFitPageSize';

describe('fitPageSize', () => {
  it('Given room for three rows of four, Then a page holds twelve cards', () => {
    expect(fitPageSize({ availH: 420, cardH: 128, gap: 12, cols: 4 })).toBe(12);
  });

  it('Given a phone with two columns and room for two rows, Then a page still holds three rows and scrolls', () => {
    expect(fitPageSize({ availH: 300, cardH: 128, gap: 12, cols: 2 })).toBe(6);
  });

  it('Given a short laptop window with room for one row of four, Then a page holds two rows instead of four cards', () => {
    expect(fitPageSize({ availH: 140, cardH: 128, gap: 12, cols: 4 })).toBe(8);
  });

  it('Given a table with room for two rows, Then a page still holds six rows', () => {
    expect(fitPageSize({ availH: 100, cardH: 44, gap: 0, cols: 1 })).toBe(6);
  });

  it('Given a layout that is not measured yet, Then it falls back to the default size', () => {
    expect(fitPageSize({ availH: 0, cardH: 128, gap: 12, cols: 0 }, 12)).toBe(12);
  });

  it('Given an exact fit including gaps, Then the last row is counted', () => {
    expect(fitPageSize({ availH: 128 * 8 + 12 * 7, cardH: 128, gap: 12, cols: 1 })).toBe(8);
  });

  it('Given a one-column phone list with room for two cards, When a minimum is set, Then the page holds the minimum and scrolls', () => {
    expect(fitPageSize({ availH: 300, cardH: 104, gap: 8, cols: 1, minItems: 9 })).toBe(9);
  });

  it('Given several columns and a minimum, Then whole rows cover the minimum', () => {
    expect(fitPageSize({ availH: 300, cardH: 128, gap: 12, cols: 2, minItems: 9 })).toBe(10);
  });
});
