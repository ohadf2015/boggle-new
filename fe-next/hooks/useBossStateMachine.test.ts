/**
 * useBossStateMachine Tests
 *
 * TDD tests for the 5-phase boss state machine:
 * intro -> phase1 -> phase2 -> enraged -> victory/defeat
 *
 * Phase transitions at HP thresholds:
 * - phase1 -> phase2: HP drops below 66%
 * - phase2 -> enraged: HP drops below 33%
 * - any active state -> victory: HP reaches 0
 * - any active state -> defeat: timer expires
 */

import { renderHook, act } from '@testing-library/react';
import { useBossStateMachine } from './useBossStateMachine';
import { BOSS_PHASE_THRESHOLDS } from '../types/bossStateMachine';

describe('useBossStateMachine', () => {
  // ==============================================
  // INITIAL STATE TESTS
  // ==============================================

  describe('Initial State', () => {
    it('should start in intro state', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      expect(result.current.state).toBe('intro');
    });

    it('should initialize with correct context values', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      expect(result.current.context.hp).toBe(1000);
      expect(result.current.context.maxHP).toBe(1000);
      expect(result.current.context.totalDamageDealt).toBe(0);
      expect(result.current.context.bossId).toBe('test-boss');
    });

    it('should have 100% HP at start', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      expect(result.current.hpPercentage).toBe(100);
    });

    it('should not be active in intro state', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      expect(result.current.isActive).toBe(false);
    });

    it('should not be enraged in intro state', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      expect(result.current.isEnraged).toBe(false);
    });

    it('should not be victory or defeat in intro state', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      expect(result.current.isVictory).toBe(false);
      expect(result.current.isDefeat).toBe(false);
    });
  });

  // ==============================================
  // START_BATTLE TRANSITION TESTS
  // ==============================================

  describe('START_BATTLE Transition', () => {
    it('should transition from intro to phase1 on START_BATTLE', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.state).toBe('phase1');
    });

    it('should be active after starting battle', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.isActive).toBe(true);
    });

    it('should preserve HP when starting battle', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.context.hp).toBe(1000);
      expect(result.current.hpPercentage).toBe(100);
    });

    it('should not transition from non-intro states on START_BATTLE', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      // Start battle to get to phase1
      act(() => {
        result.current.startBattle();
      });
      expect(result.current.state).toBe('phase1');

      // Try to start again - should stay in phase1
      act(() => {
        result.current.startBattle();
      });
      expect(result.current.state).toBe('phase1');
    });
  });

  // ==============================================
  // DEAL_DAMAGE TRANSITION TESTS - PHASE1
  // ==============================================

  describe('DEAL_DAMAGE in Phase1', () => {
    it('should reduce HP when dealing damage', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(100);
      });

      expect(result.current.context.hp).toBe(900);
    });

    it('should track total damage dealt', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(100);
      });
      act(() => {
        result.current.dealDamage(150);
      });

      expect(result.current.context.totalDamageDealt).toBe(250);
    });

    it('should stay in phase1 when HP is above 66%', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // Deal 300 damage, HP = 700 (70%)
      act(() => {
        result.current.dealDamage(300);
      });

      expect(result.current.state).toBe('phase1');
      expect(result.current.hpPercentage).toBe(70);
    });

    it('should transition to phase2 when HP drops below 66%', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // Deal 350 damage, HP = 650 (65%)
      act(() => {
        result.current.dealDamage(350);
      });

      expect(result.current.state).toBe('phase2');
      expect(result.current.hpPercentage).toBe(65);
    });

    it('should transition to phase2 when HP rounds below 66% threshold', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // Deal 345 damage, HP = 655 (65.5% -> rounds to 66%)
      act(() => {
        result.current.dealDamage(345);
      });

      // 65.5% rounds to 66%, so still in phase1
      expect(result.current.state).toBe('phase1');
      expect(result.current.hpPercentage).toBe(66);

      // Deal 2 more damage, HP = 653 (65.3% -> rounds to 65%)
      act(() => {
        result.current.dealDamage(2);
      });

      expect(result.current.state).toBe('phase2');
      expect(result.current.hpPercentage).toBe(65);
    });

    it('should not deal damage in intro state', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      // Try to deal damage before starting
      act(() => {
        result.current.dealDamage(100);
      });

      expect(result.current.context.hp).toBe(1000);
      expect(result.current.context.totalDamageDealt).toBe(0);
    });
  });

  // ==============================================
  // DEAL_DAMAGE TRANSITION TESTS - PHASE2
  // ==============================================

  describe('DEAL_DAMAGE in Phase2', () => {
    it('should stay in phase2 when HP is between 33% and 66%', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // Get to phase2 (HP below 66%)
      act(() => {
        result.current.dealDamage(350);
      });
      expect(result.current.state).toBe('phase2');

      // Deal more damage, HP = 550 (55%)
      act(() => {
        result.current.dealDamage(100);
      });

      expect(result.current.state).toBe('phase2');
      expect(result.current.hpPercentage).toBe(55);
    });

    it('should transition to enraged when HP drops below 33%', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // Get to phase2
      act(() => {
        result.current.dealDamage(350);
      });
      expect(result.current.state).toBe('phase2');

      // Deal enough damage to drop below 33% (HP = 320, need to go below 330)
      act(() => {
        result.current.dealDamage(330);
      });

      expect(result.current.state).toBe('enraged');
      expect(result.current.hpPercentage).toBe(32);
    });

    it('should set isEnraged flag when entering enraged state', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.isEnraged).toBe(false);

      // Get to enraged (HP below 33%)
      act(() => {
        result.current.dealDamage(680);
      });

      expect(result.current.isEnraged).toBe(true);
    });
  });

  // ==============================================
  // DEAL_DAMAGE TRANSITION TESTS - ENRAGED
  // ==============================================

  describe('DEAL_DAMAGE in Enraged', () => {
    it('should stay in enraged when HP is above 0', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // Get to enraged
      act(() => {
        result.current.dealDamage(680);
      });
      expect(result.current.state).toBe('enraged');

      // Deal more damage but not enough to kill
      act(() => {
        result.current.dealDamage(100);
      });

      expect(result.current.state).toBe('enraged');
      expect(result.current.context.hp).toBe(220);
    });

    it('should transition to victory when HP reaches 0', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // Deal lethal damage
      act(() => {
        result.current.dealDamage(1000);
      });

      expect(result.current.state).toBe('victory');
      expect(result.current.context.hp).toBe(0);
    });

    it('should set isVictory flag when entering victory state', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.isVictory).toBe(false);

      act(() => {
        result.current.dealDamage(1000);
      });

      expect(result.current.isVictory).toBe(true);
    });

    it('should not be active after victory', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(1000);
      });

      expect(result.current.isActive).toBe(false);
    });

    it('should clamp HP to 0 when overkilling', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // Deal overkill damage
      act(() => {
        result.current.dealDamage(2000);
      });

      expect(result.current.context.hp).toBe(0);
      expect(result.current.hpPercentage).toBe(0);
    });
  });

  // ==============================================
  // DIRECT PHASE SKIP TESTS
  // ==============================================

  describe('Direct Phase Skips', () => {
    it('should skip phase2 when damage takes HP from above 66% to below 33%', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // Deal massive damage that skips phase2
      act(() => {
        result.current.dealDamage(680);
      });

      expect(result.current.state).toBe('enraged');
      expect(result.current.hpPercentage).toBe(32);
    });

    it('should skip to victory when one-shotting from phase1', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(1000);
      });

      expect(result.current.state).toBe('victory');
    });

    it('should skip phase2 and enraged when one-shotting', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // Even with massive damage, should end in victory
      act(() => {
        result.current.dealDamage(5000);
      });

      expect(result.current.state).toBe('victory');
      expect(result.current.context.hp).toBe(0);
    });
  });

  // ==============================================
  // TIMER_EXPIRED TRANSITION TESTS
  // ==============================================

  describe('TIMER_EXPIRED Transition', () => {
    it('should transition to defeat from phase1', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.timerExpired();
      });

      expect(result.current.state).toBe('defeat');
    });

    it('should transition to defeat from phase2', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(400);
      });
      expect(result.current.state).toBe('phase2');

      act(() => {
        result.current.timerExpired();
      });

      expect(result.current.state).toBe('defeat');
    });

    it('should transition to defeat from enraged', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(700);
      });
      expect(result.current.state).toBe('enraged');

      act(() => {
        result.current.timerExpired();
      });

      expect(result.current.state).toBe('defeat');
    });

    it('should set isDefeat flag when timer expires', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.isDefeat).toBe(false);

      act(() => {
        result.current.timerExpired();
      });

      expect(result.current.isDefeat).toBe(true);
    });

    it('should not be active after defeat', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.timerExpired();
      });

      expect(result.current.isActive).toBe(false);
    });

    it('should not transition from intro on TIMER_EXPIRED', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.timerExpired();
      });

      expect(result.current.state).toBe('intro');
    });

    it('should preserve HP when timer expires', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(300);
      });

      const hpBeforeDefeat = result.current.context.hp;

      act(() => {
        result.current.timerExpired();
      });

      expect(result.current.context.hp).toBe(hpBeforeDefeat);
    });
  });

  // ==============================================
  // RESET TRANSITION TESTS
  // ==============================================

  describe('RESET Transition', () => {
    it('should reset from victory to intro', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(1000);
      });
      expect(result.current.state).toBe('victory');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('intro');
    });

    it('should reset from defeat to intro', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.timerExpired();
      });
      expect(result.current.state).toBe('defeat');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('intro');
    });

    it('should reset HP to maxHP', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(500);
      });
      act(() => {
        result.current.reset();
      });

      expect(result.current.context.hp).toBe(1000);
      expect(result.current.hpPercentage).toBe(100);
    });

    it('should reset totalDamageDealt to 0', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(500);
      });
      expect(result.current.context.totalDamageDealt).toBe(500);

      act(() => {
        result.current.reset();
      });

      expect(result.current.context.totalDamageDealt).toBe(0);
    });

    it('should reset from any active state', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      // Reset from phase1
      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.reset();
      });
      expect(result.current.state).toBe('intro');

      // Reset from phase2
      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(400);
      });
      expect(result.current.state).toBe('phase2');
      act(() => {
        result.current.reset();
      });
      expect(result.current.state).toBe('intro');

      // Reset from enraged
      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(700);
      });
      expect(result.current.state).toBe('enraged');
      act(() => {
        result.current.reset();
      });
      expect(result.current.state).toBe('intro');
    });

    it('should preserve bossId after reset', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.reset();
      });

      expect(result.current.context.bossId).toBe('test-boss');
    });
  });

  // ==============================================
  // IMPOSSIBLE STATE PREVENTION TESTS
  // ==============================================

  describe('Impossible State Prevention', () => {
    it('should not allow damage in victory state', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(1000);
      });
      expect(result.current.state).toBe('victory');

      const hpAfterVictory = result.current.context.hp;

      act(() => {
        result.current.dealDamage(100);
      });

      expect(result.current.state).toBe('victory');
      expect(result.current.context.hp).toBe(hpAfterVictory);
    });

    it('should not allow damage in defeat state', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.timerExpired();
      });
      expect(result.current.state).toBe('defeat');

      const hpAfterDefeat = result.current.context.hp;

      act(() => {
        result.current.dealDamage(100);
      });

      expect(result.current.state).toBe('defeat');
      expect(result.current.context.hp).toBe(hpAfterDefeat);
    });

    it('should not transition to defeat from victory', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(1000);
      });
      expect(result.current.state).toBe('victory');

      act(() => {
        result.current.timerExpired();
      });

      expect(result.current.state).toBe('victory');
    });

    it('should not transition to victory from defeat', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.timerExpired();
      });
      expect(result.current.state).toBe('defeat');

      // Try dealing damage after defeat
      act(() => {
        result.current.dealDamage(1000);
      });

      expect(result.current.state).toBe('defeat');
    });

    it('should not start battle from victory', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(1000);
      });
      expect(result.current.state).toBe('victory');

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.state).toBe('victory');
    });

    it('should not start battle from defeat', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.timerExpired();
      });
      expect(result.current.state).toBe('defeat');

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.state).toBe('defeat');
    });
  });

  // ==============================================
  // HP PERCENTAGE CALCULATION TESTS
  // ==============================================

  describe('HP Percentage Calculation', () => {
    it('should calculate HP percentage correctly', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      expect(result.current.hpPercentage).toBe(100);

      act(() => {
        result.current.dealDamage(500);
      });
      expect(result.current.hpPercentage).toBe(50);

      act(() => {
        result.current.dealDamage(250);
      });
      expect(result.current.hpPercentage).toBe(25);
    });

    it('should round HP percentage to integer', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      // 333 damage leaves 667 HP = 66.7% -> should round to 67
      act(() => {
        result.current.dealDamage(333);
      });

      expect(result.current.hpPercentage).toBe(67);
    });

    it('should handle 0 maxHP edge case', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 0, bossId: 'test-boss' }));

      expect(result.current.hpPercentage).toBe(0);
    });
  });

  // ==============================================
  // EDGE CASE TESTS
  // ==============================================

  describe('Edge Cases', () => {
    it('should handle negative damage (healing not allowed)', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(500);
      });
      expect(result.current.context.hp).toBe(500);

      // Negative damage should be treated as 0 or ignored
      act(() => {
        result.current.dealDamage(-100);
      });

      // HP should not increase (no healing)
      expect(result.current.context.hp).toBeLessThanOrEqual(500);
    });

    it('should handle zero damage', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });

      act(() => {
        result.current.dealDamage(0);
      });

      expect(result.current.context.hp).toBe(1000);
      expect(result.current.context.totalDamageDealt).toBe(0);
    });

    it('should work with different maxHP values', () => {
      const { result: result1 } = renderHook(() => useBossStateMachine({ maxHP: 500, bossId: 'test-boss' }));
      const { result: result2 } = renderHook(() => useBossStateMachine({ maxHP: 10000, bossId: 'test-boss' }));

      expect(result1.current.context.maxHP).toBe(500);
      expect(result2.current.context.maxHP).toBe(10000);
    });

    it('should work with different bossId values', () => {
      const { result: result1 } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'boss-1' }));
      const { result: result2 } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'lexicon-dragon' }));

      expect(result1.current.context.bossId).toBe('boss-1');
      expect(result2.current.context.bossId).toBe('lexicon-dragon');
    });

    it('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.startBattle();
      });
      act(() => {
        result.current.dealDamage(400);
      });

      expect(result.current.state).toBe('phase2');
      expect(result.current.context.hp).toBe(600);

      // Re-render the hook
      rerender();

      // State should persist
      expect(result.current.state).toBe('phase2');
      expect(result.current.context.hp).toBe(600);
    });
  });

  // ==============================================
  // SEND FUNCTION TESTS
  // ==============================================

  describe('Send Function', () => {
    it('should allow direct event sending via send()', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.send({ type: 'START_BATTLE' });
      });

      expect(result.current.state).toBe('phase1');
    });

    it('should handle DEAL_DAMAGE via send()', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.send({ type: 'START_BATTLE' });
      });
      act(() => {
        result.current.send({ type: 'DEAL_DAMAGE', amount: 100 });
      });

      expect(result.current.context.hp).toBe(900);
    });

    it('should handle TIMER_EXPIRED via send()', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.send({ type: 'START_BATTLE' });
      });
      act(() => {
        result.current.send({ type: 'TIMER_EXPIRED' });
      });

      expect(result.current.state).toBe('defeat');
    });

    it('should handle RESET via send()', () => {
      const { result } = renderHook(() => useBossStateMachine({ maxHP: 1000, bossId: 'test-boss' }));

      act(() => {
        result.current.send({ type: 'START_BATTLE' });
      });
      act(() => {
        result.current.send({ type: 'DEAL_DAMAGE', amount: 500 });
      });
      act(() => {
        result.current.send({ type: 'RESET' });
      });

      expect(result.current.state).toBe('intro');
      expect(result.current.context.hp).toBe(1000);
    });
  });

  // ==============================================
  // THRESHOLD CONSTANTS TESTS
  // ==============================================

  describe('Threshold Constants', () => {
    it('should export correct PHASE2_THRESHOLD', () => {
      expect(BOSS_PHASE_THRESHOLDS.PHASE2_THRESHOLD).toBe(66);
    });

    it('should export correct ENRAGED_THRESHOLD', () => {
      expect(BOSS_PHASE_THRESHOLDS.ENRAGED_THRESHOLD).toBe(33);
    });
  });
});
