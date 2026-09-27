/**
 * Tests for usePlayerHealth hook
 *
 * TDD test suite following Given-When-Then pattern.
 * Tests player HP tracking, damage from boss attacks, healing, and death state.
 */

import { renderHook, act } from '@testing-library/react';
import { usePlayerHealth } from '../usePlayerHealth';

describe('usePlayerHealth', () => {
  describe('Initialization', () => {
    it('should initialize with default max HP of 100', () => {
      // GIVEN: Hook is rendered without arguments

      // WHEN: Hook is rendered
      const { result } = renderHook(() => usePlayerHealth());

      // THEN: Initial state is correct with default values
      expect(result.current.healthState.currentHP).toBe(100);
      expect(result.current.healthState.maxHP).toBe(100);
      expect(result.current.healthState.isDead).toBe(false);
      expect(result.current.healthState.isLowHealth).toBe(false);
      expect(result.current.hpPercentage).toBe(100);
    });

    it('should initialize with custom max HP', () => {
      // GIVEN: Hook is created with custom maxHP
      const maxHP = 150;

      // WHEN: Hook is rendered
      const { result } = renderHook(() => usePlayerHealth(maxHP));

      // THEN: MaxHP is set correctly
      expect(result.current.healthState.maxHP).toBe(maxHP);
      expect(result.current.healthState.currentHP).toBe(maxHP);
      expect(result.current.hpPercentage).toBe(100);
    });
  });

  describe('takeDamage', () => {
    it('should reduce HP when damage is taken', () => {
      // GIVEN: Player with full health
      const { result } = renderHook(() => usePlayerHealth(100));
      expect(result.current.healthState.currentHP).toBe(100);

      // WHEN: Player takes damage
      act(() => {
        result.current.takeDamage(30);
      });

      // THEN: HP is reduced
      expect(result.current.healthState.currentHP).toBe(70);
      expect(result.current.hpPercentage).toBe(70);
    });

    it('should return actual damage dealt', () => {
      // GIVEN: Player with full health
      const { result } = renderHook(() => usePlayerHealth(100));

      // WHEN: Player takes damage
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.takeDamage(25);
      });

      // THEN: Returns the damage dealt
      expect(damageDealt).toBe(25);
    });

    it('should not reduce HP below 0', () => {
      // GIVEN: Player with low HP
      const { result } = renderHook(() => usePlayerHealth(100));
      act(() => {
        result.current.takeDamage(90); // HP now at 10
      });

      // WHEN: Overkill damage is dealt
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.takeDamage(50);
      });

      // THEN: HP stops at 0, damage returned is capped
      expect(result.current.healthState.currentHP).toBe(0);
      expect(damageDealt).toBe(10); // Only 10 damage was actually dealt
      expect(result.current.hpPercentage).toBe(0);
    });

    it('should set isDead to true when HP reaches 0', () => {
      // GIVEN: Player with some HP
      const { result } = renderHook(() => usePlayerHealth(100));
      expect(result.current.healthState.isDead).toBe(false);

      // WHEN: Lethal damage is dealt
      act(() => {
        result.current.takeDamage(100);
      });

      // THEN: Player is marked as dead
      expect(result.current.healthState.currentHP).toBe(0);
      expect(result.current.healthState.isDead).toBe(true);
    });

    it('should not deal damage when player is already dead', () => {
      // GIVEN: Player is dead
      const { result } = renderHook(() => usePlayerHealth(100));
      act(() => {
        result.current.takeDamage(100);
      });
      expect(result.current.healthState.isDead).toBe(true);

      // WHEN: More damage is attempted
      let damageDealt: number = 0;
      act(() => {
        damageDealt = result.current.takeDamage(50);
      });

      // THEN: No additional damage
      expect(damageDealt).toBe(0);
      expect(result.current.healthState.currentHP).toBe(0);
    });

    it('should accumulate total damage taken', () => {
      // GIVEN: Player with full health
      const { result } = renderHook(() => usePlayerHealth(100));

      // WHEN: Multiple damage events occur
      act(() => {
        result.current.takeDamage(20);
        result.current.takeDamage(15);
        result.current.takeDamage(10);
      });

      // THEN: Total damage accumulates
      expect(result.current.healthState.totalDamageTaken).toBe(45);
      expect(result.current.healthState.currentHP).toBe(55);
    });
  });

  describe('Low Health State', () => {
    it('should set isLowHealth to true when HP drops below 25%', () => {
      // GIVEN: Player with HP above 25%
      const { result } = renderHook(() => usePlayerHealth(100));
      expect(result.current.healthState.isLowHealth).toBe(false);

      // WHEN: HP drops to 24%
      act(() => {
        result.current.takeDamage(76);
      });

      // THEN: Player is in low health state
      expect(result.current.healthState.currentHP).toBe(24);
      expect(result.current.healthState.isLowHealth).toBe(true);
      expect(result.current.hpPercentage).toBe(24);
    });

    it('should NOT set isLowHealth at exactly 25%', () => {
      // GIVEN: Player with full HP
      const { result } = renderHook(() => usePlayerHealth(100));

      // WHEN: HP drops to exactly 25%
      act(() => {
        result.current.takeDamage(75);
      });

      // THEN: Not in low health (25% is the boundary)
      expect(result.current.healthState.currentHP).toBe(25);
      expect(result.current.healthState.isLowHealth).toBe(false);
      expect(result.current.hpPercentage).toBe(25);
    });
  });

  describe('heal', () => {
    it('should increase HP when healed', () => {
      // GIVEN: Player with reduced HP
      const { result } = renderHook(() => usePlayerHealth(100));
      act(() => {
        result.current.takeDamage(50);
      });
      expect(result.current.healthState.currentHP).toBe(50);

      // WHEN: Player is healed
      act(() => {
        result.current.heal(20);
      });

      // THEN: HP increases
      expect(result.current.healthState.currentHP).toBe(70);
      expect(result.current.hpPercentage).toBe(70);
    });

    it('should return actual healing done', () => {
      // GIVEN: Player with reduced HP
      const { result } = renderHook(() => usePlayerHealth(100));
      act(() => {
        result.current.takeDamage(30);
      });

      // WHEN: Player is healed
      let healingDone: number = 0;
      act(() => {
        healingDone = result.current.heal(15);
      });

      // THEN: Returns the healing done
      expect(healingDone).toBe(15);
    });

    it('should not heal above max HP', () => {
      // GIVEN: Player with reduced HP
      const { result } = renderHook(() => usePlayerHealth(100));
      act(() => {
        result.current.takeDamage(20);
      });
      expect(result.current.healthState.currentHP).toBe(80);

      // WHEN: Overhealing is attempted
      let healingDone: number = 0;
      act(() => {
        healingDone = result.current.heal(50);
      });

      // THEN: HP caps at max, healing is reduced
      expect(result.current.healthState.currentHP).toBe(100);
      expect(healingDone).toBe(20); // Only 20 healing was effective
      expect(result.current.hpPercentage).toBe(100);
    });

    it('should remove low health status when healed above 25%', () => {
      // GIVEN: Player in low health state
      const { result } = renderHook(() => usePlayerHealth(100));
      act(() => {
        result.current.takeDamage(80);
      });
      expect(result.current.healthState.isLowHealth).toBe(true);
      expect(result.current.healthState.currentHP).toBe(20);

      // WHEN: Player is healed above 25%
      act(() => {
        result.current.heal(10);
      });

      // THEN: Low health status is removed
      expect(result.current.healthState.currentHP).toBe(30);
      expect(result.current.healthState.isLowHealth).toBe(false);
    });

    it('should not heal a dead player', () => {
      // GIVEN: Player is dead
      const { result } = renderHook(() => usePlayerHealth(100));
      act(() => {
        result.current.takeDamage(100);
      });
      expect(result.current.healthState.isDead).toBe(true);

      // WHEN: Healing is attempted
      let healingDone: number = 0;
      act(() => {
        healingDone = result.current.heal(50);
      });

      // THEN: No healing occurs
      expect(healingDone).toBe(0);
      expect(result.current.healthState.currentHP).toBe(0);
      expect(result.current.healthState.isDead).toBe(true);
    });
  });

  describe('resetHealth', () => {
    it('should reset to full health', () => {
      // GIVEN: Player with reduced HP
      const maxHP = 100;
      const { result } = renderHook(() => usePlayerHealth(maxHP));
      act(() => {
        result.current.takeDamage(60);
      });
      expect(result.current.healthState.currentHP).toBe(40);

      // WHEN: Health is reset
      act(() => {
        result.current.resetHealth();
      });

      // THEN: HP is restored to max
      expect(result.current.healthState.currentHP).toBe(maxHP);
      expect(result.current.hpPercentage).toBe(100);
    });

    it('should reset isDead state', () => {
      // GIVEN: Dead player
      const { result } = renderHook(() => usePlayerHealth(100));
      act(() => {
        result.current.takeDamage(100);
      });
      expect(result.current.healthState.isDead).toBe(true);

      // WHEN: Health is reset
      act(() => {
        result.current.resetHealth();
      });

      // THEN: Player is alive again
      expect(result.current.healthState.isDead).toBe(false);
      expect(result.current.healthState.currentHP).toBe(100);
    });

    it('should reset isLowHealth state', () => {
      // GIVEN: Player in low health
      const { result } = renderHook(() => usePlayerHealth(100));
      act(() => {
        result.current.takeDamage(80);
      });
      expect(result.current.healthState.isLowHealth).toBe(true);

      // WHEN: Health is reset
      act(() => {
        result.current.resetHealth();
      });

      // THEN: Low health state is cleared
      expect(result.current.healthState.isLowHealth).toBe(false);
    });

    it('should reset total damage taken', () => {
      // GIVEN: Player who has taken damage
      const { result } = renderHook(() => usePlayerHealth(100));
      act(() => {
        result.current.takeDamage(30);
        result.current.takeDamage(20);
      });
      expect(result.current.healthState.totalDamageTaken).toBe(50);

      // WHEN: Health is reset
      act(() => {
        result.current.resetHealth();
      });

      // THEN: Total damage is cleared
      expect(result.current.healthState.totalDamageTaken).toBe(0);
    });
  });

  describe('Computed Properties', () => {
    it('should calculate hpPercentage correctly', () => {
      // GIVEN: Player at various HP levels
      const maxHP = 100;
      const { result } = renderHook(() => usePlayerHealth(maxHP));

      // WHEN/THEN: Different amounts of damage are dealt
      expect(result.current.hpPercentage).toBe(100);

      act(() => {
        result.current.takeDamage(25);
      });
      expect(result.current.hpPercentage).toBe(75);

      act(() => {
        result.current.takeDamage(25);
      });
      expect(result.current.hpPercentage).toBe(50);

      act(() => {
        result.current.takeDamage(25);
      });
      expect(result.current.hpPercentage).toBe(25);

      act(() => {
        result.current.takeDamage(25);
      });
      expect(result.current.hpPercentage).toBe(0);
    });

    it('should handle fractional HP percentages', () => {
      // GIVEN: Player with HP that doesn't divide evenly
      const { result } = renderHook(() => usePlayerHealth(100));

      // WHEN: Damage results in fractional percentage
      act(() => {
        result.current.takeDamage(33);
      });

      // THEN: Percentage is rounded
      expect(result.current.hpPercentage).toBe(67);
      expect(result.current.healthState.currentHP).toBe(67);
    });
  });

  describe('setMaxHP', () => {
    it('should allow changing max HP dynamically', () => {
      // GIVEN: Player with default max HP
      const { result } = renderHook(() => usePlayerHealth(100));

      // WHEN: Max HP is increased
      act(() => {
        result.current.setMaxHP(150);
      });

      // THEN: Max HP is updated, current HP unchanged
      expect(result.current.healthState.maxHP).toBe(150);
      expect(result.current.healthState.currentHP).toBe(100);
      // Percentage recalculated based on new max
      expect(result.current.hpPercentage).toBe(67);
    });

    it('should cap current HP at new max if reduced', () => {
      // GIVEN: Player with full HP
      const { result } = renderHook(() => usePlayerHealth(100));

      // WHEN: Max HP is reduced below current HP
      act(() => {
        result.current.setMaxHP(50);
      });

      // THEN: Current HP is capped at new max
      expect(result.current.healthState.maxHP).toBe(50);
      expect(result.current.healthState.currentHP).toBe(50);
      expect(result.current.hpPercentage).toBe(100);
    });
  });
});
