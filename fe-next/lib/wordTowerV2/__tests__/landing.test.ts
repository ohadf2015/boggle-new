import { describe, expect, it } from 'vitest';
import { classifyLanding } from '../landing';

const below = { x: 0, topY: -100, widthPx: 150 };

describe('classifyLanding', () => {
  it('given a block centred and level on the one below, when classified, then perfect', () => {
    expect(classifyLanding({ x: 2, bottomY: -100, angleRad: 0.01 }, below)).toBe('perfect');
  });

  it('given a small offset, when classified, then good', () => {
    expect(classifyLanding({ x: 25, bottomY: -100, angleRad: 0 }, below)).toBe('good');
  });

  it('given a large overhang, when classified, then sloppy', () => {
    expect(classifyLanding({ x: -60, bottomY: -100, angleRad: 0 }, below)).toBe('sloppy');
  });

  it('given a centred block that settled visibly tilted, when classified, then not perfect', () => {
    // Physics decides: a block rocking onto a corner is not a clean drop even if
    // its centre happens to line up.
    expect(classifyLanding({ x: 0, bottomY: -100, angleRad: 0.2 }, below)).not.toBe('perfect');
  });

  it('given a block that came to rest below the previous top, when classified, then miss', () => {
    expect(classifyLanding({ x: 200, bottomY: 0, angleRad: 0 }, below)).toBe('miss');
  });

  it('given no block below (first drop onto the ground), when classified, then judged against the ground centre', () => {
    expect(classifyLanding({ x: 0, bottomY: 0, angleRad: 0 }, null)).toBe('perfect');
    expect(classifyLanding({ x: 120, bottomY: 0, angleRad: 0 }, null)).toBe('sloppy');
  });
});
