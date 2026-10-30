import { describe, it, expect } from 'vitest';
import { fitPageSize } from '../useFitPageSize';

describe('fitPageSize', () => {
  it('Given room for three rows of four, Then a page holds twelve cards', () => {
    expect(fitPageSize({ availH: 420, cardH: 128, gap: 12, cols: 4 })).toBe(12);
  });

  it('Given a phone with two columns and room for two rows, Then a page holds four', () => {
    expect(fitPageSize({ availH: 300, cardH: 128, gap: 12, cols: 2 })).toBe(4);
  });

  it('Given less height than one card, Then a page still holds one full row', () => {
    expect(fitPageSize({ availH: 40, cardH: 128, gap: 12, cols: 3 })).toBe(3);
  });

  it('Given a layout that is not measured yet, Then it falls back to the default size', () => {
    expect(fitPageSize({ availH: 0, cardH: 128, gap: 12, cols: 0 }, 12)).toBe(12);
  });

  it('Given an exact fit including gaps, Then the last row is counted', () => {
    expect(fitPageSize({ availH: 128 * 3 + 12 * 2, cardH: 128, gap: 12, cols: 1 })).toBe(3);
  });
});
