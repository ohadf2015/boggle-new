/**
 * The Classes tab never scrolls the page: classes sit in a swipeable carousel instead. One per page
 * on a phone, two on a tablet, three on a desktop row.
 */
import { describe, it, expect } from 'vitest';
import { CLASS_GRID_QUERIES, carouselPage, carouselPages, classPageSize, classesPerView } from '../classPaging';

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

describe('carouselPages', () => {
  it('Given 5 classes, 2 per view, Then 3 pages', () => {
    expect(carouselPages(5, 2)).toBe(3);
  });
  it('Given everything fits, Then one page', () => {
    expect(carouselPages(3, 3)).toBe(1);
    expect(carouselPages(0, 3)).toBe(1);
  });
});

describe('carouselPage', () => {
  it('Given the first card at the start edge, Then that card\'s page', () => {
    expect(carouselPage({ firstIndex: 0, atEnd: false, perView: 2, count: 5 })).toBe(0);
    expect(carouselPage({ firstIndex: 2, atEnd: false, perView: 2, count: 5 })).toBe(1);
  });
  // The browser clamps the last scroll so card 4 of 5 never reaches the start edge.
  it('Given the scroller is clamped at its end, Then the last page even if the first card is mid-page', () => {
    expect(carouselPage({ firstIndex: 3, atEnd: true, perView: 2, count: 5 })).toBe(2);
  });
  it('Given a mid-swipe position between cards, Then the nearest page', () => {
    expect(carouselPage({ firstIndex: 1, atEnd: false, perView: 3, count: 9 })).toBe(0);
    expect(carouselPage({ firstIndex: 2, atEnd: false, perView: 3, count: 9 })).toBe(1);
  });
});

describe('classesPerView', () => {
  it('Given one class on a desktop row, Then it takes half the row, not a narrow third', () => {
    expect(classesPerView({ sm: true, lg: true }, 1)).toBe(2);
  });
  it('Given three classes on a desktop row, Then three per page', () => {
    expect(classesPerView({ sm: true, lg: true }, 3)).toBe(3);
  });
  it('Given a phone, Then always one per page', () => {
    expect(classesPerView({ sm: false, lg: false }, 1)).toBe(1);
    expect(classesPerView({ sm: false, lg: false }, 5)).toBe(1);
  });
});
