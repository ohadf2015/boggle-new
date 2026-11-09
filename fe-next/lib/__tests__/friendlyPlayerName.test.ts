import { describe, it, expect } from 'vitest';
import { friendlyPlayerName, shownPlayerName } from '../friendlyPlayerName';

describe('shownPlayerName', () => {
  it('uses the chosen display name over a placeholder username', () => {
    expect(shownPlayerName({ id: 'a', display_name: 'Ohad', username: 'Player_9ed33e25' })).toBe('Ohad');
  });

  it('uses a real username when there is no display name', () => {
    expect(shownPlayerName({ id: 'a', display_name: null, username: 'wordwiz' })).toBe('wordwiz');
  });

  it('never shows a Player_<hex> id: gives a readable stand-in instead', () => {
    const name = shownPlayerName({ id: '9ed33e25-1111-2222-3333-444455556666', username: 'Player_9ed33e25' });
    expect(name).not.toMatch(/player_|[0-9a-f]{8}/i);
    expect(name.length).toBeGreaterThan(2);
  });

  it('gives the same stand-in for the same player every time', () => {
    const p = { id: 'cd211332-aaaa', username: 'Player_cd211332' };
    expect(shownPlayerName(p, 'he')).toBe(shownPlayerName(p, 'he'));
  });

  it('localizes the stand-in', () => {
    const he = friendlyPlayerName('x-1', 'he');
    expect(he).toMatch(/[֐-׿]/);
  });

  it('keeps one board free of duplicate stand-ins', () => {
    const taken = new Set<string>();
    const names = Array.from({ length: 10 }, (_, i) => friendlyPlayerName(`same-${i % 2}`, 'en', taken));
    expect(new Set(names).size).toBe(10);
  });
});
