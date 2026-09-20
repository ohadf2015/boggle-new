import { describe, it, expect } from 'vitest';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import { introBeats, worldBackdrop } from '../introBeats';

describe('introBeats', () => {
  it('opens a world with the chapter story beat before the rule', () => {
    // Given the first level of any world
    // When the intro plans its beats
    // Then the story comes first, the rule card second
    expect(introBeats(getPlayLevel(1, 1))).toEqual(['chapter', 'rule']);
    expect(introBeats(getPlayLevel(7, 1))).toEqual(['chapter', 'rule']);
  });

  it('goes straight to the rule card for every later level', () => {
    for (let l = 2; l <= 7; l++) expect(introBeats(getPlayLevel(3, l))).toEqual(['rule']);
  });

  it('maps each world to its own painted backdrop', () => {
    expect(worldBackdrop(1)).toBe('/images/adventure/backgrounds/meadows.webp');
    expect(worldBackdrop(10)).toBe('/images/adventure/backgrounds/throne.webp');
    expect(new Set(Array.from({ length: 10 }, (_, i) => worldBackdrop(i + 1))).size).toBe(10);
  });
});
