/**
 * Tests for useBossHealth hook
 *
 * TDD test suite following Given-When-Then pattern.
 * Tests boss HP tracking, damage calculation, and phase transitions.
 */

import { renderHook, act } from '@testing-library/react';
import { useBossHealth } from '../useBossHealth';

describe('useBossHealth', () => {
  describe('Initialization', () => {
    it('should initialize with default state in intro phase', () => {
      // GIVEN: Hook is created with default maxHP
      const maxHP = 1000;

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useBossHealth(maxHP));

      // THEN: Initial state is correct
      expect(result.current.healthState.currentHP).toBe(maxHP);
      expect(result.current.healthState.maxHP).toBe(maxHP);
      expect(result.current.healthState.phase).toBe('intro');
      expect(result.current.healthState.totalDamageDealt).toBe(0);
      expect(result.current.healthState.isActive).toBe(false);
      expect(result.current.hpPercentage).toBe(100);
      expect(result.current.isEnraged).toBe(false);
    });

    it('should initialize with custom maxHP', () => {
      // GIVEN: Hook is created with custom maxHP
      const maxHP = 5000;

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useBossHealth(maxHP));

      // THEN: MaxHP is set correctly
      expect(result.current.healthState.maxHP).toBe(maxHP);
      expect(result.current.healthState.currentHP).toBe(maxHP);
    });
  });

  describe('startBattle', () => {
    it('should transition from intro to active phase', () => {
      // GIVEN: Hook in intro phase
      const { result } = renderHook(() => useBossHealth(1000));
      expect(result.current.healthState.phase).toBe('intro');
      expect(result.current.healthState.isActive).toBe(false);

      // WHEN: Battle is started
      act(() => {
        result.current.startBattle();
      });

      // THEN: Phase transitions to active and isActive is true
      expect(result.current.healthState.phase).toBe('active');
      expect(result.current.healthState.isActive).toBe(true);
    });

    it('should not change HP when starting battle', () => {
      // GIVEN: Hook in intro phase
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));

      // WHEN: Battle is started
      act(() => {
        result.current.startBattle();
      });

      // THEN: HP remains unchanged
      expect(result.current.healthState.currentHP).toBe(maxHP);
      expect(result.current.healthState.totalDamageDealt).toBe(0);
    });
  });

  describe('dealDamage', () => {
    it('should deal base damage without multipliers', () => {
      // GIVEN: Active boss battle
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
      });

      // WHEN: Base damage is dealt with no multipliers
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.dealDamage(100, 0, 1.0);
      });

      // THEN: HP decreases by base damage amount
      expect(damageDealt).toBe(100);
      expect(result.current.healthState.currentHP).toBe(900);
      expect(result.current.healthState.totalDamageDealt).toBe(100);
      expect(result.current.hpPercentage).toBe(90);
    });

    it('should apply combo multiplier to damage (Phase 15 integration)', () => {
      // GIVEN: Active boss battle
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
      });

      // WHEN: Damage is dealt with combo count (multiplier = 1 + comboCount * 0.1)
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.dealDamage(100, 5, 1.0);
      });

      // THEN: Damage is multiplied by combo (100 * 1.5 = 150)
      expect(damageDealt).toBe(150);
      expect(result.current.healthState.currentHP).toBe(850);
      expect(result.current.healthState.totalDamageDealt).toBe(150);
    });

    it('should apply combo bonus from skill effects (Phase 31 integration)', () => {
      // GIVEN: Active boss battle
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
      });

      // WHEN: Damage is dealt with combo count AND combo bonus from combo_amplifier skill
      // Formula: baseDamage * (1 + comboCount * 0.1 + comboBonus) * mechanicMultiplier
      // 100 * (1 + 5 * 0.1 + 0.25) * 1.0 = 100 * 1.75 = 175
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.dealDamage(100, 5, 1.0, 0.25);
      });

      // THEN: Damage includes combo bonus (100 * 1.75 = 175)
      expect(damageDealt).toBe(175);
      expect(result.current.healthState.currentHP).toBe(825);
      expect(result.current.healthState.totalDamageDealt).toBe(175);
    });

    it('should default combo bonus to 0 when not provided', () => {
      // GIVEN: Active boss battle
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
      });

      // WHEN: Damage is dealt without combo bonus parameter
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.dealDamage(100, 5, 1.0);
      });

      // THEN: Combo bonus defaults to 0, so damage is 100 * 1.5 = 150
      expect(damageDealt).toBe(150);
    });

    it('should apply mechanic multiplier to damage', () => {
      // GIVEN: Active boss battle
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
      });

      // WHEN: Damage is dealt with mechanic multiplier (e.g., 2x for boss mechanic bonus)
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.dealDamage(100, 0, 2.0);
      });

      // THEN: Damage is multiplied by mechanic (100 * 2.0 = 200)
      expect(damageDealt).toBe(200);
      expect(result.current.healthState.currentHP).toBe(800);
      expect(result.current.healthState.totalDamageDealt).toBe(200);
    });

    it('should apply both combo and mechanic multipliers', () => {
      // GIVEN: Active boss battle
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
      });

      // WHEN: Damage is dealt with both multipliers
      // Combo: 3 → 1.3x, Mechanic: 1.5x → Total: 100 * 1.3 * 1.5 = 195
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.dealDamage(100, 3, 1.5);
      });

      // THEN: Both multipliers stack
      expect(damageDealt).toBe(195);
      expect(result.current.healthState.currentHP).toBe(805);
      expect(result.current.healthState.totalDamageDealt).toBe(195);
    });

    it('should accumulate total damage dealt', () => {
      // GIVEN: Active boss battle
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
      });

      // WHEN: Multiple damage events occur
      act(() => {
        result.current.dealDamage(100, 0, 1.0);
        result.current.dealDamage(50, 0, 1.0);
        result.current.dealDamage(25, 0, 1.0);
      });

      // THEN: Total damage accumulates
      expect(result.current.healthState.totalDamageDealt).toBe(175);
      expect(result.current.healthState.currentHP).toBe(825);
    });

    it('should not reduce HP below 0', () => {
      // GIVEN: Boss with low HP
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
        result.current.dealDamage(950, 0, 1.0); // HP now at 50
      });

      // WHEN: Overkill damage is dealt
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.dealDamage(100, 0, 1.0);
      });

      // THEN: HP stops at 0, but full damage is recorded
      expect(result.current.healthState.currentHP).toBe(0);
      expect(damageDealt).toBe(100);
      expect(result.current.healthState.totalDamageDealt).toBe(1050);
    });

    it('should not deal damage in intro phase', () => {
      // GIVEN: Boss in intro phase
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));

      // WHEN: Damage is attempted in intro phase
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.dealDamage(100, 0, 1.0);
      });

      // THEN: No damage is dealt
      expect(damageDealt).toBe(0);
      expect(result.current.healthState.currentHP).toBe(maxHP);
      expect(result.current.healthState.totalDamageDealt).toBe(0);
    });

    it('should not deal damage in victory phase', () => {
      // GIVEN: Boss defeated (HP at 0)
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
        result.current.dealDamage(1000, 0, 1.0); // Kill boss
      });
      expect(result.current.healthState.phase).toBe('victory');

      // WHEN: More damage is attempted
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.dealDamage(100, 0, 1.0);
      });

      // THEN: No additional damage
      expect(damageDealt).toBe(0);
      expect(result.current.healthState.currentHP).toBe(0);
      expect(result.current.healthState.totalDamageDealt).toBe(1000);
    });

    it('should not deal damage in defeat phase', () => {
      // GIVEN: Player lost
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
        result.current.endBattle(false); // Player lost
      });
      expect(result.current.healthState.phase).toBe('defeat');

      // WHEN: Damage is attempted
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.dealDamage(100, 0, 1.0);
      });

      // THEN: No damage dealt
      expect(damageDealt).toBe(0);
      expect(result.current.healthState.currentHP).toBe(maxHP);
    });
  });

  describe('Phase Transitions', () => {
    it('should transition to enraged at 25% HP', () => {
      // GIVEN: Active boss battle at 26% HP
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
        result.current.dealDamage(740, 0, 1.0); // HP now at 260 (26%)
      });
      expect(result.current.healthState.phase).toBe('active');
      expect(result.current.isEnraged).toBe(false);

      // WHEN: HP drops below 25%
      act(() => {
        result.current.dealDamage(20, 0, 1.0); // HP now at 240 (24%)
      });

      // THEN: Phase transitions to enraged
      expect(result.current.healthState.phase).toBe('enraged');
      expect(result.current.isEnraged).toBe(true);
      expect(result.current.hpPercentage).toBe(24);
    });

    it('should stay enraged when HP drops further', () => {
      // GIVEN: Boss in enraged phase
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
        result.current.dealDamage(760, 0, 1.0); // HP at 240 (24%, enraged)
      });
      expect(result.current.healthState.phase).toBe('enraged');

      // WHEN: More damage is dealt
      act(() => {
        result.current.dealDamage(100, 0, 1.0); // HP at 140 (14%)
      });

      // THEN: Phase stays enraged
      expect(result.current.healthState.phase).toBe('enraged');
      expect(result.current.isEnraged).toBe(true);
    });

    it('should transition to victory when HP reaches 0', () => {
      // GIVEN: Boss with low HP in enraged phase
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
        result.current.dealDamage(950, 0, 1.0); // HP at 50
      });

      // WHEN: Final damage brings HP to 0
      act(() => {
        result.current.dealDamage(50, 0, 1.0);
      });

      // THEN: Phase transitions to victory and isActive is false
      expect(result.current.healthState.phase).toBe('victory');
      expect(result.current.healthState.isActive).toBe(false);
      expect(result.current.healthState.currentHP).toBe(0);
    });
  });

  describe('endBattle', () => {
    it('should transition to victory when called with isVictory=true', () => {
      // GIVEN: Active boss battle
      const { result } = renderHook(() => useBossHealth(1000));
      act(() => {
        result.current.startBattle();
      });

      // WHEN: Battle ends with victory
      act(() => {
        result.current.endBattle(true);
      });

      // THEN: Phase transitions to victory
      expect(result.current.healthState.phase).toBe('victory');
      expect(result.current.healthState.isActive).toBe(false);
    });

    it('should transition to defeat when called with isVictory=false', () => {
      // GIVEN: Active boss battle
      const { result } = renderHook(() => useBossHealth(1000));
      act(() => {
        result.current.startBattle();
      });

      // WHEN: Battle ends with defeat
      act(() => {
        result.current.endBattle(false);
      });

      // THEN: Phase transitions to defeat
      expect(result.current.healthState.phase).toBe('defeat');
      expect(result.current.healthState.isActive).toBe(false);
    });
  });

  describe('resetHealth', () => {
    it('should reset to initial state', () => {
      // GIVEN: Boss battle in progress with damage dealt
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
        result.current.dealDamage(500, 0, 1.0);
      });
      expect(result.current.healthState.currentHP).toBe(500);
      expect(result.current.healthState.totalDamageDealt).toBe(500);

      // WHEN: Health is reset
      act(() => {
        result.current.resetHealth();
      });

      // THEN: State returns to initial values
      expect(result.current.healthState.currentHP).toBe(maxHP);
      expect(result.current.healthState.maxHP).toBe(maxHP);
      expect(result.current.healthState.phase).toBe('intro');
      expect(result.current.healthState.totalDamageDealt).toBe(0);
      expect(result.current.healthState.isActive).toBe(false);
      expect(result.current.hpPercentage).toBe(100);
      expect(result.current.isEnraged).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('should calculate hpPercentage correctly', () => {
      // GIVEN: Boss with various HP levels
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
      });

      // WHEN: Different amounts of damage are dealt
      // THEN: HP percentage is accurate

      // 100% HP
      expect(result.current.hpPercentage).toBe(100);

      // 75% HP
      act(() => {
        result.current.dealDamage(250, 0, 1.0);
      });
      expect(result.current.hpPercentage).toBe(75);

      // 50% HP
      act(() => {
        result.current.dealDamage(250, 0, 1.0);
      });
      expect(result.current.hpPercentage).toBe(50);

      // 25% HP
      act(() => {
        result.current.dealDamage(250, 0, 1.0);
      });
      expect(result.current.hpPercentage).toBe(25);

      // 0% HP
      act(() => {
        result.current.dealDamage(250, 0, 1.0);
      });
      expect(result.current.hpPercentage).toBe(0);
    });

    it('should set isEnraged correctly based on HP percentage', () => {
      // GIVEN: Boss at various HP levels
      const maxHP = 1000;
      const { result } = renderHook(() => useBossHealth(maxHP));
      act(() => {
        result.current.startBattle();
      });

      // WHEN/THEN: isEnraged reflects HP threshold

      // Above 25% - not enraged
      expect(result.current.isEnraged).toBe(false);

      // At 26% - not enraged
      act(() => {
        result.current.dealDamage(740, 0, 1.0);
      });
      expect(result.current.isEnraged).toBe(false);

      // Below 25% - enraged
      act(() => {
        result.current.dealDamage(20, 0, 1.0);
      });
      expect(result.current.isEnraged).toBe(true);

      // At 0% - still enraged
      act(() => {
        result.current.dealDamage(240, 0, 1.0);
      });
      expect(result.current.isEnraged).toBe(true);
    });
  });
});
