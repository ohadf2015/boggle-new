import { describe, expect, it } from 'vitest';
import { LOOK_UP_PX, clampLook } from '../look';

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
