import { describe, it, expect } from 'vitest';
import {
  STYLES,
  STYLE_KEYS,
  DEFAULT_STYLE_KEY,
  getStyle,
  isPlayerStyleKey,
  resolveStyleTrack,
  resolveStyleAccent,
  type PlayerStyleKey,
} from './styles';

describe('player style registry', () => {
  it('default is a first-class style that overrides nothing', () => {
    expect(DEFAULT_STYLE_KEY).toBe('default');
    const def = STYLES.default;
    expect(def.musicFile).toBeNull(); // keeps original in_game track
    expect(def.accentHex).toBeNull(); // keeps base --accent
    expect(def.key).toBe('default');
  });

  it('exposes 12 genres + default = 13 styles, keys match record', () => {
    expect(STYLE_KEYS).toHaveLength(13);
    expect(STYLE_KEYS[0]).toBe('default'); // default leads the picker
    for (const key of STYLE_KEYS) {
      expect(STYLES[key].key).toBe(key);
    }
    expect(Object.keys(STYLES).sort()).toEqual([...STYLE_KEYS].sort());
  });

  it('every non-default style has a real music file, accent, mascot and i18n label key', () => {
    for (const key of STYLE_KEYS) {
      const s = STYLES[key];
      expect(s.labelKey).toBe(`playerStyle.styles.${key}`);
      expect(s.mascot).toMatch(/^\//); // a public asset path
      expect(s.emoji.length).toBeGreaterThan(0);
      if (key !== 'default') {
        expect(s.musicFile).toBe(`/music/styles/${key}.mp3`);
        expect(s.mascot).toBe(`/mascots/styles/${key}.png`);
        expect(s.accentHex).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('accent hexes are distinct across styles', () => {
    const hexes = STYLE_KEYS.map((k) => STYLES[k].accentHex).filter(Boolean) as string[];
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it('getStyle falls back to default for unknown/empty keys', () => {
    expect(getStyle('rock').key).toBe('rock');
    expect(getStyle(undefined).key).toBe('default');
    expect(getStyle(null).key).toBe('default');
    expect(getStyle('not-a-real-style').key).toBe('default');
  });

  it('isPlayerStyleKey is a precise type guard', () => {
    expect(isPlayerStyleKey('jazz')).toBe(true);
    expect(isPlayerStyleKey('default')).toBe(true);
    expect(isPlayerStyleKey('nope')).toBe(false);
    expect(isPlayerStyleKey(null)).toBe(false);
    expect(isPlayerStyleKey(42)).toBe(false);
  });

  describe('resolveStyleTrack', () => {
    const ORIGINAL = '/music/in_game.mp3';
    it('returns the style track when the style overrides music', () => {
      expect(resolveStyleTrack('rock', ORIGINAL)).toBe('/music/styles/rock.mp3');
    });
    it('returns the original track for the default style', () => {
      expect(resolveStyleTrack('default', ORIGINAL)).toBe(ORIGINAL);
    });
    it('returns the original track for unknown styles', () => {
      expect(resolveStyleTrack('xxx' as PlayerStyleKey, ORIGINAL)).toBe(ORIGINAL);
    });
  });

  describe('resolveStyleAccent', () => {
    it('returns the accent hex for a styled key', () => {
      expect(resolveStyleAccent('jazz')).toBe(STYLES.jazz.accentHex);
    });
    it('returns null for default (use base --accent, zero change)', () => {
      expect(resolveStyleAccent('default')).toBeNull();
    });
    it('returns null for unknown keys', () => {
      expect(resolveStyleAccent('xxx')).toBeNull();
    });
  });
});
