import { describe, it, expect } from 'vitest';
import { modeRevealKey } from '../modeRevealKey';

describe('modeRevealKey', () => {
  it.each([
    ['blast', 'countdown.modeReveal.blast'],
    ['word-hunt', 'countdown.modeReveal.wordHunt'],
    ['wheel-rush', 'countdown.modeReveal.wheelRush'],
    ['crossword', 'countdown.modeReveal.crossword'],
    ['word-tower', 'countdown.modeReveal.wordTower'],
    ['classic', 'countdown.modeReveal.classic'],
  ] as const)('%s → %s', (mode, key) => {
    expect(modeRevealKey(mode)).toBe(key);
  });

  it('falls back to classic for an unknown or missing mode', () => {
    expect(modeRevealKey(undefined)).toBe('countdown.modeReveal.classic');
  });
});
