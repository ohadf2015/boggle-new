import { describe, it, expect } from 'vitest';
import { themeEmoji } from '../themeEmoji';

describe('themeEmoji', () => {
  it('maps known themes to a representative emoji', () => {
    expect(themeEmoji('animals')).toBe('🐾');
    expect(themeEmoji('space')).toBe('🚀');
    expect(themeEmoji('food')).toBe('🍕');
  });

  it('falls back to a neutral sparkle for unknown themes', () => {
    expect(themeEmoji('quux-generated-9000')).toBe('✨');
  });

  it('falls back for null/undefined/empty theme', () => {
    expect(themeEmoji(undefined)).toBe('✨');
    expect(themeEmoji(null)).toBe('✨');
    expect(themeEmoji('')).toBe('✨');
  });
});
