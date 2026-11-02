import { describe, it, expect, beforeEach } from 'vitest';
import { getChosenGuestName, markGuestNameChosen, setGuestName } from '../guestManager';

describe('getChosenGuestName', () => {
  beforeEach(() => localStorage.clear());

  it('Given a guest who never picked a name, Then there is none to send', () => {
    setGuestName('Zigzag');
    expect(getChosenGuestName()).toBeNull();
  });

  it('Given a guest who picked a name, Then it is returned', () => {
    setGuestName('Zigzag');
    markGuestNameChosen();
    expect(getChosenGuestName()).toBe('Zigzag');
  });

  it('Given a guest who kept a generated name, Then it is not sent', () => {
    setGuestName('Sneaky Potato');
    markGuestNameChosen();
    expect(getChosenGuestName()).toBeNull();
  });
});
