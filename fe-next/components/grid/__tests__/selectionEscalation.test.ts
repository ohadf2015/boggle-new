import { getSelectionEscalation, getEscalationBackground, getEscalationShake, composeEscalationStyle } from '../selectionEscalation';

describe('getSelectionEscalation', () => {
  describe('tier calculation based on word length', () => {
    it('returns tier 0 for 1-2 letter words', () => {
      expect(getSelectionEscalation(0, 1).tier).toBe(0);
      expect(getSelectionEscalation(0, 2).tier).toBe(0);
      expect(getSelectionEscalation(1, 2).tier).toBe(0);
    });

    it('returns tier 1 for 3-4 letter words', () => {
      expect(getSelectionEscalation(0, 3).tier).toBe(1);
      expect(getSelectionEscalation(2, 4).tier).toBe(1);
    });

    it('returns tier 2 for 5-6 letter words', () => {
      expect(getSelectionEscalation(0, 5).tier).toBe(2);
      expect(getSelectionEscalation(5, 6).tier).toBe(2);
    });

    it('returns tier 3 for 7+ letter words', () => {
      expect(getSelectionEscalation(0, 7).tier).toBe(3);
      expect(getSelectionEscalation(6, 9).tier).toBe(3);
    });
  });

  describe('scale caps and escalation', () => {
    it('later tiles have larger scale', () => {
      const first = getSelectionEscalation(0, 5);
      const last = getSelectionEscalation(4, 5);
      expect(last.scale).toBeGreaterThan(first.scale);
    });

    it('scale never exceeds MAX_SCALE (1.15)', () => {
      // Even with 9 letters at high combo, should cap
      const extreme = getSelectionEscalation(8, 9, 5);
      expect(extreme.scale).toBeLessThanOrEqual(1.15);
    });
  });

  describe('liftY caps and escalation', () => {
    it('later tiles lift higher (more negative Y)', () => {
      const first = getSelectionEscalation(0, 5);
      const last = getSelectionEscalation(4, 5);
      expect(last.liftY).toBeLessThan(first.liftY);
    });

    it('liftY never exceeds MIN_LIFT_Y (-5)', () => {
      const extreme = getSelectionEscalation(8, 9, 5);
      expect(extreme.liftY).toBeGreaterThanOrEqual(-5);
    });
  });

  describe('combo level tier shift', () => {
    it('combo 0 keeps natural tier', () => {
      expect(getSelectionEscalation(0, 3, 0).tier).toBe(1);
    });

    it('high combo pushes 3-letter word into higher tier', () => {
      // 3 letters + combo 4 = effectiveLength 5 → tier 2
      expect(getSelectionEscalation(0, 3, 4).tier).toBe(2);
    });

    it('combo pushes 5-letter word into fire tier', () => {
      // 5 letters + combo 4 = effectiveLength 7 → tier 3
      expect(getSelectionEscalation(0, 5, 4).tier).toBe(3);
    });
  });

  describe('combo intensity amplification (within-tier compounding)', () => {
    it('same tier but higher combo produces larger glow radius', () => {
      // Both are tier 1 (3 letters), but combo 2 should have wider glow
      const noCombo = getSelectionEscalation(2, 3, 0);
      const withCombo = getSelectionEscalation(2, 3, 2);
      // Both tier 1
      expect(noCombo.tier).toBe(1);
      expect(withCombo.tier).toBe(1);
      // Extract glow radius from string: "0 0 Npx ..."
      const radiusNoCombo = parseInt(noCombo.glow.match(/0 0 (\d+)px/)![1]);
      const radiusWithCombo = parseInt(withCombo.glow.match(/0 0 (\d+)px/)![1]);
      expect(radiusWithCombo).toBeGreaterThan(radiusNoCombo);
    });

    it('higher combo produces more particles', () => {
      const noCombo = getSelectionEscalation(2, 5, 0);
      const highCombo = getSelectionEscalation(2, 5, 4);
      expect(highCombo.particleCount).toBeGreaterThan(noCombo.particleCount);
    });

    it('higher combo produces larger particles', () => {
      const noCombo = getSelectionEscalation(2, 5, 0);
      const highCombo = getSelectionEscalation(2, 5, 4);
      expect(highCombo.particleSize).toBeGreaterThan(noCombo.particleSize);
    });

    it('higher combo increases particle distance', () => {
      const noCombo = getSelectionEscalation(2, 5, 0);
      const highCombo = getSelectionEscalation(2, 5, 4);
      expect(highCombo.particleDistance).toBeGreaterThan(noCombo.particleDistance);
    });
  });

  describe('showBurst logic', () => {
    it('no burst on tier 0', () => {
      expect(getSelectionEscalation(0, 2).showBurst).toBe(false);
    });

    it('burst on later tiles at tier 1', () => {
      expect(getSelectionEscalation(2, 3).showBurst).toBe(true);
    });

    it('no burst on early tiles at tier 1', () => {
      expect(getSelectionEscalation(0, 3).showBurst).toBe(false);
    });

    it('all tiles burst at tier 3', () => {
      expect(getSelectionEscalation(0, 7).showBurst).toBe(true);
    });
  });

  describe('particleColors per tier', () => {
    it('base tier uses warm yellows', () => {
      const esc = getSelectionEscalation(0, 2);
      expect(esc.particleColors).toContain('#FFE135');
    });

    it('momentum tier uses oranges', () => {
      const esc = getSelectionEscalation(0, 3);
      expect(esc.particleColors).toContain('#FF6B35');
    });

    it('hot tier uses pinks', () => {
      const esc = getSelectionEscalation(0, 5);
      expect(esc.particleColors).toContain('#FF1493');
    });

    it('fire tier uses cyan', () => {
      const esc = getSelectionEscalation(0, 7);
      expect(esc.particleColors).toContain('#00FFFF');
    });
  });

  describe('edge cases', () => {
    it('handles selectionIndex 0, totalSelected 0', () => {
      const esc = getSelectionEscalation(0, 0);
      expect(esc.tier).toBe(0);
      expect(esc.scale).toBe(1.05);
    });

    it('handles very high combo level', () => {
      // Combo 10 → comboBoost 5, effectiveLength 6 for 1 letter = tier 2
      const esc = getSelectionEscalation(0, 1, 10);
      expect(esc.tier).toBe(2);
      expect(esc.scale).toBeLessThanOrEqual(1.15);
    });

    it('handles very long word (10 letters)', () => {
      const esc = getSelectionEscalation(9, 10);
      expect(esc.tier).toBe(3);
      expect(esc.scale).toBeLessThanOrEqual(1.15);
      expect(esc.liftY).toBeGreaterThanOrEqual(-5);
    });
  });
});

describe('getEscalationBackground', () => {
  it('returns empty object for tier 0', () => {
    expect(getEscalationBackground(0, 2)).toEqual({});
  });

  it('returns orange gradient for ALL tiles at tier 1', () => {
    // All tiles get the same color — first and last tile alike
    const first = getEscalationBackground(0, 3);
    const last = getEscalationBackground(2, 3);
    expect(first.background).toContain('#FF6B35');
    expect(last.background).toContain('#FF6B35');
    expect(first.background).toBe(last.background);
  });

  it('returns pink gradient for ALL tiles at tier 2', () => {
    const first = getEscalationBackground(0, 5);
    const last = getEscalationBackground(4, 5);
    expect(first.background).toContain('#FF1493');
    expect(first.background).toBe(last.background);
  });

  it('returns rainbow animation for tier 3', () => {
    const bg = getEscalationBackground(0, 7);
    expect(bg.animation).toContain('rainbow-cell');
  });

  it('combo boosts tier in background', () => {
    // 3 letters + combo 4 → tier 2 → pink
    const bg = getEscalationBackground(2, 3, 4);
    expect(bg.background).toContain('#FF1493');
  });
});

describe('getEscalationShake', () => {
  it('returns undefined for tier 0', () => {
    expect(getEscalationShake(2)).toBeUndefined();
  });

  it('returns breathe-1 for tier 1', () => {
    expect(getEscalationShake(3)).toBe('escalation-breathe-1 1.4s ease-in-out infinite');
  });

  it('returns breathe-2 for tier 2', () => {
    expect(getEscalationShake(5)).toBe('escalation-breathe-2 1.0s ease-in-out infinite');
  });

  it('returns breathe-3 for tier 3', () => {
    expect(getEscalationShake(7)).toBe('escalation-breathe-3 0.7s ease-in-out infinite');
  });

  it('combo boosts breathe tier', () => {
    // 3 letters + combo 4 → tier 2 → breathe-2
    expect(getEscalationShake(3, 4)).toBe('escalation-breathe-2 1.0s ease-in-out infinite');
  });
});

describe('composeEscalationStyle', () => {
  // Composes getEscalationBackground + getEscalationShake into the single style
  // object GridCell applies to selected tiles. Replaces the prior inline JSX that
  // called each helper twice (4 calls) per selected cell per render.

  it('returns empty style at tier 0 (no background, no animation)', () => {
    expect(composeEscalationStyle(0, 2, 0, false)).toEqual({});
  });

  it('tier 1 with motion: gradient background + breathe-1 animation', () => {
    const style = composeEscalationStyle(0, 3, 0, false);
    expect(style.background).toContain('#FF6B35');
    expect(style.animation).toBe('escalation-breathe-1 1.4s ease-in-out infinite');
  });

  it('tier 3 with motion: composes rainbow-cell AND breathe-3 animations', () => {
    const style = composeEscalationStyle(0, 7, 0, false);
    expect(style.animation).toContain('rainbow-cell');
    expect(style.animation).toContain('escalation-breathe-3');
  });

  it('reduceMotion drops the breathe animation but keeps background animation', () => {
    // Tier 3 background carries its own rainbow-cell animation; breathe must not be appended.
    const reduced = composeEscalationStyle(0, 7, 0, true);
    expect(reduced.animation).toBe('rainbow-cell 2s ease infinite');
    expect(reduced.animation).not.toContain('escalation-breathe');
  });

  it('reduceMotion at tier 1 yields a background with no animation', () => {
    const reduced = composeEscalationStyle(0, 3, 0, true);
    expect(reduced.background).toContain('#FF6B35');
    expect(reduced.animation).toBeUndefined();
  });

  it('matches the legacy inline composition exactly (motion on)', () => {
    // Parity guard: replicate the old JSX logic and assert equality.
    const idx = 2, total = 5, combo = 1, reduceMotion = false;
    const bg = getEscalationBackground(idx, total, combo);
    const shake = getEscalationShake(total, combo);
    const legacy = {
      ...bg,
      ...(!reduceMotion && shake
        ? { animation: [bg.animation, shake].filter(Boolean).join(', ') }
        : {}),
    };
    expect(composeEscalationStyle(idx, total, combo, reduceMotion)).toEqual(legacy);
  });
});
