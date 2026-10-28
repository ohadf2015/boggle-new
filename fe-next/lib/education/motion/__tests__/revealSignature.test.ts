import { describe, it, expect } from 'vitest';
import { REVEAL_SIGNATURES, pickRevealSignature, entranceOffset } from '../revealSignature';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('pickRevealSignature', () => {
  it('given different visits, when a signature is dealt, then the whole set is reachable, not one fixed entrance', () => {
    const names = new Set(REVEAL_SIGNATURES.map((_, i) => pickRevealSignature(seq((i + 0.5) / REVEAL_SIGNATURES.length, 0.5)).name));
    expect(names.size).toBe(REVEAL_SIGNATURES.length);
    expect(REVEAL_SIGNATURES.length).toBeGreaterThanOrEqual(4);
  });

  it('given any signature, when it starts an element, then it never grows from nothing or flies in from far away', () => {
    for (const sig of REVEAL_SIGNATURES) {
      for (let i = 0; i < 6; i++) {
        const o = entranceOffset(sig, i, seq(0, 0.99, 0.5));
        expect(o.scale).toBeGreaterThanOrEqual(0.85);
        expect(Math.abs(o.x)).toBeLessThanOrEqual(64);
        expect(Math.abs(o.y)).toBeLessThanOrEqual(48);
        expect(Math.abs(o.rotate)).toBeLessThanOrEqual(8);
      }
    }
  });

  it('given a sideways signature, when siblings enter, then they alternate sides so the page converges', () => {
    const slide = REVEAL_SIGNATURES.find((s) => s.name === 'slide')!;
    const a = entranceOffset(slide, 0, () => 0.5);
    const b = entranceOffset(slide, 1, () => 0.5);
    expect(Math.sign(a.x)).toBe(-Math.sign(b.x));
  });
});
