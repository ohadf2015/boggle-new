import { describe, it, expect } from 'vitest';
import { zoneTeaseAt, ZONE_TEASE_WINDOW_M } from '../zoneTease';

describe('zoneTeaseAt', () => {
  it('is silent at the very start (next zone too far)', () => {
    expect(zoneTeaseAt(0)).toBeNull();
  });

  it('teases the next zone only inside the approach window', () => {
    // sky starts at 50m. Just outside the window → null; inside → tease.
    expect(zoneTeaseAt(50 - ZONE_TEASE_WINDOW_M - 1)).toBeNull();
    const t = zoneTeaseAt(50 - 10);
    expect(t).not.toBeNull();
    expect(t!.nextBiomeId).toBe('sky');
    expect(t!.metersToNext).toBe(10);
  });

  it('is silent mid-zone (just entered a zone, next is far)', () => {
    expect(zoneTeaseAt(160)).toBeNull(); // orbit(300) is 140m away
  });

  it('teases each upcoming threshold in turn', () => {
    expect(zoneTeaseAt(150 - 5)!.nextBiomeId).toBe('stratosphere');
    expect(zoneTeaseAt(300 - 5)!.nextBiomeId).toBe('orbit');
    expect(zoneTeaseAt(800 - 5)!.nextBiomeId).toBe('galaxy');
  });

  it('is silent at the top — galaxy has no next zone', () => {
    expect(zoneTeaseAt(800)).toBeNull();
    expect(zoneTeaseAt(5000)).toBeNull();
  });
});
