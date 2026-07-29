/**
 * useBossMechanics scrambledReality Tests
 *
 * Tests for World 6 Puzzle Master's scrambledReality twist mechanic.
 * Enhanced mechanic detects anagram pairs (LISTEN/SILENT) for special bonus.
 * Fallback to unique letters >= 4 check when no anagram pair found.
 */

import { renderHook, act } from '@testing-library/react';
import { useBossMechanics } from '../useBossMechanics';

// ==============================================
// TEST DATA
// ==============================================

// World 6 boss uses scrambledReality mechanic
const WORLD_6 = 6;

// Valid anagram pairs (same letters, different order)
const ANAGRAM_PAIRS = [
  { word1: 'LISTEN', word2: 'SILENT' },
  { word1: 'HEART', word2: 'EARTH' },
  { word1: 'ANGEL', word2: 'ANGLE' },
  { word1: 'NIGHT', word2: 'THING' },
  { word1: 'DUSTY', word2: 'STUDY' },
];

// Non-anagram pairs (different letters)
const NON_ANAGRAMS = [
  { word1: 'HELLO', word2: 'WORLD' },
  { word1: 'GAME', word2: 'PLAY' },
  { word1: 'CAT', word2: 'CATS' }, // Different lengths
];

// Words with 4+ unique letters (fallback requirement)
// TEST has only 3 unique (T, E, S) - T repeats
const WORDS_WITH_4_PLUS_UNIQUE = ['ABCD', 'WORD', 'GAME', 'PLAY', 'QUIZ', 'LISTEN'];

// Words with < 4 unique letters (fail fallback)
const WORDS_WITH_LESS_THAN_4_UNIQUE = ['AAA', 'ABBA', 'AAB', 'MAMA'];

// ==============================================
// UTILITY FUNCTION TESTS (areAnagrams)
// ==============================================

describe('useBossMechanics - scrambledReality', () => {
  describe('areAnagrams utility function', () => {
    it('should detect LISTEN and SILENT as anagrams', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking LISTEN then SILENT
      // First word sets up the foundWords state
      act(() => {
        result.current.checkWord('LISTEN');
      });
      // Second word should be detected as anagram of first
      const mechanicResult = result.current.checkWord('SILENT');

      // THEN should detect anagram pair
      expect(mechanicResult.meetsRequirement).toBe(true);
      expect(mechanicResult.feedbackKey).toBe('adventure.bosses.common.anagramPair');
    });

    it('should NOT detect same word as anagram of itself', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking LISTEN twice
      act(() => {
        result.current.checkWord('LISTEN');
      });
      const mechanicResult = result.current.checkWord('LISTEN');

      // THEN should NOT be an anagram pair (same word)
      // Should fall back to unique letters check
      expect(mechanicResult.feedbackKey).toBeUndefined();
    });

    it('should detect HEART and EARTH as anagrams', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking HEART then EARTH
      act(() => {
        result.current.checkWord('HEART');
      });
      const mechanicResult = result.current.checkWord('EARTH');

      // THEN should detect anagram pair
      expect(mechanicResult.meetsRequirement).toBe(true);
      expect(mechanicResult.feedbackKey).toBe('adventure.bosses.common.anagramPair');
    });

    it('should NOT detect HELLO and WORLD as anagrams', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking HELLO then WORLD
      act(() => {
        result.current.checkWord('HELLO');
      });
      const mechanicResult = result.current.checkWord('WORLD');

      // THEN should NOT be detected as anagram pair
      // feedbackKey should be undefined (unique letters fallback, no special bonus)
      expect(mechanicResult.feedbackKey).toBeUndefined();
    });

    it('should handle case insensitively: listen and SILENT', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking lowercase then uppercase
      act(() => {
        result.current.checkWord('listen');
      });
      const mechanicResult = result.current.checkWord('SILENT');

      // THEN should detect anagram pair (case insensitive)
      expect(mechanicResult.meetsRequirement).toBe(true);
      expect(mechanicResult.feedbackKey).toBe('adventure.bosses.common.anagramPair');
    });

    it('should NOT detect different length words as anagrams: CAT and CATS', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking CAT then CATS
      act(() => {
        result.current.checkWord('CAT');
      });
      const mechanicResult = result.current.checkWord('CATS');

      // THEN should NOT be detected as anagram pair (different lengths)
      expect(mechanicResult.feedbackKey).toBeUndefined();
    });

    it('should NOT detect empty strings as anagrams', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking empty string then another word
      act(() => {
        result.current.checkWord('');
      });
      const mechanicResult = result.current.checkWord('TEST');

      // THEN should NOT be detected as anagram pair
      expect(mechanicResult.feedbackKey).toBeUndefined();
    });
  });

  describe('anagram pair detection in mechanic', () => {
    it.each(ANAGRAM_PAIRS)(
      'should detect $word1 and $word2 as anagram pair',
      ({ word1, word2 }) => {
        // GIVEN World 6 boss
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: WORLD_6 })
        );

        // WHEN checking word1 then word2
        act(() => {
          result.current.checkWord(word1);
        });
        const mechanicResult = result.current.checkWord(word2);

        // THEN should detect anagram pair
        expect(mechanicResult.meetsRequirement).toBe(true);
        expect(mechanicResult.feedbackKey).toBe('adventure.bosses.common.anagramPair');
      }
    );

    it('should return anagramPair feedbackKey when anagram pair found', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN finding an anagram pair
      act(() => {
        result.current.checkWord('ANGEL');
      });
      const mechanicResult = result.current.checkWord('ANGLE');

      // THEN feedbackKey should be anagramPair
      expect(mechanicResult.feedbackKey).toBe('adventure.bosses.common.anagramPair');
    });

    it('should trigger onMechanic taunt when anagram pair found', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN finding an anagram pair
      act(() => {
        result.current.checkWord('DUSTY');
      });
      const mechanicResult = result.current.checkWord('STUDY');

      // THEN should trigger mechanic taunt
      expect(mechanicResult.triggerTaunt).toBe('onMechanic');
    });

    it('should apply 2.0x multiplier (anagramBonusMultiplier) when anagram pair found', () => {
      // GIVEN World 6 boss (anagramBonusMultiplier = 2.0)
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN finding an anagram pair
      act(() => {
        result.current.checkWord('NIGHT');
      });
      const mechanicResult = result.current.checkWord('THING');

      // THEN score multiplier should be 2.0
      expect(mechanicResult.scoreMultiplier).toBe(2.0);
    });
  });

  describe('fallback to unique letters check', () => {
    it('should pass with 4+ unique letters when no anagram pair (empty foundWords)', () => {
      // GIVEN World 6 boss with no previous words
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking a word with 4 unique letters (no prior foundWords)
      const mechanicResult = result.current.checkWord('ABCD');

      // THEN should meet requirement via unique letters fallback
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should fail with less than 4 unique letters when no anagram pair', () => {
      // GIVEN World 6 boss with no previous words
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking a word with only 1 unique letter
      const mechanicResult = result.current.checkWord('AAA');

      // THEN should NOT meet requirement
      expect(mechanicResult.meetsRequirement).toBe(false);
    });

    it.each(WORDS_WITH_4_PLUS_UNIQUE)(
      'should pass %s (4+ unique letters) via fallback',
      (word) => {
        // GIVEN World 6 boss
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: WORLD_6 })
        );

        // WHEN checking a word with 4+ unique letters
        const mechanicResult = result.current.checkWord(word);

        // THEN should meet requirement
        expect(mechanicResult.meetsRequirement).toBe(true);
      }
    );

    it.each(WORDS_WITH_LESS_THAN_4_UNIQUE)(
      'should fail %s (< 4 unique letters) when no anagram pair',
      (word) => {
        // GIVEN World 6 boss
        const { result } = renderHook(() =>
          useBossMechanics({ worldId: WORLD_6 })
        );

        // WHEN checking a word with < 4 unique letters
        const mechanicResult = result.current.checkWord(word);

        // THEN should NOT meet requirement
        expect(mechanicResult.meetsRequirement).toBe(false);
      }
    );

    it('should NOT return anagramPair feedbackKey for unique letters fallback', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking a word with 4+ unique letters (no anagram pair)
      const mechanicResult = result.current.checkWord('WORD');

      // THEN feedbackKey should be undefined (no special anagram bonus)
      expect(mechanicResult.feedbackKey).toBeUndefined();
    });

    it('should still trigger effect for unique letters fallback (meetsRequirement)', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking a word with 4+ unique letters (PLAY has 4 unique: P, L, A, Y)
      const mechanicResult = result.current.checkWord('PLAY');

      // THEN should trigger effect
      expect(mechanicResult.triggerEffect).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should use unique letters fallback with empty foundWords array', () => {
      // GIVEN World 6 boss (fresh, no words submitted yet)
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking first word
      const mechanicResult = result.current.checkWord('GAME');

      // THEN should use unique letters fallback
      expect(mechanicResult.meetsRequirement).toBe(true);
      expect(mechanicResult.feedbackKey).toBeUndefined();
    });

    it('should track found words across multiple submissions', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN submitting multiple words before anagram
      act(() => {
        result.current.checkWord('HELLO');
      });
      act(() => {
        result.current.checkWord('WORLD');
      });
      act(() => {
        result.current.checkWord('LISTEN');
      });

      // THEN submitting SILENT should detect anagram pair with LISTEN
      const mechanicResult = result.current.checkWord('SILENT');
      expect(mechanicResult.feedbackKey).toBe('adventure.bosses.common.anagramPair');
    });

    it('should find anagram pair from any previously found word', () => {
      // GIVEN World 6 boss with multiple words
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN submitting HEART among other words
      act(() => {
        result.current.checkWord('TEST');
      });
      act(() => {
        result.current.checkWord('HEART');
      });
      act(() => {
        result.current.checkWord('GAME');
      });

      // THEN submitting EARTH should detect anagram pair with HEART
      const mechanicResult = result.current.checkWord('EARTH');
      expect(mechanicResult.feedbackKey).toBe('adventure.bosses.common.anagramPair');
    });
  });

  describe('score multipliers', () => {
    it('should apply 2.0x multiplier for anagram pairs', () => {
      // GIVEN World 6 boss (anagramBonusMultiplier = 2.0)
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN finding anagram pair
      act(() => {
        result.current.checkWord('LISTEN');
      });
      const mechanicResult = result.current.checkWord('SILENT');

      // THEN score multiplier should be 2.0
      expect(mechanicResult.scoreMultiplier).toBe(2.0);
    });

    it('should apply 2.0x multiplier for unique letters fallback', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking word with 4+ unique letters (no anagram pair)
      const mechanicResult = result.current.checkWord('WORD');

      // THEN score multiplier should be 2.0
      expect(mechanicResult.scoreMultiplier).toBe(2.0);
    });

    it('should apply 1.0x multiplier when requirement not met', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking word with < 4 unique letters
      const mechanicResult = result.current.checkWord('AAA');

      // THEN score multiplier should be 1.0 (no bonus)
      expect(mechanicResult.scoreMultiplier).toBe(1.0);
    });
  });

  describe('taunt triggers', () => {
    it('should trigger onMechanic taunt when anagram pair found', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN finding anagram pair
      act(() => {
        result.current.checkWord('ANGEL');
      });
      const mechanicResult = result.current.checkWord('ANGLE');

      // THEN should trigger mechanic taunt
      expect(mechanicResult.triggerTaunt).toBe('onMechanic');
    });

    it('should trigger onMechanic taunt for unique letters fallback', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking word with 4+ unique letters
      const mechanicResult = result.current.checkWord('GAME');

      // THEN should trigger mechanic taunt
      expect(mechanicResult.triggerTaunt).toBe('onMechanic');
    });

    it('should NOT trigger taunt when requirement not met', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // WHEN checking word with < 4 unique letters
      const mechanicResult = result.current.checkWord('AAA');

      // THEN should NOT trigger taunt
      expect(mechanicResult.triggerTaunt).toBeUndefined();
    });
  });

  describe('hook return values', () => {
    it('should return boss config for World 6', () => {
      // GIVEN World 6
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // THEN should return Puzzle Master boss config
      expect(result.current.boss).toBeDefined();
      expect(result.current.boss?.id).toBe('puzzleMaster');
      expect(result.current.boss?.twistMechanic.type).toBe('scrambledReality');
    });

    it('should return isActive true for World 6 boss level', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // THEN should be active
      expect(result.current.isActive).toBe(true);
    });

    it('should return scrambledReality mechanic description', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // THEN should have mechanic description
      expect(result.current.currentRequirement).toBe('adventure.bosses.puzzleMaster.mechanic');
    });

    it('should return checkWord function', () => {
      // GIVEN World 6 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_6 })
      );

      // THEN should have checkWord function
      expect(typeof result.current.checkWord).toBe('function');
    });
  });
});
