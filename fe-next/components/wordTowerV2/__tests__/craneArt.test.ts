import { describe, expect, it } from 'vitest';
import { trolleyX } from '../craneArt';

describe('trolleyX', () => {
  it('given a block hanging straight down, when the jib is crossed, then the trolley is above it', () => {
    expect(trolleyX({ x: 0, y: -500 }, { x: 0, y: 0 }, -100)).toBe(0);
  });

  it('given a swung block, when the jib sits between pivot and hook, then the trolley rides the cable', () => {
    // Pivot 400 above the hook, block 80 right: halfway up the cable is 40 right.
    expect(trolleyX({ x: 0, y: -400 }, { x: 80, y: 0 }, -200)).toBeCloseTo(40, 6);
  });

  it('given a jib below the pivot line, when the cable is level, then no NaN', () => {
    expect(Number.isFinite(trolleyX({ x: 0, y: 0 }, { x: 50, y: 0 }, -10))).toBe(true);
  });
});
