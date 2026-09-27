import { getComboEffectTier, type ComboEffectTier } from '../comboEffects';

describe('comboEffects', () => {
  describe('getComboEffectTier', () => {
    it('returns "none" tier for combo 0', () => {
      const tier = getComboEffectTier(0);
      expect(tier.name).toBe('none');
      expect(tier.particleCount).toBe(0);
      expect(tier.shakeIntensity).toBe(0);
    });

    it('returns "none" tier for combo 1-2', () => {
      expect(getComboEffectTier(1).name).toBe('none');
      expect(getComboEffectTier(2).name).toBe('none');
    });

    it('returns "glow" tier for combo 3-4', () => {
      const tier3 = getComboEffectTier(3);
      expect(tier3.name).toBe('glow');
      expect(tier3.glowColor).toBeDefined();
      expect(tier3.particleCount).toBe(0);
      expect(tier3.soundKey).toBe('combo_glow');

      expect(getComboEffectTier(4).name).toBe('glow');
    });

    it('returns "particles" tier for combo 5-6', () => {
      const tier5 = getComboEffectTier(5);
      expect(tier5.name).toBe('particles');
      expect(tier5.particleCount).toBeGreaterThan(0);
      expect(tier5.soundKey).toBe('combo_particles');

      expect(getComboEffectTier(6).name).toBe('particles');
    });

    it('returns "shake" tier for combo 7-9', () => {
      const tier7 = getComboEffectTier(7);
      expect(tier7.name).toBe('shake');
      expect(tier7.shakeIntensity).toBeGreaterThan(0);
      expect(tier7.soundKey).toBe('combo_shake');

      expect(getComboEffectTier(8).name).toBe('shake');
      expect(getComboEffectTier(9).name).toBe('shake');
    });

    it('returns "fire" tier for combo 10+', () => {
      const tier10 = getComboEffectTier(10);
      expect(tier10.name).toBe('fire');
      expect(tier10.glowColor).toBeDefined();
      expect(tier10.particleCount).toBeGreaterThan(0);
      expect(tier10.shakeIntensity).toBeGreaterThan(0);
      expect(tier10.soundKey).toBe('combo_fire');
    });

    it('returns "fire" tier for very high combos', () => {
      expect(getComboEffectTier(15).name).toBe('fire');
      expect(getComboEffectTier(20).name).toBe('fire');
    });
  });
});
