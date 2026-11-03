import { describe, it, expect } from 'vitest';
import { dailySubmitName } from '../dailyDisplayName';

describe('dailySubmitName', () => {
  it('Given a signed-in player, Then their profile name is used', () => {
    expect(dailySubmitName({ profile: { display_name: 'Ohad', username: 'o' }, chosenGuestName: 'Zigzag', fallback: 'Player' })).toBe('Ohad');
    expect(dailySubmitName({ profile: { display_name: null, username: 'o' }, chosenGuestName: null, fallback: 'Player' })).toBe('o');
  });

  it('Given a guest who picked a name, Then that name is used', () => {
    expect(dailySubmitName({ profile: null, chosenGuestName: 'Zigzag', fallback: 'Player' })).toBe('Zigzag');
  });

  it('Given a guest without a chosen name, Then the plain fallback is used', () => {
    expect(dailySubmitName({ profile: null, chosenGuestName: null, fallback: 'Player' })).toBe('Player');
  });
});
