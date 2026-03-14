import {
  RUNE_DEFINITIONS,
  MAX_EQUIPPED_RUNES,
  canForgeRune,
  forgeRune,
  getEquippedRuneEffects,
  toggleRuneEquip,
  type RuneState,
} from '../runeSystem';

describe('runeSystem', () => {
  describe('RUNE_DEFINITIONS', () => {
    it('should have at least 6 runes', () => {
      expect(RUNE_DEFINITIONS.length).toBeGreaterThanOrEqual(6);
    });

    it('should have unique IDs', () => {
      const ids = RUNE_DEFINITIONS.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have positive fragment costs', () => {
      for (const rune of RUNE_DEFINITIONS) {
        expect(rune.fragmentCost).toBeGreaterThan(0);
      }
    });
  });

  describe('canForgeRune', () => {
    it('should return true when player has enough fragments', () => {
      expect(canForgeRune('rune-swiftword', 5, [])).toBe(true);
    });

    it('should return false when insufficient fragments', () => {
      expect(canForgeRune('rune-swiftword', 0, [])).toBe(false);
    });

    it('should return false when rune already forged', () => {
      const state: RuneState[] = [{ runeId: 'rune-swiftword', equipped: false }];
      expect(canForgeRune('rune-swiftword', 10, state)).toBe(false);
    });

    it('should return false for unknown rune ID', () => {
      expect(canForgeRune('rune-nonexistent', 99, [])).toBe(false);
    });
  });

  describe('forgeRune', () => {
    it('should return new rune state and deduct fragments', () => {
      const result = forgeRune('rune-swiftword', 10, []);
      expect(result).not.toBeNull();
      expect(result!.remainingFragments).toBeLessThan(10);
      expect(result!.runeState).toHaveLength(1);
      expect(result!.runeState[0].runeId).toBe('rune-swiftword');
      expect(result!.runeState[0].equipped).toBe(false);
    });

    it('should return null when cannot forge', () => {
      expect(forgeRune('rune-swiftword', 0, [])).toBeNull();
    });

    it('should not mutate input state', () => {
      const existing: RuneState[] = [{ runeId: 'rune-other', equipped: true }];
      const copy = [...existing];
      forgeRune('rune-swiftword', 10, existing);
      expect(existing).toEqual(copy);
    });
  });

  describe('getEquippedRuneEffects', () => {
    it('should return empty effects for no runes', () => {
      const effects = getEquippedRuneEffects([]);
      expect(effects.scoreMultiplier).toBe(1.0);
      expect(effects.timeBonus).toBe(0);
    });

    it('should apply effects from equipped runes only', () => {
      const state: RuneState[] = [
        { runeId: 'rune-swiftword', equipped: true },
        { runeId: 'rune-goldvein', equipped: false },
      ];
      const effects = getEquippedRuneEffects(state);
      // swiftword equipped — should have some effect
      expect(effects.scoreMultiplier).toBeGreaterThanOrEqual(1.0);
    });

    it('should stack effects from multiple equipped runes', () => {
      const single: RuneState[] = [{ runeId: 'rune-swiftword', equipped: true }];
      const double: RuneState[] = [
        { runeId: 'rune-swiftword', equipped: true },
        { runeId: 'rune-goldvein', equipped: true },
      ];
      const singleEffects = getEquippedRuneEffects(single);
      const doubleEffects = getEquippedRuneEffects(double);
      // More runes = at least as good effects
      expect(
        doubleEffects.scoreMultiplier + doubleEffects.goldMultiplier + doubleEffects.timeBonus
      ).toBeGreaterThanOrEqual(
        singleEffects.scoreMultiplier + singleEffects.goldMultiplier + singleEffects.timeBonus
      );
    });
  });

  describe('toggleRuneEquip', () => {
    it('should equip an unequipped rune', () => {
      const state: RuneState[] = [{ runeId: 'rune-swiftword', equipped: false }];
      const result = toggleRuneEquip('rune-swiftword', state);
      expect(result).not.toBeNull();
      expect(result![0].equipped).toBe(true);
    });

    it('should unequip an equipped rune', () => {
      const state: RuneState[] = [{ runeId: 'rune-swiftword', equipped: true }];
      const result = toggleRuneEquip('rune-swiftword', state);
      expect(result).not.toBeNull();
      expect(result![0].equipped).toBe(false);
    });

    it('should return null when rune not forged', () => {
      expect(toggleRuneEquip('rune-swiftword', [])).toBeNull();
    });

    it('should enforce max equipped limit', () => {
      const state: RuneState[] = [
        { runeId: 'rune-swiftword', equipped: true },
        { runeId: 'rune-goldvein', equipped: true },
        { runeId: 'rune-timewarp', equipped: true },
        { runeId: 'rune-momentum', equipped: false },
      ];
      // Trying to equip a 4th should fail
      expect(toggleRuneEquip('rune-momentum', state)).toBeNull();
    });

    it('should allow equip after unequipping another', () => {
      const state: RuneState[] = [
        { runeId: 'rune-swiftword', equipped: true },
        { runeId: 'rune-goldvein', equipped: true },
        { runeId: 'rune-timewarp', equipped: true },
        { runeId: 'rune-momentum', equipped: false },
      ];
      // Unequip one first
      const after = toggleRuneEquip('rune-swiftword', state)!;
      // Now equip the 4th
      const final = toggleRuneEquip('rune-momentum', after);
      expect(final).not.toBeNull();
      expect(final!.filter(r => r.equipped).length).toBe(MAX_EQUIPPED_RUNES);
    });
  });
});
