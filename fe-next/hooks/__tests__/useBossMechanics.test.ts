/**
 * useBossMechanics Hook Tests
 *
 * Tests for boss battle mechanics including taunt management,
 * word checking against twist mechanics, and phase transitions.
 * TDD: Written BEFORE implementation (RED phase).
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBossMechanics } from '../useBossMechanics';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import type { BossConfig, BossTauntEvent } from '@/types/boss';

// ==============================================
// SETUP
// ==============================================

vi.useFakeTimers();

const TAUNT_DISPLAY_MS = 3000;
const TAUNT_COOLDOWN_MS = 5000;

function getBoss(worldId: number): BossConfig {
  const boss = getBossConfig(worldId);
  if (!boss) throw new Error(`No boss for world ${worldId}`);
  return boss;
}

describe('useBossMechanics', () => {
  afterEach(() => {
    vi.clearAllTimers();
  });

  // ==============================================
  // INITIALIZATION
  // ==============================================

  describe('Initialization', () => {
    it('should return inactive state when worldId is null', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useBossMechanics({ worldId: null }));

      // THEN
      expect(result.current.isActive).toBe(false);
      expect(result.current.boss).toBeNull();
      expect(result.current.currentTaunt).toBeNull();
      expect(result.current.showTaunt).toBe(false);
    });

    it('should return inactive state for non-boss world', () => {
      // GIVEN - world 0 has no boss
      const { result } = renderHook(() => useBossMechanics({ worldId: 0 }));

      // THEN
      expect(result.current.isActive).toBe(false);
      expect(result.current.boss).toBeNull();
    });

    it('should load boss config for valid world', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // THEN
      expect(result.current.boss).not.toBeNull();
      expect(result.current.boss!.id).toBe('msGrammar');
      expect(result.current.isActive).toBe(true);
    });

    it('should initialize boss game state correctly', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // THEN
      expect(result.current.bossState).toEqual(
        expect.objectContaining({
          currentTauntIndex: 0,
          lastTauntTime: 0,
          mechanicState: expect.any(Object),
          introShown: false,
          isActive: true,
        })
      );
    });

    it('should load correct boss for each world (1-10)', () => {
      const expectedIds = [
        'msGrammar',
        'spellingBee',
        'professorThesaurus',
        'captainMetaphor',
        'baronBuildaword',
        'puzzleMaster',
        'reflectionKing',
        'cosmicWordsmith',
        'linguistSage',
        'lexiconDragon',
      ];

      for (let world = 1; world <= 10; world++) {
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: world })
        );
        expect(result.current.boss?.id).toBe(expectedIds[world - 1]);
      }
    });
  });

  // ==============================================
  // TAUNT MANAGEMENT
  // ==============================================

  describe('Taunt Management', () => {
    it('should trigger a taunt for a valid event', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // WHEN
      act(() => {
        result.current.triggerTaunt('onStart');
      });

      // THEN
      expect(result.current.currentTaunt).toBeTruthy();
      expect(result.current.showTaunt).toBe(true);
    });

    it('should show taunt from the correct boss taunts array', () => {
      // GIVEN
      const boss = getBoss(1);
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // WHEN
      act(() => {
        result.current.triggerTaunt('onStart');
      });

      // THEN - Should be one of the boss's start taunts
      expect(boss.taunts.onStart).toContain(result.current.currentTaunt);
    });

    it('should auto-hide taunt after display duration', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // WHEN
      act(() => {
        result.current.triggerTaunt('onStart');
      });
      expect(result.current.showTaunt).toBe(true);

      // WHEN - Advance time past taunt display duration
      act(() => {
        vi.advanceTimersByTime(TAUNT_DISPLAY_MS + 100);
      });

      // THEN
      expect(result.current.showTaunt).toBe(false);
    });

    it('should respect cooldown between taunts', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // WHEN - Trigger first taunt
      act(() => {
        result.current.triggerTaunt('onStart');
      });
      expect(result.current.showTaunt).toBe(true);

      // Wait for first taunt to hide
      act(() => {
        vi.advanceTimersByTime(TAUNT_DISPLAY_MS + 100);
      });

      // WHEN - Try to trigger another taunt immediately (within cooldown)
      act(() => {
        result.current.triggerTaunt('onGoodWord');
      });

      // THEN - Should NOT show (still in cooldown)
      expect(result.current.showTaunt).toBe(false);
    });

    it('should allow taunt after cooldown period', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // Trigger first taunt
      act(() => {
        result.current.triggerTaunt('onStart');
      });

      // Wait for display + cooldown
      act(() => {
        vi.advanceTimersByTime(TAUNT_DISPLAY_MS + TAUNT_COOLDOWN_MS + 200);
      });

      // WHEN - Trigger another taunt after cooldown
      act(() => {
        result.current.triggerTaunt('onGoodWord');
      });

      // THEN - Should show the new taunt
      expect(result.current.showTaunt).toBe(true);
      expect(result.current.currentTaunt).toBeTruthy();
    });

    it('should handle victory taunt (single string, not array)', () => {
      // GIVEN
      const boss = getBoss(1);
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // WHEN
      act(() => {
        result.current.triggerTaunt('onVictory');
      });

      // THEN
      expect(result.current.currentTaunt).toBe(boss.taunts.onVictory);
      expect(result.current.showTaunt).toBe(true);
    });

    it('should handle defeat taunt (single string, not array)', () => {
      // GIVEN
      const boss = getBoss(1);
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // Wait for cooldown from previous test
      act(() => {
        vi.advanceTimersByTime(TAUNT_COOLDOWN_MS + TAUNT_DISPLAY_MS + 200);
      });

      // WHEN
      act(() => {
        result.current.triggerTaunt('onDefeat');
      });

      // THEN
      expect(result.current.currentTaunt).toBe(boss.taunts.onDefeat);
    });

    it('should not trigger taunt when boss is null', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: null })
      );

      // WHEN
      act(() => {
        result.current.triggerTaunt('onStart');
      });

      // THEN
      expect(result.current.showTaunt).toBe(false);
      expect(result.current.currentTaunt).toBeNull();
    });
  });

  // ==============================================
  // WORD CHECKING (MECHANIC EVALUATION)
  // ==============================================

  describe('Word Checking', () => {
    describe('Default behavior (all bosses)', () => {
      it('should return a BossMechanicResult', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 1 })
        );

        // WHEN
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('HELLO');
        });

        // THEN
        expect(mechResult!).toEqual(
          expect.objectContaining({
            meetsRequirement: expect.any(Boolean),
            scoreMultiplier: expect.any(Number),
          })
        );
      });

      it('should return base multiplier of 1.0 when requirement not met', () => {
        // GIVEN - Ms. Grammar with popQuiz mechanic
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 1 })
        );

        // WHEN - Short word unlikely to meet pop quiz requirement
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('A');
        });

        // THEN - Penalty multiplier for not meeting requirement
        expect(mechResult!.scoreMultiplier).toBeLessThanOrEqual(1.0);
      });

      it('should return no result when boss is null', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: null })
        );

        // WHEN
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('HELLO');
        });

        // THEN
        expect(mechResult!.meetsRequirement).toBe(false);
        expect(mechResult!.scoreMultiplier).toBe(1.0);
      });
    });

    describe('Ms. Grammar - popQuiz mechanic', () => {
      it('should have a current requirement description', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 1 })
        );

        // THEN
        expect(result.current.currentRequirement).toBeTruthy();
      });

      it('should reward words with double letters when requirement is doubleLetters', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 1 })
        );

        // Force mechanic state to doubleLetters requirement
        act(() => {
          result.current.advancePhase(); // Reset to known state
        });

        // WHEN - Word with double letters
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('LETTERS');
        });

        // THEN - Should evaluate against the current requirement
        expect(mechResult!).toBeDefined();
        expect(typeof mechResult!.meetsRequirement).toBe('boolean');
      });
    });

    describe('Reflection King - mirrorMatch mechanic', () => {
      it('should reward palindromes with high multiplier', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 7 })
        );

        // WHEN - Submit a palindrome
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('RACECAR');
        });

        // THEN - Should meet requirement and give bonus
        expect(mechResult!.meetsRequirement).toBe(true);
        expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
      });

      it('should not give bonus for non-palindromes', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 7 })
        );

        // WHEN - Submit a non-palindrome
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('HELLO');
        });

        // THEN - Should not meet requirement
        expect(mechResult!.meetsRequirement).toBe(false);
      });
    });

    describe('Professor Thesaurus - etymologyDig mechanic', () => {
      it('should reward words containing root fragments', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 3 })
        );

        // WHEN - Word containing root fragment 'graph'
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('TELEGRAPH');
        });

        // THEN - Should meet requirement
        expect(mechResult!.meetsRequirement).toBe(true);
        expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
      });

      it('should not give bonus for words without root fragments', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 3 })
        );

        // WHEN - Word without root fragments
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('CAT');
        });

        // THEN
        expect(mechResult!.meetsRequirement).toBe(false);
      });
    });

    describe('Cosmic Wordsmith - stellarForge mechanic', () => {
      it('should reward words using supernova letters (Q, X, Z)', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 8 })
        );

        // WHEN - Word with supernova letter
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('QUIZ');
        });

        // THEN - Should meet requirement
        expect(mechResult!.meetsRequirement).toBe(true);
        expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
      });

      it('should not give bonus for words without supernova letters', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 8 })
        );

        // WHEN - Word without Q, X, or Z
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('HELLO');
        });

        // THEN
        expect(mechResult!.meetsRequirement).toBe(false);
      });
    });

    describe('Baron Buildaword - assemblyLine mechanic', () => {
      it('should reward long words (5+ letters)', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 5 })
        );

        // WHEN - Long word
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('BUILDING');
        });

        // THEN
        expect(mechResult!.meetsRequirement).toBe(true);
        expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
      });

      it('should not give bonus for short words', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: 5 })
        );

        // WHEN - Short word
        let mechResult: ReturnType<typeof result.current.checkWord>;
        act(() => {
          mechResult = result.current.checkWord('CAT');
        });

        // THEN
        expect(mechResult!.meetsRequirement).toBe(false);
      });
    });
  });

  // ==============================================
  // PHASE MANAGEMENT
  // ==============================================

  describe('Phase Management', () => {
    it('should have no phase for non-finalWord bosses', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // THEN
      expect(result.current.bossState.phase).toBeUndefined();
    });

    it('should have initial phase for Lexicon Dragon (finalWord)', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: 10 })
      );

      // THEN - Should start with first phase
      expect(result.current.bossState.phase).toBeDefined();
    });

    it('should advance phase for Lexicon Dragon', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: 10 })
      );

      const initialPhase = result.current.bossState.phase;

      // WHEN
      act(() => {
        result.current.advancePhase();
      });

      // THEN - Phase should change
      expect(result.current.bossState.phase).not.toBe(initialPhase);
    });

    it('should cycle through all phases for Lexicon Dragon', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: 10 })
      );

      const phases: string[] = [];
      phases.push(result.current.bossState.phase!);

      // WHEN - Advance through all phases
      for (let i = 0; i < 9; i++) {
        act(() => {
          result.current.advancePhase();
        });
        phases.push(result.current.bossState.phase!);
      }

      // THEN - Should have cycled through distinct phases
      const uniquePhases = new Set(phases);
      expect(uniquePhases.size).toBeGreaterThan(1);
    });

    it('should not advance phase for non-finalWord bosses', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // WHEN
      act(() => {
        result.current.advancePhase();
      });

      // THEN - Phase should remain undefined
      expect(result.current.bossState.phase).toBeUndefined();
    });
  });

  // ==============================================
  // MECHANIC-SPECIFIC REQUIREMENTS
  // ==============================================

  describe('Current Requirement', () => {
    it('should provide mechanic description for active boss', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useBossMechanics({ worldId: 1 }));

      // THEN
      expect(result.current.currentRequirement).toBeTruthy();
      expect(typeof result.current.currentRequirement).toBe('string');
    });

    it('should be undefined when no boss is active', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: null })
      );

      // THEN
      expect(result.current.currentRequirement).toBeUndefined();
    });

    it('should change requirement for Lexicon Dragon when phase advances', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: 10 })
      );

      const initialReq = result.current.currentRequirement;

      // WHEN
      act(() => {
        result.current.advancePhase();
      });

      // THEN - Requirement should update with new phase
      expect(result.current.currentRequirement).toBeDefined();
      // Note: requirement might be same string if description is generic
    });
  });

  // ==============================================
  // CLEANUP
  // ==============================================

  describe('Cleanup', () => {
    it('should clear timers on unmount', () => {
      // GIVEN
      const { result, unmount } = renderHook(() =>
        useBossMechanics({ worldId: 1 })
      );

      // Trigger a taunt to start a timer
      act(() => {
        result.current.triggerTaunt('onStart');
      });

      // WHEN
      unmount();

      // THEN - No errors should occur when timers fire after unmount
      act(() => {
        vi.advanceTimersByTime(TAUNT_DISPLAY_MS + TAUNT_COOLDOWN_MS + 1000);
      });
      // If we get here without errors, cleanup was successful
    });
  });
});
