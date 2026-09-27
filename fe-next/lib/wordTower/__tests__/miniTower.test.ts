import { describe, it, expect } from 'vitest';
import { miniTowerScaleMax, altToFraction, miniTowerZones, shouldShowMiniTower, MINI_TOWER_REVEAL_M } from '../miniTower';

describe('miniTowerScaleMax', () => {
  it('keeps a minimum scale so an early tower is not a sliver', () => {
    expect(miniTowerScaleMax(5, 0)).toBe(120);
  });
  it('grows with headroom above the climber and their best', () => {
    expect(miniTowerScaleMax(400, 0)).toBeGreaterThan(400);
    expect(miniTowerScaleMax(100, 800)).toBeGreaterThan(800); // best dominates
  });
});

describe('altToFraction', () => {
  it('maps base to 0 and the scale top to 1', () => {
    expect(altToFraction(0, 500)).toBe(0);
    expect(altToFraction(500, 500)).toBe(1);
  });
  it('clamps out-of-range altitudes', () => {
    expect(altToFraction(-50, 500)).toBe(0);
    expect(altToFraction(900, 500)).toBe(1);
  });
  it('is monotonic', () => {
    expect(altToFraction(100, 500)).toBeLessThan(altToFraction(200, 500));
  });
});

describe('miniTowerZones', () => {
  it('returns biome bands bottom→top within [0,1]', () => {
    const zones = miniTowerZones(1000);
    expect(zones.length).toBeGreaterThan(1);
    for (const z of zones) {
      expect(z.fromFrac).toBeGreaterThanOrEqual(0);
      expect(z.toFrac).toBeLessThanOrEqual(1);
      expect(z.toFrac).toBeGreaterThan(z.fromFrac);
    }
  });
  it('starts at the ground (city, frac 0) and the top zone reaches 1', () => {
    const zones = miniTowerZones(1000);
    expect(zones[0]!.id).toBe('city');
    expect(zones[0]!.fromFrac).toBe(0);
    expect(zones[zones.length - 1]!.toFrac).toBe(1);
  });
  it('drops zones beyond a small scale (low tower shows only reachable bands)', () => {
    const zones = miniTowerZones(120); // below the 150m stratosphere threshold
    expect(zones.every((z) => z.id !== 'orbit' && z.id !== 'galaxy')).toBe(true);
    expect(zones[zones.length - 1]!.toFrac).toBe(1);
  });
});

describe('shouldShowMiniTower — the rail earns its place only once there is a climb', () => {
  it('stays hidden on a fresh, short tower (nothing to navigate, all one grey band)', () => {
    expect(shouldShowMiniTower(0, 0)).toBe(false);
    expect(shouldShowMiniTower(5, 0)).toBe(false);
  });

  it('shows once the climb is taller than a screenful', () => {
    expect(shouldShowMiniTower(MINI_TOWER_REVEAL_M, 0)).toBe(true);
    expect(shouldShowMiniTower(400, 0)).toBe(true);
  });

  it('shows when the personal best is worth chasing even if today is short', () => {
    expect(shouldShowMiniTower(2, 300)).toBe(true);
  });
});
