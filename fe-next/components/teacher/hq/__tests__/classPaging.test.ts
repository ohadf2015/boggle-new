/**
 * The Classes tab never scrolls the page: classes page instead. One per page
 * on a phone, two on a tablet, three on a desktop row.
 */
import { describe, it, expect } from 'vitest';
import { classPageSize, pageSlice } from '../classPaging';

describe('classPageSize', () => {
  it('Given a phone, Then one class per page', () => {
    expect(classPageSize({ sm: false, lg: false })).toBe(1);
  });
  it('Given a tablet, Then two per page', () => {
    expect(classPageSize({ sm: true, lg: false })).toBe(2);
  });
  it('Given a desktop, Then three per page', () => {
    expect(classPageSize({ sm: true, lg: true })).toBe(3);
  });
});

describe('pageSlice', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];
  it('Given page 0 of size 2, Then the first two and 3 pages total', () => {
    expect(pageSlice(items, 0, 2)).toEqual({ items: ['a', 'b'], page: 0, pages: 3 });
  });
  it('Given the last page, Then only what is left', () => {
    expect(pageSlice(items, 2, 2)).toEqual({ items: ['e'], page: 2, pages: 3 });
  });
  it('Given a page past the end (a class was deleted), Then it clamps to the last page', () => {
    expect(pageSlice(items, 9, 2)).toEqual({ items: ['e'], page: 2, pages: 3 });
  });
  it('Given no items, Then one empty page', () => {
    expect(pageSlice([], 0, 3)).toEqual({ items: [], page: 0, pages: 1 });
  });
  it('Given the page holding a given index, Then pageOf finds it', async () => {
    const { pageOf } = await import('../classPaging');
    expect(pageOf(4, 2)).toBe(2);
    expect(pageOf(-1, 2)).toBe(0);
  });
});
