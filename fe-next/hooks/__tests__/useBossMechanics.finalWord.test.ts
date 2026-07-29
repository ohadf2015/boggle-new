/**
 * useBossMechanics - finalWord Mechanic Tests
 *
 * Comprehensive tests for Lexicon Dragon (World 10) finalWord mechanic.
 * The finalWord mechanic cycles through all 9 previous boss mechanics.
 *
 * Tests verify:
 * - Phase cycling through all 9 mechanics
 * - Delegation to correct evaluator per phase
 * - State tracking and mechanicState updates
 */

import { renderHook, act } from '@testing-library/react';
import { useBossMechanics } from '../useBossMechanics';
import { getBossConfig } from '@/lib/adventure/bossConfig';

// ==============================================
// CONSTANTS
// ==============================================

/** World 10 = Lexicon Dragon with finalWord mechanic */
const WORLD_10 = 10;

/** World 1 = Ms. Grammar with popQuiz mechanic (for comparison) */
const WORLD_1 = 1;

/** Phase order matching bossConfig for finalWord mechanic */
const PHASE_ORDER = [
  'popQuiz',
  'hiveMind',
  'etymologyDig',
  'idiomBattle',
  'assemblyLine',
  'scrambledReality',
  'mirrorMatch',
  'stellarForge',
  'babelSummit',
] as const;

// ==============================================
// TESTS
// ==============================================

describe('useBossMechanics - finalWord mechanic (Lexicon Dragon)', () => {
  // ==============================================
  // INITIALIZATION
  // ==============================================

  describe('Initialization', () => {
    it('should load Lexicon Dragon for World 10', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // THEN
      expect(result.current.boss).not.toBeNull();
      expect(result.current.boss!.id).toBe('lexiconDragon');
      expect(result.current.isActive).toBe(true);
    });

    it('should have finalWord twist type', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // THEN
      expect(result.current.boss!.twistMechanic.type).toBe('finalWord');
    });

    it('should initialize with first phase (popQuiz)', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // THEN
      expect(result.current.bossState.phase).toBe('popQuiz');
      expect(result.current.bossState.mechanicState.currentPhase).toBe('popQuiz');
    });

    it('should have phaseOrder in params', () => {
      // GIVEN/WHEN
      const boss = getBossConfig(WORLD_10);

      // THEN
      expect(boss).not.toBeNull();
      expect(boss!.twistMechanic.params.phaseOrder).toBeDefined();
      expect(Array.isArray(boss!.twistMechanic.params.phaseOrder)).toBe(true);
      expect(boss!.twistMechanic.params.phaseOrder).toEqual(PHASE_ORDER);
    });

    it('should have all 9 phases in phaseOrder', () => {
      // GIVEN/WHEN
      const boss = getBossConfig(WORLD_10);
      const phaseOrder = boss!.twistMechanic.params.phaseOrder as string[];

      // THEN
      expect(phaseOrder.length).toBe(9);
    });
  });

  // ==============================================
  // PHASE MANAGEMENT
  // ==============================================

  describe('Phase Management', () => {
    it('should start at popQuiz phase', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // THEN
      expect(result.current.bossState.phase).toBe('popQuiz');
    });

    it('advancePhase should move to next phase (hiveMind)', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      expect(result.current.bossState.phase).toBe('popQuiz');

      // WHEN
      act(() => {
        result.current.advancePhase();
      });

      // THEN
      expect(result.current.bossState.phase).toBe('hiveMind');
    });

    it('advancePhase should cycle through all 9 phases in order', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // WHEN/THEN - Advance through all 9 phases
      for (let i = 0; i < PHASE_ORDER.length; i++) {
        const expectedPhase = PHASE_ORDER[i];
        expect(result.current.bossState.phase).toBe(expectedPhase);

        // Advance to next phase
        act(() => {
          result.current.advancePhase();
        });
      }

      // After 9 advances, should wrap back to popQuiz
      expect(result.current.bossState.phase).toBe('popQuiz');
    });

    it('advancePhase should wrap around after last phase (babelSummit -> popQuiz)', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // Advance to last phase (babelSummit)
      for (let i = 0; i < 8; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('babelSummit');

      // WHEN - Advance one more time
      act(() => {
        result.current.advancePhase();
      });

      // THEN - Should wrap back to first phase
      expect(result.current.bossState.phase).toBe('popQuiz');
    });

    it('non-finalWord bosses should NOT advance phase', () => {
      // GIVEN - World 1 has popQuiz mechanic, not finalWord
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_1 }));
      expect(result.current.bossState.phase).toBeUndefined();

      // WHEN
      act(() => {
        result.current.advancePhase();
      });

      // THEN - Phase should still be undefined
      expect(result.current.bossState.phase).toBeUndefined();
    });

    it('should track all unique phases when cycling', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      const visitedPhases = new Set<string>();

      // WHEN - Collect phases through one full cycle
      visitedPhases.add(result.current.bossState.phase!);
      for (let i = 0; i < 9; i++) {
        act(() => {
          result.current.advancePhase();
        });
        // Don't add after the 9th advance as it wraps
        if (i < 8) {
          visitedPhases.add(result.current.bossState.phase!);
        }
      }

      // THEN - Should have visited all 9 unique phases
      expect(visitedPhases.size).toBe(9);
      PHASE_ORDER.forEach((phase) => {
        expect(visitedPhases.has(phase)).toBe(true);
      });
    });
  });

  // ==============================================
  // MECHANIC DELEGATION
  // ==============================================

  describe('Mechanic Delegation', () => {
    it('when phase is popQuiz, should evaluate word against popQuiz mechanic', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      expect(result.current.bossState.phase).toBe('popQuiz');

      // WHEN - Word with double letters (one of popQuiz requirements)
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('LETTERS');
      });

      // THEN - Should evaluate against popQuiz mechanic
      expect(mechResult!).toBeDefined();
      expect(typeof mechResult!.meetsRequirement).toBe('boolean');
      expect(typeof mechResult!.scoreMultiplier).toBe('number');
    });

    it('when phase is mirrorMatch, RACECAR should trigger palindrome bonus', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // Advance to mirrorMatch phase (index 6)
      for (let i = 0; i < 6; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('mirrorMatch');

      // WHEN - Submit palindrome
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('RACECAR');
      });

      // THEN - Should meet requirement with bonus
      expect(mechResult!.meetsRequirement).toBe(true);
      expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
    });

    it('when phase is stellarForge, QUIZ should trigger supernova bonus', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // Advance to stellarForge phase (index 7)
      for (let i = 0; i < 7; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('stellarForge');

      // WHEN - Word with supernova letter (Q, X, Z)
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('QUIZ');
      });

      // THEN - Should meet requirement with bonus
      expect(mechResult!.meetsRequirement).toBe(true);
      expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
    });

    it('when phase is assemblyLine, long words should trigger compound bonus', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // Advance to assemblyLine phase (index 4)
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('assemblyLine');

      // WHEN - Long word (5+ letters)
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('BUILDING');
      });

      // THEN - Should meet requirement
      expect(mechResult!.meetsRequirement).toBe(true);
      expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
    });

    it('different phases should produce different multipliers for same word', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      const testWord = 'LEVEL'; // Palindrome, 5 letters, no Q/X/Z

      // WHEN - Test at mirrorMatch phase (palindrome bonus)
      for (let i = 0; i < 6; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('mirrorMatch');

      let mirrorResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mirrorResult = result.current.checkWord(testWord);
      });

      // Advance to stellarForge phase (no Q/X/Z = no bonus)
      act(() => {
        result.current.advancePhase();
      });
      expect(result.current.bossState.phase).toBe('stellarForge');

      let stellarResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        stellarResult = result.current.checkWord(testWord);
      });

      // THEN - LEVEL meets palindrome (mirrorMatch) but not supernova (stellarForge)
      expect(mirrorResult!.meetsRequirement).toBe(true);
      expect(stellarResult!.meetsRequirement).toBe(false);
      expect(mirrorResult!.scoreMultiplier).toBeGreaterThan(stellarResult!.scoreMultiplier);
    });

    it('when phase is etymologyDig, words with root fragments should get bonus', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // Advance to etymologyDig phase (index 2)
      for (let i = 0; i < 2; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('etymologyDig');

      // WHEN - Word with root fragment 'tele'
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('TELEPHONE');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
      expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
    });

    it('when phase is hiveMind, long words should trigger synonym bonus', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // Advance to hiveMind phase (index 1)
      act(() => {
        result.current.advancePhase();
      });
      expect(result.current.bossState.phase).toBe('hiveMind');

      // WHEN - Word with double letters (hiveMind checks for consecutive repeated letters)
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('BUZZING');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
      expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
    });

    it('when phase is idiomBattle, very long words should get bonus', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // Advance to idiomBattle phase (index 3)
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('idiomBattle');

      // WHEN - Word where first letter == last letter (idiomBattle checks for "full circle" words)
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('TRUST');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
      expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
    });

    it('when phase is scrambledReality, words with unique letters should get bonus', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // Advance to scrambledReality phase (index 5)
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('scrambledReality');

      // WHEN - Word with 4+ unique letters
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('DRAGON');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
      expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
    });

    it('when phase is babelSummit, long universal words should get bonus', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // Advance to babelSummit phase (index 8)
      for (let i = 0; i < 8; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('babelSummit');

      // WHEN - Word with high letter diversity (>=80% unique letters, min 4 chars)
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('WORLD');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
      expect(mechResult!.scoreMultiplier).toBeGreaterThan(1.0);
    });
  });

  // ==============================================
  // STATE TRACKING
  // ==============================================

  describe('State Tracking', () => {
    it('bossState.phase should match mechanicState.currentPhase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // THEN - Initial state
      expect(result.current.bossState.phase).toBe(
        result.current.bossState.mechanicState.currentPhase
      );

      // WHEN - Advance a few phases
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.advancePhase();
        });

        // THEN - Should stay in sync
        expect(result.current.bossState.phase).toBe(
          result.current.bossState.mechanicState.currentPhase
        );
      }
    });

    it('advancePhase should update both phase and mechanicState.currentPhase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      const initialPhase = result.current.bossState.phase;
      const initialMechanicPhase = result.current.bossState.mechanicState.currentPhase;

      // WHEN
      act(() => {
        result.current.advancePhase();
      });

      // THEN
      expect(result.current.bossState.phase).not.toBe(initialPhase);
      expect(result.current.bossState.mechanicState.currentPhase).not.toBe(
        initialMechanicPhase
      );
      expect(result.current.bossState.phase).toBe(
        result.current.bossState.mechanicState.currentPhase
      );
    });

    it('currentRequirementIndex should increment with phase advances', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      const initialIndex = result.current.bossState.mechanicState
        .currentRequirementIndex as number;

      // WHEN
      act(() => {
        result.current.advancePhase();
      });

      // THEN
      const newIndex = result.current.bossState.mechanicState
        .currentRequirementIndex as number;
      expect(newIndex).toBe(initialIndex + 1);
    });

    it('currentRequirementIndex should continue incrementing through full cycle', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // WHEN - Advance through full cycle
      for (let i = 0; i < 9; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }

      // THEN - Index should be 9 (started at 0, incremented 9 times)
      const finalIndex = result.current.bossState.mechanicState
        .currentRequirementIndex as number;
      expect(finalIndex).toBe(9);
    });

    it('mechanicState should preserve other properties when phase advances', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // Check initial mechanicState has expected properties
      expect(result.current.bossState.mechanicState).toHaveProperty('currentPhase');
      expect(result.current.bossState.mechanicState).toHaveProperty(
        'currentRequirementIndex'
      );

      // WHEN
      act(() => {
        result.current.advancePhase();
      });

      // THEN - Properties should still exist
      expect(result.current.bossState.mechanicState).toHaveProperty('currentPhase');
      expect(result.current.bossState.mechanicState).toHaveProperty(
        'currentRequirementIndex'
      );
    });
  });

  // ==============================================
  // WORD EVALUATION PER PHASE
  // ==============================================

  describe('Word Evaluation per Phase', () => {
    it('should evaluate correctly in popQuiz phase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      expect(result.current.bossState.phase).toBe('popQuiz');

      // WHEN
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('HELLO');
      });

      // THEN - Should return valid result
      expect(mechResult!).toBeDefined();
      expect(typeof mechResult!.scoreMultiplier).toBe('number');
    });

    it('should evaluate correctly in hiveMind phase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      act(() => {
        result.current.advancePhase();
      });
      expect(result.current.bossState.phase).toBe('hiveMind');

      // WHEN - Word without double letters
      let noDoubleResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        noDoubleResult = result.current.checkWord('DRAGON');
      });

      // WHEN - Word with double letters
      let doubleResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        doubleResult = result.current.checkWord('BALLOON');
      });

      // THEN
      expect(noDoubleResult!.meetsRequirement).toBe(false);
      expect(doubleResult!.meetsRequirement).toBe(true);
    });

    it('should evaluate correctly in etymologyDig phase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      for (let i = 0; i < 2; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('etymologyDig');

      // WHEN - Word with root 'bio'
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('BIOLOGY');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
    });

    it('should evaluate correctly in idiomBattle phase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('idiomBattle');

      // WHEN - Word where first letter == last letter
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('COMIC');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
    });

    it('should evaluate correctly in assemblyLine phase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('assemblyLine');

      // WHEN - Word with common prefix/suffix (assemblyLine checks for affixes)
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('RUNNING');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
    });

    it('should evaluate correctly in scrambledReality phase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('scrambledReality');

      // WHEN - Word with 4+ unique letters
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('SCRAMBLE');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
    });

    it('should evaluate correctly in mirrorMatch phase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      for (let i = 0; i < 6; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('mirrorMatch');

      // WHEN - Palindrome
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('KAYAK');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
    });

    it('should evaluate correctly in stellarForge phase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      for (let i = 0; i < 7; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('stellarForge');

      // WHEN - Word with X
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('EXTRA');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
    });

    it('should evaluate correctly in babelSummit phase', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      for (let i = 0; i < 8; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('babelSummit');

      // WHEN - Word with high letter diversity
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('BRAIN');
      });

      // THEN
      expect(mechResult!.meetsRequirement).toBe(true);
    });

    it('should return scoreMultiplier appropriate for current phase mechanic', () => {
      // GIVEN - Test at mirrorMatch (3.0 multiplier for palindromes)
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      for (let i = 0; i < 6; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }
      expect(result.current.bossState.phase).toBe('mirrorMatch');

      // WHEN - Palindrome
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('MOM');
      });

      // THEN - Should get palindrome multiplier
      expect(mechResult!.meetsRequirement).toBe(true);
      expect(mechResult!.scoreMultiplier).toBe(3.0);
    });
  });

  // ==============================================
  // EDGE CASES
  // ==============================================

  describe('Edge Cases', () => {
    it('should handle empty string word', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // WHEN
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('');
      });

      // THEN - Should return valid result (likely not meeting requirement)
      expect(mechResult!).toBeDefined();
      expect(typeof mechResult!.meetsRequirement).toBe('boolean');
    });

    it('should handle single character word', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // WHEN
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('A');
      });

      // THEN
      expect(mechResult!).toBeDefined();
    });

    it('should handle lowercase word input', () => {
      // GIVEN - At mirrorMatch phase for palindrome check
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      for (let i = 0; i < 6; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }

      // WHEN - Lowercase palindrome
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('racecar');
      });

      // THEN - Should work with lowercase
      expect(mechResult!.meetsRequirement).toBe(true);
    });

    it('should handle mixed case word input', () => {
      // GIVEN - At mirrorMatch phase
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));
      for (let i = 0; i < 6; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }

      // WHEN - Mixed case palindrome
      let mechResult: ReturnType<typeof result.current.checkWord>;
      act(() => {
        mechResult = result.current.checkWord('RaCeCaR');
      });

      // THEN - Should work with mixed case
      expect(mechResult!.meetsRequirement).toBe(true);
    });

    it('should maintain state through many rapid phase advances', () => {
      // GIVEN
      const { result } = renderHook(() => useBossMechanics({ worldId: WORLD_10 }));

      // WHEN - Rapidly advance many times (more than one full cycle)
      for (let i = 0; i < 25; i++) {
        act(() => {
          result.current.advancePhase();
        });
      }

      // THEN - State should be consistent
      expect(result.current.bossState.phase).toBe(
        result.current.bossState.mechanicState.currentPhase
      );
      // After 25 advances starting at popQuiz (index 0), should be at index 25 % 9 = 7 (stellarForge)
      expect(result.current.bossState.phase).toBe('stellarForge');
    });
  });
});
