import { describe, expect, it } from 'vitest';
import { profileView } from '../estateServer';

/**
 * 637 of 735 prod profiles carry an auto-generated username that is literally
 * the uuid prefix (`Player_92546869` for id `92546869-c0e2-…`). Falling back to
 * it when `display_name` is blank is what made the empire screens print an id
 * where a name belongs.
 */
describe('profileView', () => {
  const id = '92546869-c0e2-42c7-abb2-1af73270485a';

  it('given a real display name, when viewed, then it wins', () => {
    expect(profileView(id, { display_name: 'Fish', username: 'אוהד' }).displayName).toBe('Fish');
  });

  it('given no display name but a human username, when viewed, then the username is used', () => {
    expect(profileView(id, { display_name: null, username: 'TowerBoss' }).displayName).toBe('TowerBoss');
  });

  it('given only the auto-generated Player_<id> username, when viewed, then no name is claimed', () => {
    expect(profileView(id, { display_name: null, username: 'Player_92546869' }).displayName).toBe('');
  });

  it('given no profile row at all, when viewed, then no name is claimed', () => {
    expect(profileView(id, undefined).displayName).toBe('');
  });

  it('given a blank display name, when viewed, then whitespace is not treated as a name', () => {
    expect(profileView(id, { display_name: '   ', username: 'Player_92546869' }).displayName).toBe('');
  });
});
