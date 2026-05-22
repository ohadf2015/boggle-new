import { describe, it, expect } from 'vitest';
import { rivalScreenY, rivalsPassed, visibleRivalMarkers, type RivalMarker } from '../rivals';

const PX = 5;
const BUILD = 200; // build-line y
const rivals: RivalMarker[] = [
  { id: 'a', name: 'Ann', heightM: 40 },
  { id: 'b', name: 'Bo', heightM: 100 },
  { id: 'c', name: 'Cy', heightM: 300 },
];

describe('rivalScreenY', () => {
  it('places a same-height record at the build line', () => {
    expect(rivalScreenY(100, 100, BUILD, PX)).toBe(BUILD);
  });
  it('floats a higher record above the build line, a passed one below', () => {
    expect(rivalScreenY(150, 100, BUILD, PX)).toBeLessThan(BUILD); // 50m above viewer → higher
    expect(rivalScreenY(60, 100, BUILD, PX)).toBeGreaterThan(BUILD); // 40m below → passed, sinks
    expect(rivalScreenY(150, 100, BUILD, PX)).toBe(BUILD - 50 * PX);
  });
});

describe('rivalsPassed', () => {
  it('returns rivals crossed while climbing (exclusive lower, inclusive upper)', () => {
    expect(rivalsPassed(30, 110, rivals).map((r) => r.id)).toEqual(['a', 'b']);
    expect(rivalsPassed(40, 100, rivals).map((r) => r.id)).toEqual(['b']); // 40 already passed (exclusive), 100 inclusive
  });
  it('returns nothing when not climbing', () => {
    expect(rivalsPassed(100, 100, rivals)).toEqual([]);
    expect(rivalsPassed(120, 90, rivals)).toEqual([]);
  });
});

describe('visibleRivalMarkers', () => {
  it('keeps only records whose line is on-screen', () => {
    // viewer at 100, build 200, px 5, viewport 600
    // a(40): 200+(100-40)*5=500 ✓ ; b(100): 200 ✓ ; c(300): 200+(100-300)*5=-800 ✗
    const vis = visibleRivalMarkers(100, rivals, BUILD, 600, PX);
    expect(vis.map((m) => m.id)).toEqual(['a', 'b']);
    expect(vis.find((m) => m.id === 'b')!.screenY).toBe(200);
  });
  it('brings a high record into view as the viewer climbs toward it', () => {
    const vis = visibleRivalMarkers(280, rivals, BUILD, 600, PX); // near Cy(300)
    expect(vis.map((m) => m.id)).toContain('c');
  });
});
