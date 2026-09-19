import { describe, it, expect } from 'vitest';
import { resultHeld } from '../finaleHold';

describe('resultHeld — the result screen waits for the combat finale', () => {
  it('given a won fight whose kill banner is still up, then the result is held back', () => {
    expect(resultHeld({ defeated: true, dead: false }, false)).toBe(true);
  });
  it('given a lost fight whose defeat beat is still up, then the result is held back', () => {
    expect(resultHeld({ defeated: false, dead: true }, false)).toBe(true);
  });
  it('given the finale is over, then the result shows', () => {
    expect(resultHeld({ defeated: true, dead: false }, true)).toBe(false);
  });
  it('given no fight, or a fight that ended on the clock, then nothing is held', () => {
    expect(resultHeld(null, false)).toBe(false);
    expect(resultHeld({ defeated: false, dead: false }, false)).toBe(false);
  });
});
