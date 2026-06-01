import { describe, it, expect } from 'vitest';
import { isPlaceholderName, resolveRivalDisplayName } from '../pushDisplayName';

describe('isPlaceholderName', () => {
  it('flags DB default Player_<hex> usernames', () => {
    expect(isPlaceholderName('Player_00952ce3')).toBe(true);
    expect(isPlaceholderName('Player_abc12345')).toBe(true);
  });

  it('flags Player-XXXX guest names and Guest_* names', () => {
    expect(isPlaceholderName('Player-A1B2')).toBe(true);
    expect(isPlaceholderName('Guest_1234')).toBe(true);
    expect(isPlaceholderName('Guest')).toBe(true);
  });

  it('flags empty / whitespace / nullish', () => {
    expect(isPlaceholderName('')).toBe(true);
    expect(isPlaceholderName('   ')).toBe(true);
    expect(isPlaceholderName(null)).toBe(true);
    expect(isPlaceholderName(undefined)).toBe(true);
  });

  it('treats real names (incl. RTL + names containing "player") as real', () => {
    expect(isPlaceholderName('Ziv Benista')).toBe(false);
    expect(isPlaceholderName('אורפז איאסו')).toBe(false);
    expect(isPlaceholderName('PlayerOne')).toBe(false); // no separator → a chosen handle
    expect(isPlaceholderName('jennipattullo')).toBe(false);
  });
});

describe('resolveRivalDisplayName', () => {
  it('prefers the first non-placeholder candidate (display_name over username)', () => {
    // mirrors the real bug: lb.display_name has the name, lb.username is the placeholder
    expect(resolveRivalDisplayName(['Ziv Benista', 'Player_00952ce3'], 'he')).toBe('Ziv Benista');
  });

  it('falls through placeholder candidates to the next real one', () => {
    expect(resolveRivalDisplayName(['Player_00952ce3', 'realhandle'], 'en')).toBe('realhandle');
  });

  it('returns a localized generic noun when every candidate is a placeholder', () => {
    expect(resolveRivalDisplayName(['Player_00952ce3', 'Player_00952ce3'], 'en')).toBe('a rival');
    expect(resolveRivalDisplayName([null, ''], 'he')).toBe('יריב');
    expect(resolveRivalDisplayName(['Guest'], 'sv')).toBe('en rival');
    expect(resolveRivalDisplayName(['Player_x'], 'ja')).toBe('ライバル');
    expect(resolveRivalDisplayName([undefined], 'es')).toBe('un rival');
  });

  it('falls back to the English generic for an unknown locale', () => {
    expect(resolveRivalDisplayName([''], 'fr' as never)).toBe('a rival');
  });

  it('trims surrounding whitespace on a real name', () => {
    expect(resolveRivalDisplayName(['  Ziv  '], 'en')).toBe('Ziv');
  });
});
