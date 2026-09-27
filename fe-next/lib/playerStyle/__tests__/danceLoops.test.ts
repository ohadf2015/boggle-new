import { describe, it, expect } from 'vitest';
import { DANCE_LOOPS, pickDanceLoop } from '../danceLoops';
import { STYLE_KEYS } from '../styles';
import { ANIMATED_STYLE_MASCOTS } from '../animatedMascots';

describe('DANCE_LOOPS', () => {
  it('lists one transparent webp loop per non-default style', () => {
    const nonDefault = STYLE_KEYS.filter((k) => k !== 'default');
    expect(DANCE_LOOPS).toHaveLength(nonDefault.length);
  });

  it('only contains styles that actually ship an animated loop', () => {
    for (const loop of DANCE_LOOPS) {
      expect(ANIMATED_STYLE_MASCOTS[loop.key]).toBe(loop.src);
      expect(loop.src).toMatch(/^\/mascots\/styles\/.+\.(gif|webp)$/);
    }
  });

  it('includes the new k-pop loop', () => {
    expect(DANCE_LOOPS.map((l) => l.key)).toContain('k_pop');
  });

  it('never includes default (its art is an opaque JPG, not a free-floating dancer)', () => {
    expect(DANCE_LOOPS.map((l) => l.key)).not.toContain('default');
  });
});

describe('pickDanceLoop', () => {
  it('is deterministic — the same seed always yields the same loop (stable across SSR/CSR)', () => {
    expect(pickDanceLoop(7)).toEqual(pickDanceLoop(7));
  });

  it('wraps the seed modulo the loop count so any integer is valid', () => {
    const n = DANCE_LOOPS.length;
    expect(pickDanceLoop(n)).toEqual(pickDanceLoop(0));
    expect(pickDanceLoop(n * 3 + 2)).toEqual(pickDanceLoop(2));
  });

  it('handles negative seeds without throwing or returning undefined', () => {
    const picked = pickDanceLoop(-1);
    expect(DANCE_LOOPS).toContainEqual(picked);
  });

  it('always returns a real loop from the list', () => {
    for (let s = 0; s < 30; s++) {
      expect(DANCE_LOOPS).toContainEqual(pickDanceLoop(s));
    }
  });
});
