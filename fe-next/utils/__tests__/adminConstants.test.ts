/**
 * Tests for Admin Constants
 * Verifies shared constants and utility functions
 */

import {
  ADMIN_LANGUAGES,
  CORE_LANGUAGES,
  MIN_WORD_LENGTH,
  WORD_LENGTH_RANGE,
  VALIDATION_STATUS_OPTIONS,
  ADMIN_API_TIMEOUT,
  getTodayDateString,
  getDefaultDateRange,
  formatDateShort,
  formatDateWithLabel,
  isToday,
  isPastDate,
  getLanguageByCode,
  getLanguageFlag,
  getLanguageName,
} from '@/lib/admin/constants';

describe('Admin Constants', () => {
  describe('ADMIN_LANGUAGES', () => {
    test('should include all 7 supported languages', () => {
      // THEN: Should have 7 languages
      expect(ADMIN_LANGUAGES).toHaveLength(7);
    });

    test('should include core languages (en, he, sv, ja)', () => {
      // THEN: Should include all core languages
      const codes = ADMIN_LANGUAGES.map((lang) => lang.code);
      expect(codes).toContain('en');
      expect(codes).toContain('he');
      expect(codes).toContain('sv');
      expect(codes).toContain('ja');
    });

    test('should have correct structure for each language', () => {
      // THEN: Each language should have code, name, and flag
      ADMIN_LANGUAGES.forEach((lang) => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('flag');
        expect(typeof lang.code).toBe('string');
        expect(typeof lang.name).toBe('string');
        expect(typeof lang.flag).toBe('string');
      });
    });
  });

  describe('CORE_LANGUAGES', () => {
    test('should include exactly 4 core languages', () => {
      // THEN: Should have 4 languages
      expect(CORE_LANGUAGES).toHaveLength(4);
    });

    test('should include en, he, sv, ja', () => {
      // THEN: Should include all core languages
      const codes = CORE_LANGUAGES.map((lang) => lang.code);
      expect(codes).toEqual(['en', 'he', 'sv', 'ja']);
    });
  });

  describe('MIN_WORD_LENGTH', () => {
    test('should have Hebrew with min length 2', () => {
      // THEN: Hebrew should be 2
      expect(MIN_WORD_LENGTH.he).toBe(2);
    });

    test('should have English with min length 3', () => {
      // THEN: English should be 3
      expect(MIN_WORD_LENGTH.en).toBe(3);
    });

    test('should have Japanese with min length 2', () => {
      // THEN: Japanese should be 2
      expect(MIN_WORD_LENGTH.ja).toBe(2);
    });
  });

  describe('WORD_LENGTH_RANGE', () => {
    test('should have min of 2 and max of 15', () => {
      // THEN: Range should be 2-15
      expect(WORD_LENGTH_RANGE.min).toBe(2);
      expect(WORD_LENGTH_RANGE.max).toBe(15);
    });
  });

  describe('VALIDATION_STATUS_OPTIONS', () => {
    test('should include all, pending, valid, invalid options', () => {
      // THEN: Should have 4 options
      expect(VALIDATION_STATUS_OPTIONS).toHaveLength(4);
      const values = VALIDATION_STATUS_OPTIONS.map((opt) => opt.value);
      expect(values).toContain('all');
      expect(values).toContain('pending');
      expect(values).toContain('valid');
      expect(values).toContain('invalid');
    });
  });

  describe('ADMIN_API_TIMEOUT', () => {
    test('should be set to 95 seconds', () => {
      // THEN: Should be 95000ms
      expect(ADMIN_API_TIMEOUT).toBe(95000);
    });
  });
});

describe('Date Utility Functions', () => {
  /**
   * Helper to get local date string in YYYY-MM-DD format.
   * Avoids timezone issues from toISOString() which returns UTC.
   */
  function getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  describe('getTodayDateString', () => {
    test('should return date in YYYY-MM-DD format', () => {
      // WHEN: Getting today's date string
      const result = getTodayDateString();

      // THEN: Should match YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should return today\'s date', () => {
      // GIVEN: Today's date in UTC (toISOString returns UTC)
      const today = new Date();
      const expected = today.toISOString().split('T')[0];

      // WHEN: Getting today's date string
      const result = getTodayDateString();

      // THEN: Should match today's UTC date
      expect(result).toBe(expected);
    });
  });

  describe('getDefaultDateRange', () => {
    test('should return 7 days range by default', () => {
      // WHEN: Getting default date range
      const result = getDefaultDateRange();

      // THEN: Should have start and end dates
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');

      // AND: End date should be today or very close (UTC vs local timezone may differ by 1 day)
      expect(result.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // AND: Start date should be 7 days ago
      const startDate = new Date(result.start + 'T00:00:00');
      const endDate = new Date(result.end + 'T00:00:00');
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      // Allow ±1 day tolerance for DST transitions and UTC conversion edge cases
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(7);
    });

    test('should accept custom number of days', () => {
      // WHEN: Getting 14 days range
      const result = getDefaultDateRange(14);

      // THEN: Start date should be 14 days ago
      const startDate = new Date(result.start + 'T00:00:00');
      const endDate = new Date(result.end + 'T00:00:00');
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      // Allow ±1 day tolerance for DST transitions and UTC conversion edge cases
      expect(diffDays).toBeGreaterThanOrEqual(13);
      expect(diffDays).toBeLessThanOrEqual(14);
    });
  });

  describe('formatDateShort', () => {
    test('should format date as "Mon DD"', () => {
      // WHEN: Formatting a date
      const result = formatDateShort('2025-01-15');

      // THEN: Should be in "Mon DD" format
      expect(result).toBe('Jan 15');
    });
  });

  describe('formatDateWithLabel', () => {
    test('should return "Today" for today\'s date', () => {
      // GIVEN: Today's date string (using local timezone)
      const today = getLocalDateString(new Date());

      // WHEN: Formatting today's date
      const result = formatDateWithLabel(today);

      // THEN: Should be "Today"
      expect(result).toBe('Today');
    });

    test('should return "Tomorrow" for tomorrow\'s date', () => {
      // GIVEN: Tomorrow's date string (using local timezone)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getLocalDateString(tomorrow);

      // WHEN: Formatting tomorrow's date
      const result = formatDateWithLabel(tomorrowStr);

      // THEN: Should be "Tomorrow"
      expect(result).toBe('Tomorrow');
    });

    test('should return formatted date for other dates', () => {
      // GIVEN: A date far in the future (using local timezone)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = getLocalDateString(futureDate);

      // WHEN: Formatting the date
      const result = formatDateWithLabel(futureDateStr);

      // THEN: Should not be "Today" or "Tomorrow"
      expect(result).not.toBe('Today');
      expect(result).not.toBe('Tomorrow');
    });
  });

  describe('isToday', () => {
    test('should return true for today\'s date', () => {
      // GIVEN: Today's date string (using local timezone)
      const today = getLocalDateString(new Date());

      // WHEN: Checking if it's today
      const result = isToday(today);

      // THEN: Should be true
      expect(result).toBe(true);
    });

    test('should return false for yesterday', () => {
      // GIVEN: Yesterday's date string (using local timezone)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      // WHEN: Checking if it's today
      const result = isToday(yesterdayStr);

      // THEN: Should be false
      expect(result).toBe(false);
    });
  });

  describe('isPastDate', () => {
    test('should return true for yesterday', () => {
      // GIVEN: Yesterday's date string (using local timezone)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      // WHEN: Checking if it's past
      const result = isPastDate(yesterdayStr);

      // THEN: Should be true
      expect(result).toBe(true);
    });

    test('should return false for today', () => {
      // GIVEN: Today's date string (using local timezone)
      const today = getLocalDateString(new Date());

      // WHEN: Checking if it's past
      const result = isPastDate(today);

      // THEN: Should be false
      expect(result).toBe(false);
    });

    test('should return false for tomorrow', () => {
      // GIVEN: Tomorrow's date string (using local timezone)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getLocalDateString(tomorrow);

      // WHEN: Checking if it's past
      const result = isPastDate(tomorrowStr);

      // THEN: Should be false
      expect(result).toBe(false);
    });
  });
});

describe('Language Utility Functions', () => {
  describe('getLanguageByCode', () => {
    test('should return language option for valid code', () => {
      // WHEN: Getting English
      const result = getLanguageByCode('en');

      // THEN: Should return English language option
      expect(result).toEqual({
        code: 'en',
        name: 'English',
        flag: '🇺🇸',
      });
    });

    test('should return undefined for invalid code', () => {
      // WHEN: Getting invalid language code
      // @ts-expect-error - Testing invalid input
      const result = getLanguageByCode('invalid');

      // THEN: Should return undefined
      expect(result).toBeUndefined();
    });
  });

  describe('getLanguageFlag', () => {
    test('should return flag emoji for valid code', () => {
      // WHEN: Getting Hebrew flag
      const result = getLanguageFlag('he');

      // THEN: Should return Israeli flag
      expect(result).toBe('🇮🇱');
    });

    test('should return empty string for invalid code', () => {
      // WHEN: Getting invalid language code
      // @ts-expect-error - Testing invalid input
      const result = getLanguageFlag('invalid');

      // THEN: Should return empty string
      expect(result).toBe('');
    });
  });

  describe('getLanguageName', () => {
    test('should return name for valid code', () => {
      // WHEN: Getting Swedish name
      const result = getLanguageName('sv');

      // THEN: Should return "Swedish"
      expect(result).toBe('Swedish');
    });

    test('should return uppercase code for invalid code', () => {
      // WHEN: Getting invalid language code
      // @ts-expect-error - Testing invalid input
      const result = getLanguageName('xyz');

      // THEN: Should return "XYZ"
      expect(result).toBe('XYZ');
    });
  });
});
