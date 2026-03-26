/**
 * Tests for useBossEffectExecutor hook
 *
 * TDD test suite following Given-When-Then pattern.
 * Tests effect application for boss abilities: player damage, timer penalty,
 * tile locking, scramble, and visual feedback triggers.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBossEffectExecutor } from '../useBossEffectExecutor';
import type { AbilityEffect } from '../../types/bossAbility';

describe('useBossEffectExecutor', () => {
  // Mock callbacks for game state modifications
  const createMockCallbacks = () => ({
    onPlayerDamage: vi.fn(),
    onTimerPenalty: vi.fn(),
    onLockTiles: vi.fn(),
    onUnlockTiles: vi.fn(),
    onScramble: vi.fn(),
    onScreenShake: vi.fn(),
    onDamageFlash: vi.fn(),
  });

  describe('Initialization', () => {
    it('should initialize with no active effects', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();

      // WHEN: Hook is rendered
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // THEN: No effects are active
      expect(result.current.activeEffects).toEqual([]);
    });
  });

  describe('Player Damage Effect', () => {
    it('should call onPlayerDamage with damage amount', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Player damage effect is applied
      const effects: AbilityEffect[] = [
        { type: 'player_damage', params: { amount: 25 } },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: onPlayerDamage is called with correct amount
      expect(callbacks.onPlayerDamage).toHaveBeenCalledWith(25);
    });

    it('should default to 10 damage if no amount specified', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Player damage effect without amount
      const effects: AbilityEffect[] = [
        { type: 'player_damage' },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: Default damage of 10 is applied
      expect(callbacks.onPlayerDamage).toHaveBeenCalledWith(10);
    });

    it('should trigger screen shake for player damage', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Player damage effect is applied
      const effects: AbilityEffect[] = [
        { type: 'player_damage', params: { amount: 20 } },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: Screen shake is triggered
      expect(callbacks.onScreenShake).toHaveBeenCalled();
    });

    it('should trigger damage flash for player damage', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Player damage effect is applied
      const effects: AbilityEffect[] = [
        { type: 'player_damage', params: { amount: 30 } },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: Damage flash is triggered
      expect(callbacks.onDamageFlash).toHaveBeenCalled();
    });
  });

  describe('Timer Penalty Effect', () => {
    it('should call onTimerPenalty with penalty seconds', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Timer penalty effect is applied
      const effects: AbilityEffect[] = [
        { type: 'timer_penalty', params: { seconds: 5 } },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: onTimerPenalty is called with correct seconds
      expect(callbacks.onTimerPenalty).toHaveBeenCalledWith(5);
    });

    it('should default to 3 seconds if no amount specified', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Timer penalty without seconds
      const effects: AbilityEffect[] = [
        { type: 'timer_penalty' },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: Default penalty of 3 seconds
      expect(callbacks.onTimerPenalty).toHaveBeenCalledWith(3);
    });
  });

  describe('Lock Tiles Effect', () => {
    it('should call onLockTiles with target tiles', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Lock tiles effect is applied
      const effects: AbilityEffect[] = [
        {
          type: 'lock_tiles',
          target: { type: 'specific', indices: [0, 1, 2] },
          duration: 5000,
        },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: onLockTiles is called with tile indices and duration
      expect(callbacks.onLockTiles).toHaveBeenCalledWith([0, 1, 2], 5000);
    });

    it('should track locked tiles in active effects', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Lock tiles effect is applied
      const effects: AbilityEffect[] = [
        {
          type: 'lock_tiles',
          target: { type: 'specific', indices: [3, 4] },
          duration: 3000,
        },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: Effect is tracked in activeEffects
      expect(result.current.activeEffects).toContainEqual(
        expect.objectContaining({
          effect: expect.objectContaining({ type: 'lock_tiles' }),
        })
      );
    });
  });

  describe('Scramble Effect', () => {
    it('should call onScramble', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Scramble effect is applied
      const effects: AbilityEffect[] = [
        { type: 'scramble' },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: onScramble is called
      expect(callbacks.onScramble).toHaveBeenCalled();
    });

    it('should trigger screen shake for scramble', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Scramble effect is applied
      const effects: AbilityEffect[] = [
        { type: 'scramble' },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: Screen shake is triggered
      expect(callbacks.onScreenShake).toHaveBeenCalled();
    });
  });

  describe('Multiple Effects', () => {
    it('should apply multiple effects in sequence', () => {
      // GIVEN: Hook with mock callbacks
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Multiple effects are applied
      const effects: AbilityEffect[] = [
        { type: 'player_damage', params: { amount: 15 } },
        { type: 'timer_penalty', params: { seconds: 3 } },
        { type: 'scramble' },
      ];
      act(() => {
        result.current.applyEffects(effects);
      });

      // THEN: All callbacks are called
      expect(callbacks.onPlayerDamage).toHaveBeenCalledWith(15);
      expect(callbacks.onTimerPenalty).toHaveBeenCalledWith(3);
      expect(callbacks.onScramble).toHaveBeenCalled();
    });

    it('should not call callbacks for missing handlers', () => {
      // GIVEN: Hook with partial callbacks (no onScramble)
      const callbacks = {
        onPlayerDamage: vi.fn(),
        onTimerPenalty: vi.fn(),
        // onScramble is missing
        onScreenShake: vi.fn(),
        onDamageFlash: vi.fn(),
      };
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Scramble effect is applied
      const effects: AbilityEffect[] = [
        { type: 'scramble' },
      ];

      // THEN: Should not throw
      expect(() => {
        act(() => {
          result.current.applyEffects(effects);
        });
      }).not.toThrow();
    });
  });

  describe('Effect Cleanup', () => {
    it('should clear active effects on clearEffects', () => {
      // GIVEN: Hook with active effects
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // Apply effects first
      act(() => {
        result.current.applyEffects([
          {
            type: 'lock_tiles',
            target: { type: 'specific', indices: [0, 1] },
            duration: 5000,
          },
        ]);
      });
      expect(result.current.activeEffects.length).toBeGreaterThan(0);

      // WHEN: Effects are cleared
      act(() => {
        result.current.clearEffects();
      });

      // THEN: Active effects are empty
      expect(result.current.activeEffects).toEqual([]);
    });

    it('should call onUnlockTiles when clearing lock effects', () => {
      // GIVEN: Hook with locked tiles
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      act(() => {
        result.current.applyEffects([
          {
            type: 'lock_tiles',
            target: { type: 'specific', indices: [5, 6, 7] },
            duration: 5000,
          },
        ]);
      });

      // WHEN: Effects are cleared
      act(() => {
        result.current.clearEffects();
      });

      // THEN: Unlock is called with previously locked tiles
      expect(callbacks.onUnlockTiles).toHaveBeenCalledWith([5, 6, 7]);
    });
  });

  describe('Effect Expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should expire timed effects after duration', () => {
      // GIVEN: Hook with timed effect
      const callbacks = createMockCallbacks();
      const { result } = renderHook(() => useBossEffectExecutor(callbacks));

      // WHEN: Lock tiles with 3000ms duration
      act(() => {
        result.current.applyEffects([
          {
            type: 'lock_tiles',
            target: { type: 'specific', indices: [0, 1] },
            duration: 3000,
          },
        ]);
      });

      // Effect should be active
      expect(result.current.activeEffects.length).toBe(1);

      // WHEN: Time passes
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // THEN: Effect expires and tiles are unlocked
      expect(result.current.activeEffects.length).toBe(0);
      expect(callbacks.onUnlockTiles).toHaveBeenCalledWith([0, 1]);
    });
  });
});
