import { describe, it, expect } from 'vitest';
import { confettiColors } from '../confetti';

/**
 * confetti — the electric neo-brutalist palette for the TV celebration burst.
 * The burst must read as the game's mode color, so the accent is weighted
 * heaviest while a few electric supporters keep the party energy.
 */
describe('confettiColors', () => {
  it('weights the chosen accent the heaviest (the burst reads as the mode color)', () => {
    const pink = 0xff1493;
    const colors = confettiColors('neo-pink');
    const pinkCount = colors.filter((c) => c === pink).length;
    const otherMax = Math.max(
      ...[...new Set(colors.filter((c) => c !== pink))].map(
        (c) => colors.filter((x) => x === c).length,
      ),
    );
    expect(pinkCount).toBeGreaterThanOrEqual(otherMax);
    expect(pinkCount).toBeGreaterThan(1);
  });

  it('falls back to lime for an unknown accent', () => {
    const lime = 0xbfff00;
    expect(confettiColors('nonsense')).toContain(lime);
    expect(confettiColors(undefined)).toContain(lime);
  });

  it('returns a varied palette (several electric colors for party energy)', () => {
    const unique = new Set(confettiColors('neo-cyan'));
    expect(unique.size).toBeGreaterThanOrEqual(4);
  });

  it('returns only valid 24-bit colors', () => {
    for (const c of confettiColors('neo-purple')) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(0xffffff);
    }
  });
});
