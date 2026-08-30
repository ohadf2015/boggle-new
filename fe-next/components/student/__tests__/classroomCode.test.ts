import { describe, it, expect } from 'vitest';
import { sanitizeClassroomCode } from '../classroomCode';

describe('sanitizeClassroomCode', () => {
  describe('valid plain codes', () => {
    it('accepts uppercase plain codes', () => {
      expect(sanitizeClassroomCode('ABC123')).toBe('ABC123');
    });

    it('accepts lowercase plain codes and converts to uppercase', () => {
      expect(sanitizeClassroomCode('abc123')).toBe('ABC123');
    });

    it('removes spaces from plain codes', () => {
      expect(sanitizeClassroomCode('ABC 123')).toBe('ABC123');
    });

    it('removes dashes from plain codes', () => {
      expect(sanitizeClassroomCode('ABC-123')).toBe('ABC123');
    });

    it('removes multiple spaces and dashes', () => {
      expect(sanitizeClassroomCode('A B C - 1 2 3')).toBe('ABC123');
    });

    it('trims leading and trailing whitespace', () => {
      expect(sanitizeClassroomCode('  ABC123  ')).toBe('ABC123');
    });
  });

  describe('pasted URLs with query params', () => {
    it('extracts code from ?code= query param', () => {
      expect(sanitizeClassroomCode('https://lexiclash.com/join?code=abc123')).toBe('ABC123');
    });

    it('extracts code from &code= query param', () => {
      expect(sanitizeClassroomCode('https://lexiclash.com/join?other=val&code=abc123')).toBe('ABC123');
    });

    it('ignores query params and uses last path segment if no ?code=', () => {
      expect(sanitizeClassroomCode('https://lexiclash.com/join/abc123?other=val')).toBe('ABC123');
    });
  });

  describe('pasted URLs with path segments', () => {
    it('extracts code from last path segment', () => {
      expect(sanitizeClassroomCode('https://lexiclash.com/join/abc123')).toBe('ABC123');
    });

    it('handles trailing slash', () => {
      expect(sanitizeClassroomCode('https://lexiclash.com/join/abc123/')).toBe('ABC123');
    });
  });

  describe('invalid inputs', () => {
    it('returns empty string for codes too short', () => {
      expect(sanitizeClassroomCode('ABC12')).toBe('');
    });

    it('returns empty string for codes too long', () => {
      expect(sanitizeClassroomCode('ABC1234567')).toBe('');
    });

    it('returns empty string for empty input', () => {
      expect(sanitizeClassroomCode('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(sanitizeClassroomCode('   ')).toBe('');
    });

    it('returns empty string for null', () => {
      expect(sanitizeClassroomCode(null as any)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(sanitizeClassroomCode(undefined as any)).toBe('');
    });

    it('returns empty string for non-string input', () => {
      expect(sanitizeClassroomCode(123 as any)).toBe('');
    });

    it('returns empty string for URLs without a valid code', () => {
      expect(sanitizeClassroomCode('https://lexiclash.com/join')).toBe('');
    });

    it('returns empty string for codes with invalid characters', () => {
      expect(sanitizeClassroomCode('ABC@123')).toBe('');
    });
  });
});
