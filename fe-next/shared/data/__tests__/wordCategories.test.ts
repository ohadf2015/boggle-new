import { describe, it, expect } from 'vitest';
import {
  getCategoryForWord,
  getCategoryLabel,
  CATEGORY_EMOJIS,
  ALL_CATEGORIES,
} from '../wordCategories';

describe('getCategoryForWord', () => {
  it('returns "animals" for known animal words', () => {
    expect(getCategoryForWord('cat')).toBe('animals');
    expect(getCategoryForWord('dog')).toBe('animals');
    expect(getCategoryForWord('bird')).toBe('animals');
  });

  it('returns "food" for known food words', () => {
    expect(getCategoryForWord('cake')).toBe('food');
    expect(getCategoryForWord('rice')).toBe('food');
  });

  it('returns null for unknown words', () => {
    expect(getCategoryForWord('xyzzy')).toBeNull();
    expect(getCategoryForWord('qwert')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(getCategoryForWord('CAT')).toBe('animals');
    expect(getCategoryForWord('Cat')).toBe('animals');
  });

  it('returns "nature" for nature words', () => {
    expect(getCategoryForWord('tree')).toBe('nature');
    expect(getCategoryForWord('lake')).toBe('nature');
  });

  it('returns "colors" for color words', () => {
    expect(getCategoryForWord('blue')).toBe('colors');
    expect(getCategoryForWord('pink')).toBe('colors');
  });
});

describe('getCategoryLabel', () => {
  it('returns English label for animals category', () => {
    expect(getCategoryLabel('animals', 'en')).toBe('animal');
  });

  it('returns English label for food category', () => {
    expect(getCategoryLabel('food', 'en')).toBe('food item');
  });

  it('returns fallback for unknown category', () => {
    expect(getCategoryLabel('unknown', 'en')).toBe('word');
  });

  it('returns Hebrew label for animals', () => {
    const label = getCategoryLabel('animals', 'he');
    expect(label).toBeTruthy();
    expect(label).not.toBe('animal'); // Should be Hebrew, not English
  });
});

describe('ALL_CATEGORIES', () => {
  it('has exactly 10 categories', () => {
    expect(ALL_CATEGORIES).toHaveLength(10);
  });

  it('includes all required categories', () => {
    const expected = [
      'animals', 'food', 'nature', 'objects', 'actions',
      'colors', 'body', 'clothes', 'home', 'weather',
    ];
    for (const cat of expected) {
      expect(ALL_CATEGORIES).toContain(cat);
    }
  });
});

describe('CATEGORY_EMOJIS', () => {
  it('has an emoji for every category', () => {
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_EMOJIS[cat]).toBeTruthy();
    }
  });

  it('maps animals to paw emoji', () => {
    expect(CATEGORY_EMOJIS.animals).toBe('\uD83D\uDC3E'); // 🐾
  });
});
