import { describe, it, expect } from 'vitest';
import { rowsThatFit } from '../rowsThatFit';

describe('rowsThatFit', () => {
  it('Given four 88px rows in a 300px card, Then only the three that fit whole are shown', () => {
    expect(rowsThatFit({ containerPx: 300, contentPx: 352, renderedRows: 4, total: 4 })).toBe(3);
  });

  it('Given the card grows after rows were trimmed, Then the hidden rows come back', () => {
    expect(rowsThatFit({ containerPx: 400, contentPx: 264, renderedRows: 3, total: 4 })).toBe(4);
  });

  it('Given more room than students, Then it never invents rows', () => {
    expect(rowsThatFit({ containerPx: 2000, contentPx: 176, renderedRows: 2, total: 2 })).toBe(2);
  });

  it('Given a card too short for even one row, Then the leader still shows', () => {
    expect(rowsThatFit({ containerPx: 40, contentPx: 88, renderedRows: 1, total: 5 })).toBe(1);
  });

  it('Given nothing measured yet, Then every row is offered', () => {
    expect(rowsThatFit({ containerPx: 0, contentPx: 0, renderedRows: 0, total: 6 })).toBe(6);
  });

  it('Given sub-pixel rounding at an exact fit, Then the last row is kept', () => {
    expect(rowsThatFit({ containerPx: 263.6, contentPx: 264, renderedRows: 3, total: 3 })).toBe(3);
  });
});

describe('rowsThatFit — room for the "+N more" line', () => {
  it('Given every row fits once the overflow line is gone, Then all rows show and no line is reserved', () => {
    expect(rowsThatFit({ containerPx: 260, contentPx: 192, renderedRows: 3, total: 4, overflowLinePx: 32 })).toBe(4);
  });

  it('Given rows must be trimmed, Then the overflow line gets its own room', () => {
    expect(rowsThatFit({ containerPx: 260, contentPx: 192, renderedRows: 3, total: 5, overflowLinePx: 32 })).toBe(3);
  });
});
