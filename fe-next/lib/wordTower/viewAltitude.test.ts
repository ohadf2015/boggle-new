import { describe, it, expect } from 'vitest';
import { viewAltitudeFor } from './viewAltitude';

/**
 * The viewed altitude is what the camera is *looking at*, derived from the
 * committed climb height and the user's pan. Panning to the base (panY → panMin)
 * looks at ground (0 m); no pan (panY = 0) looks at the current top (heightM).
 * Height grows per-word (variable), so we interpolate by pan fraction along the
 * rendered tower rather than assuming a fixed metres-per-pixel.
 */
describe('viewAltitudeFor', () => {
  it('returns the full height when not panned (viewing the top)', () => {
    expect(viewAltitudeFor(800, 0, -1000)).toBe(800);
  });

  it('returns 0 (ground) when panned fully to the base', () => {
    expect(viewAltitudeFor(800, -1000, -1000)).toBe(0);
  });

  it('interpolates linearly at a partial pan', () => {
    expect(viewAltitudeFor(800, -500, -1000)).toBe(400);
  });

  it('returns the full height when there is no pan room (panMin = 0)', () => {
    expect(viewAltitudeFor(800, 0, 0)).toBe(800);
    expect(viewAltitudeFor(123, -50, 0)).toBe(123);
  });

  it('clamps over-pan past the base to ground', () => {
    expect(viewAltitudeFor(800, -2000, -1000)).toBe(0);
  });

  it('clamps a positive (above-top) pan to the top', () => {
    expect(viewAltitudeFor(800, 100, -1000)).toBe(800);
  });

  it('never returns a negative altitude', () => {
    expect(viewAltitudeFor(0, -1000, -1000)).toBe(0);
  });
});
