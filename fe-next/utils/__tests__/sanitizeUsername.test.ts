/**
 * Regression: the multiplayer join/create emit sent the raw account display name
 * (profile.display_name, then the OAuth full_name / email prefix). None of those
 * ever agreed to the socket contract, so the room simply never opened:
 *
 *   Sentry 1YP / 22D / 22E / 22F — "hostUsername: Username must be at most 30 characters"
 *   Sentry 20B — "username: Invalid string: must match pattern /^[\p{L}\p{M}\p{N}\s._-]+$/u"
 *
 * An apostrophe ("O'Brien"), an emoji, or a long real name was enough.
 */
import { sanitizeUsername, NAME_VALID_PATTERN } from '../consts';
import { USERNAME_SOCKET_MAX } from '../../shared/constants/namePattern';

describe('sanitizeUsername', () => {
  it('clamps to the length the socket schema accepts', () => {
    const long = 'Bartholomew Fitzgerald-Wellington III';
    expect(long.length).toBeGreaterThan(USERNAME_SOCKET_MAX);
    expect(sanitizeUsername(long).length).toBeLessThanOrEqual(USERNAME_SOCKET_MAX);
  });

  it('strips characters the socket schema rejects', () => {
    expect(sanitizeUsername("O'Brien")).toBe('OBrien');
    expect(sanitizeUsername('Ohad 🎉')).toBe('Ohad');
  });

  it('keeps accents and non-Latin scripts intact', () => {
    expect(sanitizeUsername('Björn')).toBe('Björn');
    expect(sanitizeUsername('Дмитрий')).toBe('Дмитрий');
    expect(sanitizeUsername('אוהד')).toBe('אוהד');
  });

  it('never leaves trailing whitespace after clamping', () => {
    expect(sanitizeUsername(`${'a'.repeat(USERNAME_SOCKET_MAX - 1)} tail`)).toBe('a'.repeat(USERNAME_SOCKET_MAX - 1));
  });

  it('returns empty for input with nothing valid left, so callers can fall back', () => {
    expect(sanitizeUsername('🎉🎉')).toBe('');
    expect(sanitizeUsername('')).toBe('');
  });

  it('always produces something the shared pattern accepts', () => {
    for (const raw of ["O'Brien", 'Björn', 'Дмитрий  ', 'a'.repeat(60)]) {
      const cleaned = sanitizeUsername(raw);
      expect(NAME_VALID_PATTERN.test(cleaned)).toBe(true);
    }
  });
});
