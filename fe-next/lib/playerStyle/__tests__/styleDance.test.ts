import { describe, it, expect } from 'vitest';
import { getStyleDanceClass, STYLE_DANCE } from '../styleDance';
import { STYLE_KEYS } from '../styles';

describe('getStyleDanceClass', () => {
  it('returns a hero-dance-* class for every registered style', () => {
    for (const key of STYLE_KEYS) {
      expect(getStyleDanceClass(key)).toMatch(/^hero-dance-[a-z0-9-]+$/);
    }
  });

  it('gives each style its OWN genre-suited move (no two styles share a dance)', () => {
    const classes = STYLE_KEYS.map(getStyleDanceClass);
    expect(new Set(classes).size).toBe(STYLE_KEYS.length);
  });

  it('falls back to the gentle bob for an unknown key', () => {
    // @ts-expect-error — exercising the untrusted-input guard
    expect(getStyleDanceClass('nope')).toBe('hero-dance-bob');
  });

  it('maps rock to a headbang and arcade to an 8-bit move (genre fit)', () => {
    expect(getStyleDanceClass('rock')).toBe('hero-dance-headbang');
    expect(getStyleDanceClass('arcade')).toBe('hero-dance-8bit');
  });

  it('exposes a complete record keyed by every style', () => {
    expect(Object.keys(STYLE_DANCE).sort()).toEqual([...STYLE_KEYS].sort());
  });
});
