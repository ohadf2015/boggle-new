import { describe, expect, it } from 'vitest';
import { LOOK_UP_PX, clampLook, clampLookX, focusX } from '../look';

/**
 * Free look: the player drags the canvas to walk their own tower back down.
 * The clamp is the whole contract — you can look all the way to the street and
 * a little above the crane, and never off into empty space.
 */
describe('clampLook', () => {
  it('given no camera pan, when dragging down the tower, then it cannot go below the street', () => {
    expect(clampLook(-500, 0)).toBeCloseTo(0, 6);
  });

  it('given a panned-up camera, when looking down, then the street is reachable and no further', () => {
    expect(clampLook(-200, 640)).toBe(-200);
    expect(clampLook(-900, 640)).toBe(-640);
  });

  it('given a drag the other way, when looking up, then it stops just above the crane', () => {
    expect(clampLook(5000, 640)).toBe(LOOK_UP_PX);
    expect(clampLook(40, 640)).toBe(40);
  });
});

/**
 * Sideways pan: the camera centres on the first block, so a tower that walks
 * sideways needs the player to be able to walk after it — and stop somewhere.
 */
describe('focusX — the camera keeps the building framed (no sideways drag)', () => {
  it('given no tower yet, when framed, then the camera sits on the crane line', () => {
    expect(focusX(null, null)).toBe(0);
  });

  it('given a plumb tower, when framed, then it is centred on the tower', () => {
    expect(focusX(12, 12)).toBe(12);
  });

  it('given a tower whose top walked sideways, when framed, then base and top share the screen', () => {
    // Centring on the base alone put a leaning top off the edge; that is what
    // the sideways drag used to exist for.
    expect(focusX(0, 120)).toBe(60);
    expect(focusX(-40, -160)).toBe(-100);
  });

  it('given only a base, when framed, then it is centred on the base', () => {
    expect(focusX(30, null)).toBe(30);
  });
});
describe('clampLookX', () => {
  it('given a pan inside the limit, when clamped, then it is untouched', () => {
    expect(clampLookX(120, 234)).toBe(120);
    expect(clampLookX(-120, 234)).toBe(-120);
  });

  it('given a pan past the limit, when clamped, then it stops at the limit either way', () => {
    expect(clampLookX(9000, 234)).toBe(234);
    expect(clampLookX(-9000, 234)).toBe(-234);
  });

  it('given a nonsense limit, when clamped, then it pins to centre rather than inverting', () => {
    expect(clampLookX(50, -10)).toBe(0);
  });
});
