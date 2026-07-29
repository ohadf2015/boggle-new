/**
 * useBossMechanics mirrorMatch Tests
 *
 * Tests for World 7 Reflection King's mirrorMatch twist mechanic.
 * Palindromes (words that read same forwards and backwards) get 3.0x bonus.
 * Minimum palindrome length is 3 characters.
 */

import { renderHook } from '@testing-library/react';
import { useBossMechanics } from '../useBossMechanics';

// ==============================================
// TEST DATA
// ==============================================

// World 7 boss uses mirrorMatch mechanic
const WORLD_7 = 7;

// Valid palindromes (3+ characters)
const VALID_PALINDROMES = ['RACECAR', 'LEVEL', 'CIVIC', 'RADAR', 'DEED', 'MOM', 'DAD', 'POP', 'NUN', 'EYE'];

// Non-palindromes
const NON_PALINDROMES = ['HELLO', 'WORLD', 'GAME', 'PLAY', 'WORDS', 'TEST', 'BOGGLE'];

// Edge cases
const TOO_SHORT_PALINDROMES = ['AA', 'BB', 'A', 'X'];
const MINIMUM_LENGTH_PALINDROME = 'ABA'; // Exactly 3 characters

// ==============================================
// TESTS
// ==============================================

describe('useBossMechanics - mirrorMatch', () => {
  describe('palindrome detection (positive cases)', () => {
    it.each(VALID_PALINDROMES)('should detect %s as a palindrome', (word) => {
      // GIVEN World 7 boss (mirrorMatch mechanic)
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a palindrome word
      const mechanicResult = result.current.checkWord(word);

      // THEN should meet requirement
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should detect RACECAR as palindrome', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking RACECAR
      const mechanicResult = result.current.checkWord('RACECAR');

      // THEN should be detected as palindrome
      expect(mechanicResult.meetsRequirement).toBe(true);
      expect(mechanicResult.scoreMultiplier).toBe(3.0);
    });

    it('should detect LEVEL as palindrome', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking LEVEL
      const mechanicResult = result.current.checkWord('LEVEL');

      // THEN should be detected as palindrome
      expect(mechanicResult.meetsRequirement).toBe(true);
      expect(mechanicResult.scoreMultiplier).toBe(3.0);
    });

    it('should detect CIVIC as palindrome', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking CIVIC
      const mechanicResult = result.current.checkWord('CIVIC');

      // THEN should be detected as palindrome
      expect(mechanicResult.meetsRequirement).toBe(true);
    });
  });

  describe('non-palindrome rejection (negative cases)', () => {
    it.each(NON_PALINDROMES)('should reject %s as not a palindrome', (word) => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a non-palindrome word
      const mechanicResult = result.current.checkWord(word);

      // THEN should NOT meet requirement
      expect(mechanicResult.meetsRequirement).toBe(false);
    });

    it('should reject HELLO as not a palindrome', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking HELLO
      const mechanicResult = result.current.checkWord('HELLO');

      // THEN should not meet requirement
      expect(mechanicResult.meetsRequirement).toBe(false);
      expect(mechanicResult.scoreMultiplier).toBe(1.0);
    });

    it('should reject WORLD as not a palindrome', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking WORLD
      const mechanicResult = result.current.checkWord('WORLD');

      // THEN should not meet requirement
      expect(mechanicResult.meetsRequirement).toBe(false);
    });
  });

  describe('edge cases (minimum length)', () => {
    it.each(TOO_SHORT_PALINDROMES)('should reject %s as too short (< 3 chars)', (word) => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a word shorter than 3 characters
      const mechanicResult = result.current.checkWord(word);

      // THEN should NOT meet requirement (minimum length is 3)
      expect(mechanicResult.meetsRequirement).toBe(false);
    });

    it('should accept ABA (exactly 3 characters - minimum length)', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a 3-character palindrome
      const mechanicResult = result.current.checkWord(MINIMUM_LENGTH_PALINDROME);

      // THEN should meet requirement (exactly at minimum)
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should reject AA (2 characters - below minimum)', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a 2-character palindrome-like word
      const mechanicResult = result.current.checkWord('AA');

      // THEN should not meet requirement (below minimum 3)
      expect(mechanicResult.meetsRequirement).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    it('should detect RaceCar as palindrome (mixed case)', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking mixed case palindrome
      const mechanicResult = result.current.checkWord('RaceCar');

      // THEN should be detected (case insensitive)
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should detect level (lowercase) as palindrome', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking lowercase palindrome
      const mechanicResult = result.current.checkWord('level');

      // THEN should be detected (case insensitive)
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should detect DEED (uppercase) as palindrome', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking uppercase palindrome
      const mechanicResult = result.current.checkWord('DEED');

      // THEN should be detected
      expect(mechanicResult.meetsRequirement).toBe(true);
    });
  });

  describe('score multipliers', () => {
    it('should apply 3.0x multiplier for palindromes', () => {
      // GIVEN World 7 boss (palindromeBonusMultiplier = 3.0)
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a palindrome
      const mechanicResult = result.current.checkWord('RADAR');

      // THEN score multiplier should be 3.0
      expect(mechanicResult.scoreMultiplier).toBe(3.0);
    });

    it('should apply 1.0x multiplier for non-palindromes', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a non-palindrome
      const mechanicResult = result.current.checkWord('GAME');

      // THEN score multiplier should be 1.0 (no bonus, no penalty)
      expect(mechanicResult.scoreMultiplier).toBe(1.0);
    });

    it('should not penalize non-palindromes (neutral 1.0x)', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking multiple non-palindromes
      for (const word of NON_PALINDROMES) {
        const mechanicResult = result.current.checkWord(word);
        // THEN should have neutral multiplier (1.0)
        expect(mechanicResult.scoreMultiplier).toBe(1.0);
      }
    });
  });

  describe('taunt triggers', () => {
    it('should trigger onMechanic taunt when palindrome found', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a palindrome
      const mechanicResult = result.current.checkWord('CIVIC');

      // THEN should trigger mechanic taunt
      expect(mechanicResult.triggerTaunt).toBe('onMechanic');
    });

    it('should not trigger taunt for non-palindromes', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a non-palindrome
      const mechanicResult = result.current.checkWord('HELLO');

      // THEN should not trigger taunt
      expect(mechanicResult.triggerTaunt).toBeUndefined();
    });
  });

  describe('feedback keys', () => {
    it('should return palindromeFound feedback key when palindrome detected', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a palindrome
      const mechanicResult = result.current.checkWord('LEVEL');

      // THEN should return appropriate feedback key
      expect(mechanicResult.feedbackKey).toBe('adventure.bosses.common.palindromeFound');
    });

    it('should return undefined feedback key for non-palindromes', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a non-palindrome
      const mechanicResult = result.current.checkWord('WORLD');

      // THEN should not have feedback key (no bonus)
      expect(mechanicResult.feedbackKey).toBeUndefined();
    });
  });

  describe('trigger effects', () => {
    it('should trigger effect when palindrome found', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a palindrome
      const mechanicResult = result.current.checkWord('MOM');

      // THEN should trigger visual effect
      expect(mechanicResult.triggerEffect).toBe(true);
    });

    it('should not trigger effect for non-palindromes', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // WHEN checking a non-palindrome
      const mechanicResult = result.current.checkWord('TEST');

      // THEN should not trigger effect
      expect(mechanicResult.triggerEffect).toBe(false);
    });
  });

  describe('hook return values', () => {
    it('should return boss config for World 7', () => {
      // GIVEN World 7
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // THEN should return Reflection King boss config
      expect(result.current.boss).toBeDefined();
      expect(result.current.boss?.id).toBe('reflectionKing');
      expect(result.current.boss?.twistMechanic.type).toBe('mirrorMatch');
    });

    it('should return isActive true for World 7 boss level', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // THEN should be active
      expect(result.current.isActive).toBe(true);
    });

    it('should return mirrorMatch mechanic description', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // THEN should have mechanic description
      expect(result.current.currentRequirement).toBe('adventure.bosses.reflectionKing.mechanic');
    });

    it('should return checkWord function', () => {
      // GIVEN World 7 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_7 })
      );

      // THEN should have checkWord function
      expect(typeof result.current.checkWord).toBe('function');
    });
  });
});
