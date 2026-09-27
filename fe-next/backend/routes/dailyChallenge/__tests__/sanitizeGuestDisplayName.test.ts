/**
 * Word Hunt — guest display-name guard
 *
 * The daily leaderboard used to filter out every guest row, so whatever a
 * guest submitted as `displayName` (client-supplied, no validation anywhere
 * upstream) was written to the DB but never shown to anyone. Once guests are
 * included on the public leaderboard, that string is rendered for real —
 * this pins the minimal guard (length clamp + control-char strip) added at
 * the same time, so an unauthenticated curl request can't put an oversized
 * or control-character-laden string on the public board.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeGuestDisplayName } from '../utils';

describe('sanitizeGuestDisplayName', () => {
  it('passes through a normal name unchanged', () => {
    expect(sanitizeGuestDisplayName('WordNinja42')).toBe('WordNinja42');
  });

  it('falls back to Anonymous for a missing/non-string value', () => {
    expect(sanitizeGuestDisplayName(undefined)).toBe('Anonymous');
    expect(sanitizeGuestDisplayName(null)).toBe('Anonymous');
    expect(sanitizeGuestDisplayName(42)).toBe('Anonymous');
  });

  it('falls back to Anonymous for an empty or whitespace-only string', () => {
    expect(sanitizeGuestDisplayName('')).toBe('Anonymous');
    expect(sanitizeGuestDisplayName('   ')).toBe('Anonymous');
  });

  it('clamps to 40 characters', () => {
    const long = 'X'.repeat(500);
    const result = sanitizeGuestDisplayName(long);
    expect(result.length).toBe(40);
  });

  it('strips control characters (e.g. a smuggled newline or escape sequence)', () => {
    expect(sanitizeGuestDisplayName('Hi\x00\x1B[31mthere\x7F')).toBe('Hi[31mthere');
  });

  it('trims surrounding whitespace after stripping', () => {
    expect(sanitizeGuestDisplayName('  Spacey  ')).toBe('Spacey');
  });

  it('honors a custom fallback', () => {
    expect(sanitizeGuestDisplayName('', 'Guest Player')).toBe('Guest Player');
  });
});
