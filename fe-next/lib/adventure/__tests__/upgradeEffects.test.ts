import {
  UPGRADE_VISUAL_EFFECTS,
  getUpgradeVisualEffect,
  getBoardVisualUpgrades,
  getUpgradeIntensity,
  getActiveUpgradeIndicators,
} from '../upgradeEffects';

describe('UPGRADE_VISUAL_EFFECTS', () => {
  it('defines effects for all 11 upgrade IDs from upgradeConfig', () => {
    const expectedIds = [
      'wordRadar', 'deepDrill', 'gemDetector', 'fuelTank',
      'armorPlating', 'blastShield', 'luckyPickaxe', 'cargoBay',
      'salvageClaw', 'wordDynamite', 'timeFreeze',
    ];
    for (const id of expectedIds) {
      expect(UPGRADE_VISUAL_EFFECTS[id]).toBeDefined();
    }
  });

  it('each effect has required fields', () => {
    for (const effect of Object.values(UPGRADE_VISUAL_EFFECTS)) {
      expect(effect.upgradeId).toBeTruthy();
      expect(effect.hudIcon).toBeTruthy();
      expect(effect.triggerToastKey).toBeTruthy();
      expect(effect.triggerAnimation).toBeTruthy();
      expect(effect.triggerSound).toBeTruthy();
      expect(effect.effectDurationMs).toBeGreaterThan(0);
      expect(Array.isArray(effect.tierIntensity)).toBe(true);
      expect(effect.tierIntensity.length).toBeGreaterThan(0);
    }
  });
});

describe('getUpgradeVisualEffect', () => {
  it('returns effect for known upgrade', () => {
    const effect = getUpgradeVisualEffect('wordRadar');
    expect(effect?.upgradeId).toBe('wordRadar');
    expect(effect?.hudIcon).toBe('📡');
  });

  it('returns undefined for unknown upgrade', () => {
    expect(getUpgradeVisualEffect('nonExistent')).toBeUndefined();
  });
});

describe('getBoardVisualUpgrades', () => {
  it('returns only upgrades with hasBoardVisual true', () => {
    const upgrades = getBoardVisualUpgrades();
    for (const u of upgrades) {
      expect(u.hasBoardVisual).toBe(true);
    }
  });

  it('excludes upgrades without board visuals', () => {
    const upgrades = getBoardVisualUpgrades();
    const ids = upgrades.map(u => u.upgradeId);
    expect(ids).not.toContain('fuelTank');
    expect(ids).not.toContain('cargoBay');
  });
});

describe('getUpgradeIntensity', () => {
  it('returns 0 for unknown upgrade', () => {
    expect(getUpgradeIntensity('unknown', 1)).toBe(0);
  });

  it('returns 0 for tier < 1', () => {
    expect(getUpgradeIntensity('wordRadar', 0)).toBe(0);
  });

  it('returns correct intensity for valid tier', () => {
    expect(getUpgradeIntensity('wordRadar', 1)).toBe(0.3);
    expect(getUpgradeIntensity('wordRadar', 3)).toBe(0.7);
  });

  it('clamps to last tier when tier exceeds max', () => {
    const effect = UPGRADE_VISUAL_EFFECTS['wordRadar'];
    const lastIntensity = effect.tierIntensity[effect.tierIntensity.length - 1];
    expect(getUpgradeIntensity('wordRadar', 999)).toBe(lastIntensity);
  });
});

describe('getActiveUpgradeIndicators', () => {
  it('returns empty array for empty state', () => {
    expect(getActiveUpgradeIndicators({})).toEqual([]);
  });

  it('filters out upgrades with tier 0', () => {
    const indicators = getActiveUpgradeIndicators({ wordRadar: 0, fuelTank: 2 });
    expect(indicators.map(i => i.upgradeId)).not.toContain('wordRadar');
    expect(indicators.map(i => i.upgradeId)).toContain('fuelTank');
  });

  it('includes tier and intensity in each indicator', () => {
    const indicators = getActiveUpgradeIndicators({ wordRadar: 2 });
    const radar = indicators.find(i => i.upgradeId === 'wordRadar');
    expect(radar?.tier).toBe(2);
    expect(radar?.intensity).toBe(0.5);
  });

  it('excludes unknown upgrade ids (intensity 0 filtered out)', () => {
    const indicators = getActiveUpgradeIndicators({ unknownUpgrade: 1 });
    expect(indicators.find(i => i.upgradeId === 'unknownUpgrade')).toBeUndefined();
  });
});
