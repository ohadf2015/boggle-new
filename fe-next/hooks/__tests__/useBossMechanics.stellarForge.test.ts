/**
 * useBossMechanics stellarForge Tests
 *
 * Tests for World 8 Cosmic Wordsmith's stellarForge twist mechanic.
 * Words containing supernova letters (Q, X, Z) get 2.5x bonus.
 */

import { renderHook } from '@testing-library/react';
import { useBossMechanics } from '../useBossMechanics';

// ==============================================
// TEST DATA
// ==============================================

// World 8 boss uses stellarForge mechanic
const WORLD_8 = 8;

// Supernova letters from bossConfig
const SUPERNOVA_LETTERS = ['Q', 'X', 'Z'];

// Words with Q (supernova letter)
const Q_WORDS = ['QUIZ', 'QUAKE', 'QUEEN', 'QUICK', 'QUEST'];

// Words with X (supernova letter)
const X_WORDS = ['XENON', 'AXLE', 'MIXER', 'FLEX', 'NEXT'];

// Words with Z (supernova letter)
const Z_WORDS = ['ZEBRA', 'ZONE', 'FIZZ', 'ZERO', 'MAZE'];

// Words with multiple supernova letters
const MULTI_SUPERNOVA_WORDS = ['QUARTZ', 'MAXIMIZE', 'EQUINOX', 'SEIZE'];

// Words without any supernova letters
const NO_SUPERNOVA_WORDS = ['HELLO', 'WORLD', 'GAME', 'PLAY', 'LETTER', 'WORDS'];

// ==============================================
// TESTS
// ==============================================

describe('useBossMechanics - stellarForge', () => {
  describe('Q word detection (supernova letter)', () => {
    it.each(Q_WORDS)('should detect %s as containing supernova letter Q', (word) => {
      // GIVEN World 8 boss (stellarForge mechanic)
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a word with Q
      const mechanicResult = result.current.checkWord(word);

      // THEN should meet requirement
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should detect QUIZ as supernova word', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking QUIZ (contains Q)
      const mechanicResult = result.current.checkWord('QUIZ');

      // THEN should trigger supernova bonus
      expect(mechanicResult.meetsRequirement).toBe(true);
      expect(mechanicResult.scoreMultiplier).toBe(2.5);
    });

    it('should detect QUEEN as supernova word', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking QUEEN (contains Q)
      const mechanicResult = result.current.checkWord('QUEEN');

      // THEN should trigger supernova bonus
      expect(mechanicResult.meetsRequirement).toBe(true);
    });
  });

  describe('X word detection (supernova letter)', () => {
    it.each(X_WORDS)('should detect %s as containing supernova letter X', (word) => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a word with X
      const mechanicResult = result.current.checkWord(word);

      // THEN should meet requirement
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should detect XENON as supernova word', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking XENON (contains X)
      const mechanicResult = result.current.checkWord('XENON');

      // THEN should trigger supernova bonus
      expect(mechanicResult.meetsRequirement).toBe(true);
      expect(mechanicResult.scoreMultiplier).toBe(2.5);
    });

    it('should detect MIXER as supernova word (X in middle)', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking MIXER (X in middle)
      const mechanicResult = result.current.checkWord('MIXER');

      // THEN should detect X anywhere in word
      expect(mechanicResult.meetsRequirement).toBe(true);
    });
  });

  describe('Z word detection (supernova letter)', () => {
    it.each(Z_WORDS)('should detect %s as containing supernova letter Z', (word) => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a word with Z
      const mechanicResult = result.current.checkWord(word);

      // THEN should meet requirement
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should detect ZEBRA as supernova word', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking ZEBRA (contains Z)
      const mechanicResult = result.current.checkWord('ZEBRA');

      // THEN should trigger supernova bonus
      expect(mechanicResult.meetsRequirement).toBe(true);
      expect(mechanicResult.scoreMultiplier).toBe(2.5);
    });

    it('should detect FIZZ as supernova word (Z at end)', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking FIZZ (Z at end)
      const mechanicResult = result.current.checkWord('FIZZ');

      // THEN should detect Z anywhere in word
      expect(mechanicResult.meetsRequirement).toBe(true);
    });
  });

  describe('multiple supernova letters', () => {
    it.each(MULTI_SUPERNOVA_WORDS)('should detect %s with multiple supernova letters', (word) => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a word with multiple supernova letters
      const mechanicResult = result.current.checkWord(word);

      // THEN should meet requirement (at least one supernova letter)
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should detect QUARTZ (Q and Z) as supernova word', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking QUARTZ (contains Q and Z)
      const mechanicResult = result.current.checkWord('QUARTZ');

      // THEN should trigger bonus (one supernova letter is enough)
      expect(mechanicResult.meetsRequirement).toBe(true);
      expect(mechanicResult.scoreMultiplier).toBe(2.5);
    });

    it('should detect MAXIMIZE (X and Z) as supernova word', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking MAXIMIZE (contains X and Z)
      const mechanicResult = result.current.checkWord('MAXIMIZE');

      // THEN should trigger bonus
      expect(mechanicResult.meetsRequirement).toBe(true);
    });
  });

  describe('no supernova letter rejection', () => {
    it.each(NO_SUPERNOVA_WORDS)('should reject %s as not having supernova letters', (word) => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a word without Q/X/Z
      const mechanicResult = result.current.checkWord(word);

      // THEN should NOT meet requirement
      expect(mechanicResult.meetsRequirement).toBe(false);
    });

    it('should reject HELLO as not having supernova letters', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking HELLO (no Q/X/Z)
      const mechanicResult = result.current.checkWord('HELLO');

      // THEN should not meet requirement
      expect(mechanicResult.meetsRequirement).toBe(false);
      expect(mechanicResult.scoreMultiplier).toBe(1.0);
    });

    it('should reject WORLD as not having supernova letters', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking WORLD (no Q/X/Z)
      const mechanicResult = result.current.checkWord('WORLD');

      // THEN should not meet requirement
      expect(mechanicResult.meetsRequirement).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    it('should detect quiz (lowercase) as supernova word', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking lowercase word with supernova letter
      const mechanicResult = result.current.checkWord('quiz');

      // THEN should detect (case insensitive)
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should detect Quiz (mixed case) as supernova word', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking mixed case word
      const mechanicResult = result.current.checkWord('Quiz');

      // THEN should detect (case insensitive)
      expect(mechanicResult.meetsRequirement).toBe(true);
    });

    it('should detect QUIZ (uppercase) as supernova word', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking uppercase word
      const mechanicResult = result.current.checkWord('QUIZ');

      // THEN should detect
      expect(mechanicResult.meetsRequirement).toBe(true);
    });
  });

  describe('score multipliers', () => {
    it('should apply 2.5x multiplier for supernova words', () => {
      // GIVEN World 8 boss (supernovaBonusMultiplier = 2.5)
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a supernova word
      const mechanicResult = result.current.checkWord('ZONE');

      // THEN score multiplier should be 2.5
      expect(mechanicResult.scoreMultiplier).toBe(2.5);
    });

    it('should apply 1.0x multiplier for non-supernova words', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a non-supernova word
      const mechanicResult = result.current.checkWord('GAME');

      // THEN score multiplier should be 1.0 (neutral)
      expect(mechanicResult.scoreMultiplier).toBe(1.0);
    });

    it('should not penalize non-supernova words (neutral 1.0x)', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking multiple non-supernova words
      for (const word of NO_SUPERNOVA_WORDS) {
        const mechanicResult = result.current.checkWord(word);
        // THEN should have neutral multiplier (1.0)
        expect(mechanicResult.scoreMultiplier).toBe(1.0);
      }
    });
  });

  describe('taunt triggers', () => {
    it('should trigger onMechanic taunt when supernova letter found', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a supernova word
      const mechanicResult = result.current.checkWord('AXLE');

      // THEN should trigger mechanic taunt
      expect(mechanicResult.triggerTaunt).toBe('onMechanic');
    });

    it('should not trigger taunt for non-supernova words', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a non-supernova word
      const mechanicResult = result.current.checkWord('HELLO');

      // THEN should not trigger taunt
      expect(mechanicResult.triggerTaunt).toBeUndefined();
    });
  });

  describe('feedback keys', () => {
    it('should return supernovaWord feedback key when supernova letter detected', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a supernova word
      const mechanicResult = result.current.checkWord('FLEX');

      // THEN should return appropriate feedback key
      expect(mechanicResult.feedbackKey).toBe('adventure.bosses.common.supernovaWord');
    });

    it('should return undefined feedback key for non-supernova words', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a non-supernova word
      const mechanicResult = result.current.checkWord('WORLD');

      // THEN should not have feedback key (no bonus)
      expect(mechanicResult.feedbackKey).toBeUndefined();
    });
  });

  describe('trigger effects', () => {
    it('should trigger effect when supernova letter found', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a supernova word
      const mechanicResult = result.current.checkWord('NEXT');

      // THEN should trigger visual effect
      expect(mechanicResult.triggerEffect).toBe(true);
    });

    it('should not trigger effect for non-supernova words', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // WHEN checking a non-supernova word
      const mechanicResult = result.current.checkWord('PLAY');

      // THEN should not trigger effect
      expect(mechanicResult.triggerEffect).toBe(false);
    });
  });

  describe('hook return values', () => {
    it('should return boss config for World 8', () => {
      // GIVEN World 8
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // THEN should return Cosmic Wordsmith boss config
      expect(result.current.boss).toBeDefined();
      expect(result.current.boss?.id).toBe('cosmicWordsmith');
      expect(result.current.boss?.twistMechanic.type).toBe('stellarForge');
    });

    it('should return isActive true for World 8 boss level', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // THEN should be active
      expect(result.current.isActive).toBe(true);
    });

    it('should return stellarForge mechanic description', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // THEN should have mechanic description
      expect(result.current.currentRequirement).toBe('adventure.bosses.cosmicWordsmith.mechanic');
    });

    it('should return checkWord function', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // THEN should have checkWord function
      expect(typeof result.current.checkWord).toBe('function');
    });

    it('should have supernova letters configured as Q, X, Z', () => {
      // GIVEN World 8 boss
      const { result } = renderHook(() =>
        useBossMechanics({ worldId: WORLD_8 })
      );

      // THEN supernova letters should be Q, X, Z per config
      const params = result.current.boss?.twistMechanic.params;
      expect(params?.supernovaLetters).toEqual(['Q', 'X', 'Z']);
    });
  });
});
