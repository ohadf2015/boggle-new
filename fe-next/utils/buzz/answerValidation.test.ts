/**
 * Tests for Answer Validation Utilities
 *
 * Tests cover:
 * - String normalization
 * - Answer validation with and without alternatives
 * - Case-insensitive matching
 * - Edge cases (empty strings, whitespace)
 */

import {
  normalizeAnswer,
  validateAnswer,
  getAllValidAnswers,
  formatValidAnswers,
} from './answerValidation';

describe('normalizeAnswer', () => {
  // GIVEN: Various string formats
  // WHEN: Normalizing the strings
  // THEN: Should return uppercase, trimmed strings with single spaces

  test('should convert to uppercase', () => {
    expect(normalizeAnswer('hello')).toBe('HELLO');
    expect(normalizeAnswer('HeLLo')).toBe('HELLO');
  });

  test('should trim whitespace', () => {
    expect(normalizeAnswer('  hello  ')).toBe('HELLO');
    expect(normalizeAnswer('\thello\n')).toBe('HELLO');
  });

  test('should remove extra spaces', () => {
    expect(normalizeAnswer('hello   world')).toBe('HELLO WORLD');
    expect(normalizeAnswer('hello\t\tworld')).toBe('HELLO WORLD');
  });

  test('should handle empty string', () => {
    expect(normalizeAnswer('')).toBe('');
    expect(normalizeAnswer('   ')).toBe('');
  });

  test('should handle already normalized strings', () => {
    expect(normalizeAnswer('HELLO')).toBe('HELLO');
    expect(normalizeAnswer('HELLO WORLD')).toBe('HELLO WORLD');
  });
});

describe('validateAnswer', () => {
  // GIVEN: A correct answer and user input
  // WHEN: Validating the user's answer
  // THEN: Should return true if matches correct answer or alternatives

  describe('without alternatives', () => {
    test('should return true for exact match', () => {
      expect(validateAnswer('PITCH', 'PITCH')).toBe(true);
    });

    test('should return true for case-insensitive match', () => {
      expect(validateAnswer('pitch', 'PITCH')).toBe(true);
      expect(validateAnswer('PiTcH', 'PITCH')).toBe(true);
    });

    test('should return true for match with whitespace', () => {
      expect(validateAnswer('  PITCH  ', 'PITCH')).toBe(true);
      expect(validateAnswer('PITCH', '  PITCH  ')).toBe(true);
    });

    test('should return false for incorrect answer', () => {
      expect(validateAnswer('WRONG', 'PITCH')).toBe(false);
      expect(validateAnswer('RAISE', 'PITCH')).toBe(false);
    });

    test('should return false for partial match', () => {
      expect(validateAnswer('PIT', 'PITCH')).toBe(false);
      expect(validateAnswer('PITCHING', 'PITCH')).toBe(false);
    });

    test('should return false for empty answer', () => {
      expect(validateAnswer('', 'PITCH')).toBe(false);
      expect(validateAnswer('   ', 'PITCH')).toBe(false);
    });
  });

  describe('with alternatives', () => {
    test('should return true for correct answer', () => {
      expect(validateAnswer('PITCH', 'PITCH', ['RAISE', 'ERECT'])).toBe(true);
    });

    test('should return true for first alternative', () => {
      expect(validateAnswer('RAISE', 'PITCH', ['RAISE', 'ERECT'])).toBe(true);
    });

    test('should return true for second alternative', () => {
      expect(validateAnswer('ERECT', 'PITCH', ['RAISE', 'ERECT'])).toBe(true);
    });

    test('should return true for case-insensitive alternative match', () => {
      expect(validateAnswer('raise', 'PITCH', ['RAISE', 'ERECT'])).toBe(true);
      expect(validateAnswer('ErEcT', 'PITCH', ['RAISE', 'ERECT'])).toBe(true);
    });

    test('should return true for alternative with whitespace', () => {
      expect(validateAnswer('  RAISE  ', 'PITCH', ['RAISE', 'ERECT'])).toBe(true);
    });

    test('should return false for incorrect answer', () => {
      expect(validateAnswer('WRONG', 'PITCH', ['RAISE', 'ERECT'])).toBe(false);
    });

    test('should handle single alternative', () => {
      expect(validateAnswer('STOP', 'PARK', ['STOP'])).toBe(true);
      expect(validateAnswer('PARK', 'PARK', ['STOP'])).toBe(true);
      expect(validateAnswer('WRONG', 'PARK', ['STOP'])).toBe(false);
    });

    test('should handle empty alternatives array', () => {
      expect(validateAnswer('PITCH', 'PITCH', [])).toBe(true);
      expect(validateAnswer('WRONG', 'PITCH', [])).toBe(false);
    });

    test('should handle undefined alternatives', () => {
      expect(validateAnswer('PITCH', 'PITCH', undefined)).toBe(true);
      expect(validateAnswer('WRONG', 'PITCH', undefined)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle multi-word answers', () => {
      expect(validateAnswer('HELLO WORLD', 'HELLO WORLD')).toBe(true);
      expect(validateAnswer('hello world', 'HELLO WORLD')).toBe(true);
    });

    test('should handle numbers', () => {
      expect(validateAnswer('123', '123')).toBe(true);
      expect(validateAnswer('456', '123')).toBe(false);
    });

    test('should handle special characters', () => {
      expect(validateAnswer('HI!', 'HI!')).toBe(true);
      expect(validateAnswer('hi!', 'HI!')).toBe(true);
    });
  });
});

describe('getAllValidAnswers', () => {
  // GIVEN: A correct answer and alternatives
  // WHEN: Getting all valid answers
  // THEN: Should return array with all normalized valid answers

  test('should return only correct answer when no alternatives', () => {
    const result = getAllValidAnswers('PITCH');
    expect(result).toEqual(['PITCH']);
  });

  test('should return correct answer and alternatives', () => {
    const result = getAllValidAnswers('PITCH', ['RAISE', 'ERECT']);
    expect(result).toEqual(['PITCH', 'RAISE', 'ERECT']);
  });

  test('should normalize all answers', () => {
    const result = getAllValidAnswers('pitch', ['raise', 'erect']);
    expect(result).toEqual(['PITCH', 'RAISE', 'ERECT']);
  });

  test('should handle single alternative', () => {
    const result = getAllValidAnswers('PARK', ['STOP']);
    expect(result).toEqual(['PARK', 'STOP']);
  });

  test('should handle empty alternatives array', () => {
    const result = getAllValidAnswers('PITCH', []);
    expect(result).toEqual(['PITCH']);
  });

  test('should handle undefined alternatives', () => {
    const result = getAllValidAnswers('PITCH', undefined);
    expect(result).toEqual(['PITCH']);
  });

  test('should trim and normalize alternatives with whitespace', () => {
    const result = getAllValidAnswers('  PITCH  ', ['  RAISE  ', '  ERECT  ']);
    expect(result).toEqual(['PITCH', 'RAISE', 'ERECT']);
  });
});

describe('formatValidAnswers', () => {
  // GIVEN: A correct answer and alternatives
  // WHEN: Formatting for display
  // THEN: Should return user-friendly formatted string

  test('should return only correct answer when no alternatives', () => {
    const result = formatValidAnswers('PITCH');
    expect(result).toBe('PITCH');
  });

  test('should format with single alternative', () => {
    const result = formatValidAnswers('PARK', ['STOP']);
    expect(result).toBe('PARK (or STOP)');
  });

  test('should format with multiple alternatives', () => {
    const result = formatValidAnswers('PITCH', ['RAISE', 'ERECT']);
    expect(result).toBe('PITCH (or RAISE, ERECT)');
  });

  test('should normalize all answers before formatting', () => {
    const result = formatValidAnswers('pitch', ['raise', 'erect']);
    expect(result).toBe('PITCH (or RAISE, ERECT)');
  });

  test('should handle empty alternatives array', () => {
    const result = formatValidAnswers('PITCH', []);
    expect(result).toBe('PITCH');
  });

  test('should handle undefined alternatives', () => {
    const result = formatValidAnswers('PITCH', undefined);
    expect(result).toBe('PITCH');
  });

  test('should trim whitespace before formatting', () => {
    const result = formatValidAnswers('  PITCH  ', ['  RAISE  ', '  ERECT  ']);
    expect(result).toBe('PITCH (or RAISE, ERECT)');
  });
});
