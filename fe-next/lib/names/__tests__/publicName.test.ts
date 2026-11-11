import { describe, it, expect } from 'vitest';
import { isPublicName, publicNameIssue, publicNameOrNull, toPublicBoardRows } from '../publicName';

describe('isPublicName', () => {
  it('Given a name the player chose, Then it is public', () => {
    expect(isPublicName('Zigzag')).toBe(true);
    expect(isPublicName('PlayerOne')).toBe(true);
    expect(isPublicName('נועה')).toBe(true);
  });

  it('Given a system placeholder, Then it is not public', () => {
    expect(isPublicName('Player_00952ce3')).toBe(false);
    expect(isPublicName('Guest_12')).toBe(false);
    expect(isPublicName('')).toBe(false);
    expect(isPublicName(null)).toBe(false);
    expect(isPublicName(undefined)).toBe(false);
  });

  it('Given a generated default name in any case or numbered, Then it is not public', () => {
    expect(isPublicName('Sneaky Potato')).toBe(false);
    expect(isPublicName('sneaky  potato 2')).toBe(false);
    expect(isPublicName('פינגווין ערמומי')).toBe(false);
  });

  it('Given a profane name, Then it is not public', () => {
    expect(isPublicName('shit')).toBe(false);
    expect(isPublicName('big SHIT')).toBe(false);
  });

  it('Given a non-string, Then it is not public', () => {
    expect(isPublicName(42 as unknown as string)).toBe(false);
  });
});

describe('publicNameOrNull', () => {
  it('Given a padded chosen name, Then it returns it trimmed', () => {
    expect(publicNameOrNull('  Zigzag  ')).toBe('Zigzag');
  });

  it('Given a default name, Then it returns null', () => {
    expect(publicNameOrNull('Turbo Salmon')).toBeNull();
  });
});

describe('toPublicBoardRows', () => {
  it('Given board rows, Then rows with no public name are dropped and a non-public display name is cleared', () => {
    const rows = [
      { player_id: 'a', username: 'Player_00952ce3', display_name: null },
      { player_id: 'b', username: 'zed', display_name: 'Sneaky Potato' },
      { player_id: 'c', username: 'Real', display_name: 'Nice' },
      { player_id: 'd', username: 'shit', display_name: null },
    ];
    expect(toPublicBoardRows(rows)).toEqual([
      { player_id: 'b', username: 'zed', display_name: null },
      { player_id: 'c', username: 'Real', display_name: 'Nice' },
    ]);
  });

  it('Given a non-array (a bad cache read), Then it returns an empty list', () => {
    expect(toPublicBoardRows(null as unknown as [])).toEqual([]);
  });
});

describe('publicNameIssue', () => {
  it('Given each kind of rejected name, Then it says why', () => {
    expect(publicNameIssue('  ')).toBe('empty');
    expect(publicNameIssue('Player_1234abcd')).toBe('placeholder');
    expect(publicNameIssue('Turbo Salmon')).toBe('default');
    expect(publicNameIssue('shit')).toBe('profane');
    expect(publicNameIssue('Zigzag')).toBeNull();
  });
});
