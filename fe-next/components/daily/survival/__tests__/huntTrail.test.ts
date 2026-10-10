import { describe, it, expect } from 'vitest';
import { buildTrailPath, trailHeadPoint, isReleaseHoldActive, RELEASE_HOLD_MS } from '../huntTrail';

describe('buildTrailPath', () => {
  it('is empty for no points', () => {
    expect(buildTrailPath([])).toBe('');
  });

  it('draws a move from the first point to each next point', () => {
    expect(buildTrailPath([{ x: 10, y: 20 }, { x: 30, y: 20 }])).toBe('M10.0 20.0 L30.0 20.0');
  });
});

describe('trailHeadPoint', () => {
  it('is the first selected tile centre, where the head disc sits', () => {
    expect(trailHeadPoint([{ x: 5, y: 6 }, { x: 9, y: 9 }])).toEqual({ x: 5, y: 6 });
  });

  it('is null when nothing is selected', () => {
    expect(trailHeadPoint([])).toBeNull();
  });
});

describe('isReleaseHoldActive', () => {
  it('keeps the trail visible for the hold window after release', () => {
    expect(isReleaseHoldActive(0)).toBe(true);
    expect(isReleaseHoldActive(RELEASE_HOLD_MS - 1)).toBe(true);
  });

  it('drops the trail once the hold window has passed', () => {
    expect(isReleaseHoldActive(RELEASE_HOLD_MS)).toBe(false);
  });
});
