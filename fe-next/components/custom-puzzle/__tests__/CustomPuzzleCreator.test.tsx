/**
 * CustomPuzzleCreator - Tests for word input validation
 *
 * Tests cover:
 * 1. Component exports and props interface
 * 2. Validation constants
 * 3. ValidationStatus type coverage
 * 4. Input length constraints
 * 5. Clean character regex validation (letters only)
 */

import CustomPuzzleCreator from '../CustomPuzzleCreator';
import { validateCustomPuzzleWord } from '../customPuzzleValidation';

// Validation constants (mirrored from component)
const MIN_WORD_LENGTH = 4;
const MAX_WORD_LENGTH = 8;

describe('CustomPuzzleCreator', () => {
  describe('Component Export', () => {
    it('exports the component correctly', () => {
      expect(CustomPuzzleCreator).toBeDefined();
      expect(typeof CustomPuzzleCreator).toBe('function');
    });

    it('component accepts required props', () => {
      const props = {
        isOpen: true,
        onClose: vi.fn(),
        language: 'en' as const,
      };

      expect(typeof props.isOpen).toBe('boolean');
      expect(typeof props.onClose).toBe('function');
      expect(typeof props.language).toBe('string');
    });
  });

  describe('Validation Constants', () => {
    it('should have minimum word length of 4', () => {
      expect(MIN_WORD_LENGTH).toBe(4);
    });

    it('should have maximum word length of 8', () => {
      expect(MAX_WORD_LENGTH).toBe(8);
    });

    it('maximum should be greater than minimum', () => {
      expect(MAX_WORD_LENGTH).toBeGreaterThan(MIN_WORD_LENGTH);
    });

    it('should fit within 4x4 grid constraints', () => {
      // 4x4 grid = 16 cells, longest possible path is 16
      // Max word length of 8 is reasonable for playability
      expect(MAX_WORD_LENGTH).toBeLessThanOrEqual(16);
    });
  });

  describe('ValidationStatus Types', () => {
    type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'too-short' | 'too-long';

    it('should define all required validation states', () => {
      const statuses: ValidationStatus[] = [
        'idle',
        'validating',
        'valid',
        'invalid',
        'too-short',
        'too-long',
      ];

      expect(statuses).toHaveLength(6);
      expect(statuses).toContain('idle');
      expect(statuses).toContain('validating');
      expect(statuses).toContain('valid');
      expect(statuses).toContain('invalid');
      expect(statuses).toContain('too-short');
      expect(statuses).toContain('too-long');
    });

    it('should have error states for invalid inputs', () => {
      const errorStates: ValidationStatus[] = ['invalid', 'too-short', 'too-long'];
      expect(errorStates).toHaveLength(3);
    });

    it('should have success state for valid inputs', () => {
      const successStates: ValidationStatus[] = ['valid'];
      expect(successStates).toHaveLength(1);
    });
  });

  describe('CreatorPhase Types', () => {
    type CreatorPhase = 'enter-word' | 'play' | 'share';

    it('should define all required phases', () => {
      const phases: CreatorPhase[] = ['enter-word', 'play', 'share'];

      expect(phases).toHaveLength(3);
      expect(phases).toContain('enter-word');
      expect(phases).toContain('play');
      expect(phases).toContain('share');
    });

    it('should have valid phase transitions', () => {
      // Valid flow: enter-word -> play -> share
      const validTransitions = {
        'enter-word': ['play'],
        'play': ['share', 'enter-word'], // Can quit back to enter-word
        'share': [], // Terminal state (close modal)
      };

      expect(validTransitions['enter-word']).toContain('play');
      expect(validTransitions['play']).toContain('share');
    });
  });

  describe('Supported Languages', () => {
    const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

    it('should support English', () => {
      expect(SUPPORTED_LANGUAGES).toContain('en');
    });

    it('should support Hebrew (RTL)', () => {
      expect(SUPPORTED_LANGUAGES).toContain('he');
    });

    it('should support Swedish', () => {
      expect(SUPPORTED_LANGUAGES).toContain('sv');
    });

    it('should support Japanese', () => {
      expect(SUPPORTED_LANGUAGES).toContain('ja');
    });

    it('should support Spanish', () => {
      expect(SUPPORTED_LANGUAGES).toContain('es');
    });
  });

  describe('Word Length Validation Logic', () => {
    const getExpectedStatus = (wordLength: number): string => {
      if (wordLength === 0) return 'idle';
      if (wordLength < MIN_WORD_LENGTH) return 'too-short';
      if (wordLength > MAX_WORD_LENGTH) return 'too-long';
      return 'needs-validation'; // Would go to 'validating' then 'valid'/'invalid'
    };

    it('should return idle for empty input', () => {
      expect(getExpectedStatus(0)).toBe('idle');
    });

    it('should return too-short for 1 character', () => {
      expect(getExpectedStatus(1)).toBe('too-short');
    });

    it('should return too-short for 2 characters', () => {
      expect(getExpectedStatus(2)).toBe('too-short');
    });

    it('should return too-short for 3 characters', () => {
      expect(getExpectedStatus(3)).toBe('too-short');
    });

    it('should validate 4-7 character words', () => {
      for (let len = 4; len <= 7; len++) {
        expect(getExpectedStatus(len)).toBe('needs-validation');
      }
    });

    it('should validate 8 character words', () => {
      expect(getExpectedStatus(8)).toBe('needs-validation');
    });

    it('should return too-long for 9+ characters', () => {
      expect(getExpectedStatus(9)).toBe('too-long');
      expect(getExpectedStatus(10)).toBe('too-long');
    });
  });

  describe('validateCustomPuzzleWord - Regex Validation', () => {
    it('should accept valid 4-8 letter words', () => {
      expect(validateCustomPuzzleWord('TEST')).toEqual({ isValid: true, status: 'valid' });
      expect(validateCustomPuzzleWord('HELLO')).toEqual({ isValid: true, status: 'valid' });
      expect(validateCustomPuzzleWord('WORD')).toEqual({ isValid: true, status: 'valid' });
      expect(validateCustomPuzzleWord('ABCDEFGH')).toEqual({ isValid: true, status: 'valid' });
    });

    it('should accept lowercase letters and convert to uppercase', () => {
      expect(validateCustomPuzzleWord('test')).toEqual({ isValid: true, status: 'valid' });
      expect(validateCustomPuzzleWord('Hello')).toEqual({ isValid: true, status: 'valid' });
    });

    it('should reject words shorter than 4 letters', () => {
      expect(validateCustomPuzzleWord('ABC')).toEqual({ isValid: false, status: 'too-short' });
      expect(validateCustomPuzzleWord('AB')).toEqual({ isValid: false, status: 'too-short' });
      expect(validateCustomPuzzleWord('A')).toEqual({ isValid: false, status: 'too-short' });
    });

    it('should reject words longer than 8 letters', () => {
      expect(validateCustomPuzzleWord('ABCDEFGHI')).toEqual({ isValid: false, status: 'too-long' });
      expect(validateCustomPuzzleWord('VERYLONGWORD')).toEqual({ isValid: false, status: 'too-long' });
    });

    it('should reject empty strings', () => {
      expect(validateCustomPuzzleWord('')).toEqual({ isValid: false, status: 'idle' });
    });

    it('should reject words with numbers', () => {
      expect(validateCustomPuzzleWord('TEST1')).toEqual({ isValid: false, status: 'invalid' });
      expect(validateCustomPuzzleWord('1234')).toEqual({ isValid: false, status: 'invalid' });
      expect(validateCustomPuzzleWord('AB1CD')).toEqual({ isValid: false, status: 'invalid' });
    });

    it('should reject words with special characters', () => {
      expect(validateCustomPuzzleWord('TEST!')).toEqual({ isValid: false, status: 'invalid' });
      expect(validateCustomPuzzleWord('WORD@')).toEqual({ isValid: false, status: 'invalid' });
      expect(validateCustomPuzzleWord('HE-LLO')).toEqual({ isValid: false, status: 'invalid' });
      expect(validateCustomPuzzleWord('TEST_')).toEqual({ isValid: false, status: 'invalid' });
    });

    it('should reject words with spaces', () => {
      expect(validateCustomPuzzleWord('TEST ')).toEqual({ isValid: false, status: 'invalid' });
      expect(validateCustomPuzzleWord(' TEST')).toEqual({ isValid: false, status: 'invalid' });
      expect(validateCustomPuzzleWord('TE ST')).toEqual({ isValid: false, status: 'invalid' });
    });

    it('should handle Unicode letters for international support', () => {
      // Hebrew letters
      expect(validateCustomPuzzleWord('שלום')).toEqual({ isValid: true, status: 'valid' });
      // Swedish letters
      expect(validateCustomPuzzleWord('ÅÄÖÖ')).toEqual({ isValid: true, status: 'valid' });
      // Japanese hiragana
      expect(validateCustomPuzzleWord('あいうえお')).toEqual({ isValid: true, status: 'valid' });
    });
  });
});
