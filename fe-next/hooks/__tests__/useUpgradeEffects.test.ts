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

  // ── Deep Drill (extra hints per level) ──
  describe('deepDrill', () => {
    it('returns 0 bonusHints for empty upgrades', () => {
      const effects = computeUpgradeEffects({});
      expect(effects.bonusHintsPerLevel).toBe(0);
    });

    it('T1 gives 2 bonus hints', () => {
      const effects = computeUpgradeEffects({ deepDrill: 1 });
      expect(effects.bonusHintsPerLevel).toBe(2);
    });

    it('T2 gives 3 bonus hints', () => {
      const effects = computeUpgradeEffects({ deepDrill: 2 });
      expect(effects.bonusHintsPerLevel).toBe(3);
    });

    it('T3 gives 4 bonus hints', () => {
      const effects = computeUpgradeEffects({ deepDrill: 3 });
      expect(effects.bonusHintsPerLevel).toBe(4);
    });

    it('T4 gives 5 bonus hints', () => {
      const effects = computeUpgradeEffects({ deepDrill: 4 });
      expect(effects.bonusHintsPerLevel).toBe(5);
    });

    it('stacks with wordRadar hintsPerLevel', () => {
      const effects = computeUpgradeEffects({ deepDrill: 2, wordRadar: 3 });
      // wordRadar T3 = 2 hintsPerLevel, deepDrill T2 = 3 bonusHints
      expect(effects.hintsPerLevel).toBe(2);
      expect(effects.bonusHintsPerLevel).toBe(3);
    });
  });

  // ── Word Radar ──
  describe('wordRadar', () => {
    it('T1 gives 1.3 hintRechargeMultiplier', () => {
      const effects = computeUpgradeEffects({ wordRadar: 1 });
      expect(effects.hintRechargeMultiplier).toBeCloseTo(1.3);
      expect(effects.hintsPerLevel).toBe(1);
      expect(effects.freeStartHint).toBe(false);
    });

    it('T2 gives 1.5 hintRechargeMultiplier', () => {
      const effects = computeUpgradeEffects({ wordRadar: 2 });
      expect(effects.hintRechargeMultiplier).toBeCloseTo(1.5);
      expect(effects.hintsPerLevel).toBe(1);
    });

    it('T3 gives 2 hintsPerLevel', () => {
      const effects = computeUpgradeEffects({ wordRadar: 3 });
      expect(effects.hintsPerLevel).toBe(2);
    });

    it('T4 gives 3 hintsPerLevel', () => {
      const effects = computeUpgradeEffects({ wordRadar: 4 });
      expect(effects.hintsPerLevel).toBe(3);
    });

    it('T5 enables freeStartHint', () => {
      const effects = computeUpgradeEffects({ wordRadar: 5 });
      expect(effects.freeStartHint).toBe(true);
      expect(effects.hintsPerLevel).toBe(3);
    });
  });

  // ── Fuel Tank ──
  describe('fuelTank', () => {
    it('T1 gives 8 bonus seconds', () => {
      const effects = computeUpgradeEffects({ fuelTank: 1 });
      expect(effects.bonusTimeSeconds).toBe(8);
    });

    it('T4 gives 25 bonus seconds', () => {
      const effects = computeUpgradeEffects({ fuelTank: 4 });
      expect(effects.bonusTimeSeconds).toBe(25);
    });
  });

  // ── Armor Plating ──
  describe('armorPlating', () => {
    it('T1 reduces boss damage to 0.9', () => {
      const effects = computeUpgradeEffects({ armorPlating: 1 });
      expect(effects.bossDamageMultiplier).toBe(0.9);
      expect(effects.blockFirstAttack).toBe(false);
      expect(effects.bossHealPerWord).toBe(0);
    });

    it('T3 enables blockFirstAttack', () => {
      const effects = computeUpgradeEffects({ armorPlating: 3 });
      expect(effects.bossDamageMultiplier).toBe(0.65);
      expect(effects.blockFirstAttack).toBe(true);
    });

    it('T4 enables bossHealPerWord', () => {
      const effects = computeUpgradeEffects({ armorPlating: 4 });
      expect(effects.bossHealPerWord).toBe(5);
      expect(effects.bossDamageMultiplier).toBe(0.5);
    });
  });

  // ── Lucky Pickaxe ──
  describe('luckyPickaxe', () => {
    it('T1 gives 1.1 goldMultiplier', () => {
      const effects = computeUpgradeEffects({ luckyPickaxe: 1 });
      expect(effects.goldMultiplier).toBeCloseTo(1.1);
      expect(effects.longWordGoldBonus).toBe(0);
    });

    it('T3 gives longWordGoldBonus', () => {
      const effects = computeUpgradeEffects({ luckyPickaxe: 3 });
      expect(effects.goldMultiplier).toBeCloseTo(1.5);
      expect(effects.longWordGoldBonus).toBe(5);
    });

    it('T4 enables doubleFirstCompletionGold', () => {
      const effects = computeUpgradeEffects({ luckyPickaxe: 4 });
      expect(effects.doubleFirstCompletionGold).toBe(true);
    });
  });

  // ── Cargo Bay ──
  describe('cargoBay', () => {
    it('T1 gives 0.7 comboDecayMultiplier', () => {
      const effects = computeUpgradeEffects({ cargoBay: 1 });
      expect(effects.comboDecayMultiplier).toBeCloseTo(0.7);
      expect(effects.comboScoreMultiplier).toBe(1);
    });

    it('T3 gives 1.5 comboScoreMultiplier', () => {
      const effects = computeUpgradeEffects({ cargoBay: 3 });
      expect(effects.comboScoreMultiplier).toBe(1.5);
      expect(effects.comboDecayMultiplier).toBeCloseTo(0.5);
    });
  });

  // ── Salvage Claw ──
  describe('salvageClaw', () => {
    it('T1 gives failureGold', () => {
      const effects = computeUpgradeEffects({ salvageClaw: 1 });
      expect(effects.failureGold).toBe(5);
      expect(effects.retryScoreRetention).toBe(0);
    });

    it('T2 gives retryScoreRetention', () => {
      const effects = computeUpgradeEffects({ salvageClaw: 2 });
      expect(effects.retryScoreRetention).toBe(0.5);
    });

    it('T3 gives freeRetriesPerWorld', () => {
      const effects = computeUpgradeEffects({ salvageClaw: 3 });
      expect(effects.freeRetriesPerWorld).toBe(1);
    });
  });

  // ── Combined upgrades ──
  describe('combined upgrades', () => {
    it('all upgrades at max tier compute without error', () => {
      const effects = computeUpgradeEffects({
        wordRadar: 5,
        deepDrill: 4,
        gemDetector: 3,
        fuelTank: 4,
        armorPlating: 4,
        blastShield: 3,
        luckyPickaxe: 4,
        cargoBay: 3,
        salvageClaw: 3,
        wordDynamite: 3,
        timeFreeze: 2,
      });
      expect(effects.bonusTimeSeconds).toBe(25);
      expect(effects.freeStartHint).toBe(true);
      expect(effects.scrambleImmunity).toBe(true);
      expect(effects.canDetonateWords).toBe(true);
      expect(effects.freezeHighlightsWord).toBe(true);
      expect(effects.guaranteedGoldTile).toBe(true);
      expect(effects.doubleFirstCompletionGold).toBe(true);
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
