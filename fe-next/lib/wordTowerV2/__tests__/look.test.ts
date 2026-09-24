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
describe('focusX — the whole swing stays on screen; the base shares it when it can', () => {
  // leanPx = how far the camera may sit from the crane line and still show the
  // swing's far end: half the view minus the swing's reach.
  it('given no tower yet, when framed, then the camera sits on the crane line', () => {
    expect(focusX(null, null, 200)).toBe(0);
  });

  it('given a plumb tower, when framed, then it is centred on the tower', () => {
    expect(focusX(12, 12, 200)).toBe(12);
  });

  it('given a small sideways walk, when framed, then base and top share the screen (midpoint)', () => {
    expect(focusX(0, 120, 200)).toBe(60);
    expect(focusX(-40, -160, 200)).toBe(-100);
  });

  it('given a top that walked far, when framed, then the swing wins and the base slides toward the edge', () => {
    const reach = 150;
    const halfW = 350; // leanPx = halfW - reach = 200
    for (const top of [500, -500, 900]) {
      const cam = focusX(0, top, halfW - reach);
      // Both ends of the swing are inside the view.
      expect(top + reach).toBeLessThanOrEqual(cam + halfW);
      expect(top - reach).toBeGreaterThanOrEqual(cam - halfW);
    }
  });

  it('given a swing wider than the view, when framed, then the camera stays on the crane line', () => {
    expect(focusX(0, 300, -50)).toBe(300);
  });

  it('given only a base, when framed, then it is centred on the base', () => {
    expect(focusX(30, null, 200)).toBe(30);
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
