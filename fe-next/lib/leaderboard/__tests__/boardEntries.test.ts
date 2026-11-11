import { describe, it, expect } from 'vitest';
import { toBoardEntries } from '../boardEntries';

describe('toBoardEntries', () => {
  it('Given a picked title, Then the row shows it', () => {
    const [row] = toBoardEntries([{ player_id: 'a', display_name: 'Tali', chosen_title: 'NEMESIS', player_level: 61 }]);
    expect(row.title).toBe('NEMESIS');
  });

  it('Given no picked title, Then the row shows the level title', () => {
    const [row] = toBoardEntries([{ player_id: 'a', display_name: 'Tali', chosen_title: null, player_level: 25 }]);
    expect(row.title).toBe('LEXICAL_MASTER');
  });

  it('Given a generated default name with no real username, Then the row is left off the public board', () => {
    expect(toBoardEntries([{ player_id: 'a', display_name: 'Sneaky Potato', username: 'Player_1a2b3c4d' }])).toEqual([]);
  });

  it('Given a default display name but a real username, Then the row shows under the username', () => {
    const [row] = toBoardEntries([{ player_id: 'a', display_name: 'Sneaky Potato', username: 'tali_w' }]);
    expect(row.display_name).toBeUndefined();
    expect(row.username).toBe('tali_w');
  });
});
