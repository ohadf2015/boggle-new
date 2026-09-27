import {
  getChainColor,
  getChainLabel,
  CHAIN_COLOR_PROGRESSION,
} from '../blastChainCounter';

describe('blastChainCounter', () => {
  describe('CHAIN_COLOR_PROGRESSION', () => {
    it('is a readonly array of hex color strings', () => {
      expect(Array.isArray(CHAIN_COLOR_PROGRESSION)).toBe(true);
      expect(CHAIN_COLOR_PROGRESSION.length).toBeGreaterThan(0);
      for (const color of CHAIN_COLOR_PROGRESSION) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('getChainColor', () => {
    it('returns white (#FFFFFF) for chain level 1', () => {
      expect(getChainColor(1)).toBe('#FFFFFF');
    });

    it('returns gold (#FFD700) for chain level 2', () => {
      expect(getChainColor(2)).toBe('#FFD700');
    });

    it('returns orange (#FF6B35) for chain level 3', () => {
      expect(getChainColor(3)).toBe('#FF6B35');
    });

    it('returns "rainbow" for chain level 4', () => {
      expect(getChainColor(4)).toBe('rainbow');
    });

    it('returns "rainbow" for chain level 5 and higher', () => {
      expect(getChainColor(5)).toBe('rainbow');
      expect(getChainColor(10)).toBe('rainbow');
    });

    it('returns white (#FFFFFF) for chain level 0 (no active chain)', () => {
      // Level 0 means no chain — caller should not render but color is still defined
      expect(getChainColor(0)).toBe('#FFFFFF');
    });
  });

  describe('getChainLabel', () => {
    it('returns null for chain level 0', () => {
      expect(getChainLabel(0)).toBeNull();
    });

    it('returns null for negative chain levels', () => {
      expect(getChainLabel(-1)).toBeNull();
    });

    it('returns "CHAIN x1" for chain level 1', () => {
      expect(getChainLabel(1)).toBe('CHAIN x1');
    });

    it('returns "CHAIN x2" for chain level 2', () => {
      expect(getChainLabel(2)).toBe('CHAIN x2');
    });

    it('returns "CHAIN x5" for chain level 5', () => {
      expect(getChainLabel(5)).toBe('CHAIN x5');
    });

    it('formats label consistently for high chain levels', () => {
      expect(getChainLabel(10)).toBe('CHAIN x10');
    });
  });
});
