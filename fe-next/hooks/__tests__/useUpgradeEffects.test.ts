import { computeUpgradeEffects } from '../useUpgradeEffects';

describe('computeUpgradeEffects', () => {
  it('returns defaults for empty upgrades', () => {
    const effects = computeUpgradeEffects({});
    expect(effects.shuffleUsesPerLevel).toBe(0);
    expect(effects.iceTileReduction).toBe(false);
    expect(effects.specialTileBoost).toBe(0);
    expect(effects.timeFreezeSeconds).toBe(0);
  });

  // ── Word Dynamite shuffle scaling ──
  describe('wordDynamite shuffleUsesPerLevel', () => {
    it('T1 gives 1 shuffle', () => {
      const effects = computeUpgradeEffects({ wordDynamite: 1 });
      expect(effects.shuffleUsesPerLevel).toBe(1);
      expect(effects.canDetonateWords).toBe(false);
    });

    it('T2 gives 2 shuffles', () => {
      const effects = computeUpgradeEffects({ wordDynamite: 2 });
      expect(effects.shuffleUsesPerLevel).toBe(2);
      expect(effects.canDetonateWords).toBe(false);
    });

    it('T3 gives 2 shuffles + canDetonateWords', () => {
      const effects = computeUpgradeEffects({ wordDynamite: 3 });
      expect(effects.shuffleUsesPerLevel).toBe(2);
      expect(effects.canDetonateWords).toBe(true);
    });
  });

  // ── Blast Shield tiered unlocks ──
  describe('blastShield', () => {
    it('T1 enables iceTileReduction', () => {
      const effects = computeUpgradeEffects({ blastShield: 1 });
      expect(effects.iceTileReduction).toBe(true);
      expect(effects.bombTimerInvert).toBe(false);
      expect(effects.scrambleImmunity).toBe(false);
    });

    it('T2 also enables bombTimerInvert', () => {
      const effects = computeUpgradeEffects({ blastShield: 2 });
      expect(effects.iceTileReduction).toBe(true);
      expect(effects.bombTimerInvert).toBe(true);
      expect(effects.scrambleImmunity).toBe(false);
    });

    it('T3 also enables scrambleImmunity', () => {
      const effects = computeUpgradeEffects({ blastShield: 3 });
      expect(effects.iceTileReduction).toBe(true);
      expect(effects.bombTimerInvert).toBe(true);
      expect(effects.scrambleImmunity).toBe(true);
    });
  });

  // ── Gem Detector ──
  describe('gemDetector', () => {
    it('T1 gives 0.2 specialTileBoost', () => {
      const effects = computeUpgradeEffects({ gemDetector: 1 });
      expect(effects.specialTileBoost).toBe(0.2);
      expect(effects.guaranteedGoldTile).toBe(false);
    });

    it('T3 enables guaranteedGoldTile', () => {
      const effects = computeUpgradeEffects({ gemDetector: 3 });
      expect(effects.specialTileBoost).toBe(0.3);
      expect(effects.guaranteedGoldTile).toBe(true);
    });
  });

  // ── Time Freeze ──
  describe('timeFreeze', () => {
    it('T1 gives 5 seconds', () => {
      const effects = computeUpgradeEffects({ timeFreeze: 1 });
      expect(effects.timeFreezeSeconds).toBe(5);
      expect(effects.freezeHighlightsWord).toBe(false);
    });

    it('T2 gives 10 seconds + highlights word', () => {
      const effects = computeUpgradeEffects({ timeFreeze: 2 });
      expect(effects.timeFreezeSeconds).toBe(10);
      expect(effects.freezeHighlightsWord).toBe(true);
    });
  });
});
