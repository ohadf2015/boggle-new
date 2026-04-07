/**
 * Rune Catalog — TDD Tests
 *
 * Covers: catalog definitions, forging, equipping, aggregate effect computation.
 */
import {
  RUNE_CATALOG,
  RUNE_FORGE_COSTS,
  MAX_EQUIPPED_RUNES,
  type RuneDefinition,
  type RuneRarity,
  getRuneById,
  canForgeRune,
  forgeRune,
  equipRune,
  unequipRune,
  computeRuneEffects,
} from '../runeCatalog';
import type { PlayerRune } from '@/types/adventure';

// ==============================================
// CATALOG DEFINITIONS
// ==============================================

describe('Rune Catalog definitions', () => {
  it('should have exactly 12 runes', () => {
    expect(RUNE_CATALOG).toHaveLength(12);
  });

  it('should have unique IDs', () => {
    const ids = RUNE_CATALOG.map(r => r.id);
    expect(new Set(ids).size).toBe(12);
  });

  it('should cover all 6 effect channels', () => {
    const channels = new Set(RUNE_CATALOG.map(r => r.effectChannel));
    expect(channels).toEqual(new Set([
      'scoreMultiplier', 'goldMultiplier', 'timeBonus',
      'comboDecay', 'hintBonus', 'bossDamage',
    ]));
  });

  it('should have 2 runes per effect channel', () => {
    const counts: Record<string, number> = {};
    for (const r of RUNE_CATALOG) {
      counts[r.effectChannel] = (counts[r.effectChannel] ?? 0) + 1;
    }
    for (const channel of Object.keys(counts)) {
      expect(counts[channel]).toBe(2);
    }
  });

  it('should have all 4 rarity tiers represented', () => {
    const rarities = new Set(RUNE_CATALOG.map(r => r.rarity));
    expect(rarities).toEqual(new Set(['common', 'rare', 'epic', 'legendary']));
  });

  it('should have i18n name and description keys for every rune', () => {
    for (const rune of RUNE_CATALOG) {
      expect(rune.nameKey).toMatch(/^adventure\.runes\.\w+\.name$/);
      expect(rune.descriptionKey).toMatch(/^adventure\.runes\.\w+\.desc$/);
    }
  });
});

// ==============================================
// FORGE COSTS
// ==============================================

describe('Rune forge costs', () => {
  it('should define costs for all 4 rarities', () => {
    expect(RUNE_FORGE_COSTS).toEqual({
      common: 5,
      rare: 15,
      epic: 30,
      legendary: 50,
    });
  });
});

// ==============================================
// MAX EQUIPPED
// ==============================================

describe('MAX_EQUIPPED_RUNES', () => {
  it('should be 3', () => {
    expect(MAX_EQUIPPED_RUNES).toBe(3);
  });
});

// ==============================================
// getRuneById
// ==============================================

describe('getRuneById', () => {
  it('should return the rune definition for a valid ID', () => {
    const rune = getRuneById('ember');
    expect(rune).toBeDefined();
    expect(rune!.effectChannel).toBe('scoreMultiplier');
  });

  it('should return undefined for unknown ID', () => {
    expect(getRuneById('nonexistent')).toBeUndefined();
  });
});

// ==============================================
// canForgeRune
// ==============================================

describe('canForgeRune', () => {
  it('should return true when player has enough fragments', () => {
    expect(canForgeRune('ember', 10, [])).toBe(true);
  });

  it('should return false when player has insufficient fragments', () => {
    expect(canForgeRune('ember', 4, [])).toBe(false);
  });

  it('should return false when player already owns the rune', () => {
    const owned: PlayerRune[] = [{ runeId: 'ember', equipped: false }];
    expect(canForgeRune('ember', 100, owned)).toBe(false);
  });

  it('should return false for unknown rune ID', () => {
    expect(canForgeRune('nonexistent', 100, [])).toBe(false);
  });

  it('should return true at exact cost threshold', () => {
    // ember is common = 5 fragments
    expect(canForgeRune('ember', 5, [])).toBe(true);
  });
});

// ==============================================
// forgeRune
// ==============================================

describe('forgeRune', () => {
  it('should return new rune and deducted fragments on success', () => {
    const result = forgeRune('ember', 10, []);
    expect(result).not.toBeNull();
    expect(result!.newRune).toEqual({ runeId: 'ember', equipped: false });
    expect(result!.remainingFragments).toBe(5); // 10 - 5
  });

  it('should return null when cannot forge', () => {
    expect(forgeRune('ember', 2, [])).toBeNull();
  });

  it('should return null when already owned', () => {
    const owned: PlayerRune[] = [{ runeId: 'ember', equipped: false }];
    expect(forgeRune('ember', 100, owned)).toBeNull();
  });

  it('should deduct correct cost per rarity', () => {
    // Find a legendary rune
    const legendary = RUNE_CATALOG.find(r => r.rarity === 'legendary')!;
    const result = forgeRune(legendary.id, 60, []);
    expect(result).not.toBeNull();
    expect(result!.remainingFragments).toBe(10); // 60 - 50
  });
});

// ==============================================
// equipRune
// ==============================================

describe('equipRune', () => {
  it('should equip an unequipped owned rune', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: false }];
    const result = equipRune('ember', runes);
    expect(result).not.toBeNull();
    expect(result!.find(r => r.runeId === 'ember')!.equipped).toBe(true);
  });

  it('should return null when rune is not owned', () => {
    expect(equipRune('ember', [])).toBeNull();
  });

  it('should return null when rune is already equipped', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: true }];
    expect(equipRune('ember', runes)).toBeNull();
  });

  it('should return null when max equipped slots are full', () => {
    const runes: PlayerRune[] = [
      { runeId: 'ember', equipped: true },
      { runeId: 'midas', equipped: true },
      { runeId: 'hourglass', equipped: true },
      { runeId: 'flow', equipped: false },
    ];
    expect(equipRune('flow', runes)).toBeNull();
  });

  it('should not mutate the input array', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: false }];
    const original = JSON.parse(JSON.stringify(runes));
    equipRune('ember', runes);
    expect(runes).toEqual(original);
  });
});

// ==============================================
// unequipRune
// ==============================================

describe('unequipRune', () => {
  it('should unequip an equipped rune', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: true }];
    const result = unequipRune('ember', runes);
    expect(result).not.toBeNull();
    expect(result!.find(r => r.runeId === 'ember')!.equipped).toBe(false);
  });

  it('should return null when rune is not owned', () => {
    expect(unequipRune('ember', [])).toBeNull();
  });

  it('should return null when rune is not equipped', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: false }];
    expect(unequipRune('ember', runes)).toBeNull();
  });

  it('should not mutate the input array', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: true }];
    const original = JSON.parse(JSON.stringify(runes));
    unequipRune('ember', runes);
    expect(runes).toEqual(original);
  });
});

// ==============================================
// computeRuneEffects
// ==============================================

describe('computeRuneEffects', () => {
  it('should return default effects when no runes equipped', () => {
    const effects = computeRuneEffects([]);
    expect(effects).toEqual({
      scoreMultiplier: 1.0,
      goldMultiplier: 1.0,
      timeBonus: 0,
      comboDecay: 1.0,
      hintBonus: 0,
      bossDamage: 1.0,
    });
  });

  it('should return default effects when runes owned but none equipped', () => {
    const runes: PlayerRune[] = [
      { runeId: 'ember', equipped: false },
      { runeId: 'midas', equipped: false },
    ];
    expect(computeRuneEffects(runes)).toEqual({
      scoreMultiplier: 1.0,
      goldMultiplier: 1.0,
      timeBonus: 0,
      comboDecay: 1.0,
      hintBonus: 0,
      bossDamage: 1.0,
    });
  });

  it('should apply a single equipped rune effect', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: true }];
    const effects = computeRuneEffects(runes);
    // Ember: scoreMultiplier +0.1
    expect(effects.scoreMultiplier).toBeCloseTo(1.1);
    // All others default
    expect(effects.goldMultiplier).toBe(1.0);
    expect(effects.timeBonus).toBe(0);
  });

  it('should stack multiplicative effects from multiple equipped runes', () => {
    // Equip ember (score 1.1) and inferno (score 1.25) — same channel
    const runes: PlayerRune[] = [
      { runeId: 'ember', equipped: true },
      { runeId: 'inferno', equipped: true },
    ];
    const effects = computeRuneEffects(runes);
    // Multiplicative: 1.1 * 1.25 = 1.375
    expect(effects.scoreMultiplier).toBeCloseTo(1.375);
  });

  it('should stack additive effects (timeBonus)', () => {
    const runes: PlayerRune[] = [
      { runeId: 'hourglass', equipped: true },
      { runeId: 'eternity', equipped: true },
    ];
    const effects = computeRuneEffects(runes);
    // hourglass: +5, eternity: +12 → 17
    expect(effects.timeBonus).toBe(17);
  });

  it('should stack additive effects (hintBonus)', () => {
    const runes: PlayerRune[] = [
      { runeId: 'insight', equipped: true },
      { runeId: 'oracle', equipped: true },
    ];
    const effects = computeRuneEffects(runes);
    expect(effects.hintBonus).toBe(3); // 1 + 2
  });

  it('should handle mixed channel runes independently', () => {
    const runes: PlayerRune[] = [
      { runeId: 'ember', equipped: true },     // score 1.1
      { runeId: 'midas', equipped: true },     // gold 1.15
      { runeId: 'hourglass', equipped: true }, // time +5
    ];
    const effects = computeRuneEffects(runes);
    expect(effects.scoreMultiplier).toBeCloseTo(1.1);
    expect(effects.goldMultiplier).toBeCloseTo(1.15);
    expect(effects.timeBonus).toBe(5);
    expect(effects.comboDecay).toBe(1.0);
    expect(effects.hintBonus).toBe(0);
    expect(effects.bossDamage).toBe(1.0);
  });

  it('should ignore unknown rune IDs gracefully', () => {
    const runes: PlayerRune[] = [{ runeId: 'unknown-rune', equipped: true }];
    const effects = computeRuneEffects(runes);
    expect(effects).toEqual({
      scoreMultiplier: 1.0,
      goldMultiplier: 1.0,
      timeBonus: 0,
      comboDecay: 1.0,
      hintBonus: 0,
      bossDamage: 1.0,
    });
  });
});
