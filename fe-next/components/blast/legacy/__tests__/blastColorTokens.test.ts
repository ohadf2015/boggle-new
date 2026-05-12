import {
  SHATTER_COLORS,
  EXPLOSION_COLORS,
  SCORE_COLORS,
  NEBULA_COLORS,
  BACKGROUND_PARTICLE_COLORS,
  CHAIN_GLOW_COLORS,
  getScoreColor,
} from '../blastColorTokens';

describe('blastColorTokens', () => {
  test('SHATTER_COLORS has all tile types including standard fallback', () => {
    expect(SHATTER_COLORS.gold).toEqual(['#FFD700', '#FFA500', '#FFEC8B']);
    expect(SHATTER_COLORS.bomb).toEqual(['#FF4444', '#CC0000', '#FF6B35']);
    expect(SHATTER_COLORS.rainbow).toEqual(['#FF1493', '#00FFFF', '#FFE135', '#7FFF00', '#A855F7']);
    expect(SHATTER_COLORS.standard).toEqual(['#FFFFFF', '#E0E0E0', '#C0C0C0']);
    expect(Object.keys(SHATTER_COLORS)).toHaveLength(13);
  });

  test('EXPLOSION_COLORS maps all blast explosion types', () => {
    expect(EXPLOSION_COLORS.bomb).toBe('#FF4444');
    expect(EXPLOSION_COLORS.clear).toBe('#FFD700');
    expect(EXPLOSION_COLORS.word).toBe('#00FFFF');
    expect(EXPLOSION_COLORS.cascade).toBe('#FF00FF');
    expect(EXPLOSION_COLORS.mega_blast).toBe('#FF1493');
    expect(Object.keys(EXPLOSION_COLORS)).toHaveLength(11);
  });

  test('SCORE_COLORS defines thresholds in descending order', () => {
    expect(SCORE_COLORS).toEqual([
      { min: 30, color: '#FF1493' },
      { min: 20, color: '#FF6B35' },
      { min: 10, color: '#FFD700' },
      { min: 5, color: '#00FFFF' },
      { min: 0, color: '#FFFFFF' },
    ]);
  });

  test('NEBULA_COLORS maps intensity 0-5', () => {
    expect(Object.keys(NEBULA_COLORS)).toHaveLength(6);
    expect(NEBULA_COLORS[0]).toBe('#0a0a2e');
    expect(NEBULA_COLORS[5]).toBe('#e91e7a');
  });

  test('BACKGROUND_PARTICLE_COLORS has 4 colors', () => {
    expect(BACKGROUND_PARTICLE_COLORS).toEqual(['#00FFFF', '#FF1493', '#FFE135', '#7CFC00']);
  });

  test('CHAIN_GLOW_COLORS maps chain levels 0-3', () => {
    expect(CHAIN_GLOW_COLORS[0]).toBe('none');
    expect(CHAIN_GLOW_COLORS[1]).toBe('#FFD700');
    expect(CHAIN_GLOW_COLORS[2]).toBe('#FF6B35');
    expect(CHAIN_GLOW_COLORS[3]).toBe('#FF1493');
  });

  // BLT-TEST-2 (blast MP audit 2026-04-28): lock getScoreColor against
  // edge inputs (NaN/Infinity/negative) — fallback path must never throw.
  describe('getScoreColor — edge cases', () => {
    test('returns top-tier pink for scores at and above 30', () => {
      expect(getScoreColor(30)).toBe('#FF1493');
      expect(getScoreColor(100)).toBe('#FF1493');
      expect(getScoreColor(9999)).toBe('#FF1493');
    });

    test('respects each threshold boundary exactly', () => {
      expect(getScoreColor(29)).toBe('#FF6B35');
      expect(getScoreColor(20)).toBe('#FF6B35');
      expect(getScoreColor(19)).toBe('#FFD700');
      expect(getScoreColor(10)).toBe('#FFD700');
      expect(getScoreColor(9)).toBe('#00FFFF');
      expect(getScoreColor(5)).toBe('#00FFFF');
      expect(getScoreColor(4)).toBe('#FFFFFF');
      expect(getScoreColor(0)).toBe('#FFFFFF');
    });

    test('fractional scores fall to the lower tier', () => {
      expect(getScoreColor(4.99)).toBe('#FFFFFF');
      expect(getScoreColor(5.0)).toBe('#00FFFF');
      expect(getScoreColor(29.999)).toBe('#FF6B35');
    });

    test('returns white fallback for negative scores without throwing', () => {
      expect(() => getScoreColor(-1)).not.toThrow();
      expect(getScoreColor(-1)).toBe('#FFFFFF');
      expect(getScoreColor(-999)).toBe('#FFFFFF');
    });

    test('returns white fallback for NaN without throwing', () => {
      expect(() => getScoreColor(NaN)).not.toThrow();
      expect(getScoreColor(NaN)).toBe('#FFFFFF');
    });

    test('handles Infinity and -Infinity safely', () => {
      expect(getScoreColor(Infinity)).toBe('#FF1493');
      expect(getScoreColor(-Infinity)).toBe('#FFFFFF');
    });
  });
});
