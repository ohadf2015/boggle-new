/**
 * The Classes tab never scrolls the page: classes page instead. One per page
 * on a phone, two on a tablet, three on a desktop row.
 */
import { describe, it, expect } from 'vitest';
import { CLASS_GRID_QUERIES, classPageSize, pageSlice } from '../classPaging';

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
  // 844x390: sm-wide but only ~300px of content height — one class, laid out
  // wide, is all that fits without scrolling.
  it('Given a phone turned sideways (short landscape), Then one class per page', () => {
    expect(classPageSize({ sm: true, lg: false, short: true })).toBe(1);
  });
});

describe('CLASS_GRID_QUERIES', () => {
  // The desktop sidebar is 240px from lg (1024) up, so at 1024 the content
  // column is ~720px: three cards there were ~220px each and the class code,
  // name and Pro note crushed. Three per row only from xl (1280).
  it('Given the 3-up row, Then it starts at 1280px, not 1024px', () => {
    expect(CLASS_GRID_QUERIES.lg).toBe('(min-width: 1280px)');
  });
  it('Given the 2-up row, Then it starts at the sm breakpoint', () => {
    expect(CLASS_GRID_QUERIES.sm).toBe('(min-width: 640px)');
  });
  it('Given a short landscape screen, Then the query matches the grid\'s landscape variant', () => {
    expect(CLASS_GRID_QUERIES.short).toBe('(orientation: landscape) and (max-height: 500px)');
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
