/**
 * Last-round class mood. Pure counts — never invent a mood from zero ratings.
 *
 * great: great-share >= 0.6 and bad is not a majority (bad-share <= 0.5)
 * rough: bad-share >= 0.4
 * otherwise mixed
 */
import { describe, it, expect } from 'vitest';
import { classifyClassRoundMood, type ClassRoundRating } from '../classRoundMood';

function ratings(great: number, ok: number, bad: number): ClassRoundRating[] {
  return [
    ...Array.from({ length: great }, () => 'great' as const),
    ...Array.from({ length: ok }, () => 'ok' as const),
    ...Array.from({ length: bad }, () => 'bad' as const),
  ];
}

describe('classifyClassRoundMood', () => {
  it('hides the line when nobody rated', () => {
    expect(classifyClassRoundMood([])).toEqual({ count: 0, mood: null });
  });

  it('calls the round great when at least 60% said great and bad is not a majority', () => {
    expect(classifyClassRoundMood(ratings(3, 2, 0))).toEqual({ count: 5, mood: 'great' });
    expect(classifyClassRoundMood(ratings(6, 0, 4))).toEqual({ count: 10, mood: 'great' });
  });

  it('does not call it great when great-share is just under 0.6', () => {
    expect(classifyClassRoundMood(ratings(5, 5, 0)).mood).toBe('mixed');
  });

  it('calls the round rough when at least 40% said bad', () => {
    expect(classifyClassRoundMood(ratings(0, 6, 4))).toEqual({ count: 10, mood: 'rough' });
    expect(classifyClassRoundMood(ratings(5, 0, 5)).mood).toBe('rough');
  });

  it('stays mixed when bad is under 40% and great is under 60%', () => {
    expect(classifyClassRoundMood(ratings(1, 6, 3))).toEqual({ count: 10, mood: 'mixed' });
  });

  it('does not call a 60/40 split rough when great already clears the bar', () => {
    // 6/10 great and 4/10 bad: great-share is 0.6, bad is not a majority, so great wins.
    expect(classifyClassRoundMood(ratings(6, 0, 4)).mood).toBe('great');
  });
});
