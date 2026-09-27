import { describe, it, expect } from 'vitest';
import { sanitizeGameCode } from '../sanitizeGameCode';

describe('sanitizeGameCode', () => {
  // Given-When-Then
  it('strips a trailing backslash (the JPX9SL\\ Sentry case JAVASCRIPT-NEXTJS-1NE)', () => {
    // Given a code copied with a stray backslash, When sanitized, Then the backslash is gone
    expect(sanitizeGameCode('JPX9SL\\')).toBe('JPX9SL');
  });

  it('strips all non-alphanumeric characters', () => {
    expect(sanitizeGameCode('AB-12 cd!')).toBe('AB12cd');
  });

  it('trims surrounding whitespace before stripping', () => {
    expect(sanitizeGameCode('  ABC123  ')).toBe('ABC123');
  });

  it('caps length at 10 characters (backend max)', () => {
    expect(sanitizeGameCode('ABCDEFGHIJKLMNOP')).toBe('ABCDEFGHIJ');
  });

  it('leaves a valid alphanumeric code untouched', () => {
    expect(sanitizeGameCode('JPX9SL')).toBe('JPX9SL');
  });

  it('returns empty string for purely non-alphanumeric input', () => {
    expect(sanitizeGameCode('---')).toBe('');
  });

  it('handles null/undefined defensively', () => {
    expect(sanitizeGameCode(undefined as unknown as string)).toBe('');
    expect(sanitizeGameCode(null as unknown as string)).toBe('');
  });

  it('preserves mixed case (backend upper-cases on validate)', () => {
    expect(sanitizeGameCode('abcDEF')).toBe('abcDEF');
  });
});
