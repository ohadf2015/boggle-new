import { describe, it, expect } from 'vitest';
import { isPlaceholderName, resolveDisplayName } from '../displayName';

describe('isPlaceholderName', () => {
  it('treats nullish / empty / whitespace as placeholder', () => {
    expect(isPlaceholderName(null)).toBe(true);
    expect(isPlaceholderName(undefined)).toBe(true);
    expect(isPlaceholderName('')).toBe(true);
    expect(isPlaceholderName('   ')).toBe(true);
  });

  it('treats DB-generated Player_<hex> / Player-XXXX / Guest_* as placeholder', () => {
    expect(isPlaceholderName('Player_00952ce3')).toBe(true); // migration default = 'Player_' || substr(id,1,8)
    expect(isPlaceholderName('Player-4821')).toBe(true);
    expect(isPlaceholderName('Guest_1234')).toBe(true);
    expect(isPlaceholderName('Guest')).toBe(true);
  });

  it('treats a deliberately chosen handle as real', () => {
    expect(isPlaceholderName('PlayerOne')).toBe(false); // no separator after Player
    expect(isPlaceholderName('Guestavo')).toBe(false);
    expect(isPlaceholderName('Maya')).toBe(false);
  });
});

describe('resolveDisplayName', () => {
  it('returns the first real candidate, trimmed', () => {
    expect(resolveDisplayName([null, 'Maya'], 'a player')).toBe('Maya');
    expect(resolveDisplayName(['  Lior  '], 'a player')).toBe('Lior');
  });

  it('prefers an earlier real candidate (display name over username)', () => {
    expect(resolveDisplayName(['Maya', 'Player_00952ce3'], 'a player')).toBe('Maya');
  });

  it('skips a placeholder display name and uses a real username', () => {
    expect(resolveDisplayName(['Player_00952ce3', 'realhandle'], 'a player')).toBe('realhandle');
  });

  it('falls back to the provided fallback when every candidate is a placeholder', () => {
    expect(resolveDisplayName(['Player_00952ce3', 'Guest_99', null], 'a player')).toBe('a player');
    expect(resolveDisplayName([], 'a player')).toBe('a player');
  });
});
