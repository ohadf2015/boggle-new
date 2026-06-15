import { describe, it, expect } from 'vitest';
import { rivalScreenY, rivalsPassed, visibleRivalMarkers, rivalsFromLeaderboard, nearestRivalAbove, type RivalMarker } from '../rivals';

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

describe('nearestRivalAbove', () => {
  // rivals: Ann 40, Bo 100, Cy 300
  it('returns the closest record still above the viewer, with the gap to it', () => {
    const r = nearestRivalAbove(50, rivals)!;
    expect(r.id).toBe('b'); // Bo(100) is the next one up from 50 (Ann 40 already passed)
    expect(r.gapM).toBe(50);
  });
  it('skips records the viewer has already reached (height >= rival is passed)', () => {
    expect(nearestRivalAbove(100, rivals)!.id).toBe('c'); // exactly at Bo → chase Cy next
    expect(nearestRivalAbove(110, rivals)!.id).toBe('c');
  });
  it('returns null once every rival is below (nothing left to chase)', () => {
    expect(nearestRivalAbove(500, rivals)).toBeNull();
  });
  it('returns null for an empty rival set', () => {
    expect(nearestRivalAbove(10, [])).toBeNull();
  });
  it('rounds the gap up so "+0m" never shows while a rival is still ahead', () => {
    expect(nearestRivalAbove(99.4, rivals)!.gapM).toBe(1); // 0.6m to Bo → ceil → 1
  });
});

describe('rivalsFromLeaderboard', () => {
  const rows = [
    { playerId: 'me', isYou: true, username: 'Fish', bestHeightM: 583, highestBiome: 'nebula' },
    { playerId: 'p1', isYou: false, username: 'Ann', bestHeightM: 400, highestBiome: 'orbit', avatarEmoji: '🐙', avatarColor: '#f0f' },
    { playerId: 'p2', username: 'Bo', bestHeightM: 120, highestBiome: 'sky' },
    { playerId: 'p3', username: 'Zed', bestHeightM: 0 }, // never climbed → dropped
  ];

  it('excludes the viewer themselves (no "passed yourself")', () => {
    const out = rivalsFromLeaderboard(rows);
    expect(out.find((r) => r.name === 'Fish')).toBeUndefined();
    expect(out.map((r) => r.name)).toEqual(['Ann', 'Bo']);
  });

  it('drops records with no climb and respects max', () => {
    expect(rivalsFromLeaderboard(rows).every((r) => r.heightM > 0)).toBe(true);
    expect(rivalsFromLeaderboard(rows, 1)).toHaveLength(1);
  });

  it('carries highestBiome + avatar so the ghost tower can be themed', () => {
    const ann = rivalsFromLeaderboard(rows).find((r) => r.name === 'Ann')!;
    expect(ann.highestBiome).toBe('orbit');
    expect(ann.avatarEmoji).toBe('🐙');
    expect(ann.playerId).toBe('p1');
  });

  it('defaults a missing biome to city', () => {
    const bo = rivalsFromLeaderboard(rows).find((r) => r.name === 'Bo')!;
    expect(bo.highestBiome).toBe('sky');
    const noBiome = rivalsFromLeaderboard([{ playerId: 'x', username: 'X', bestHeightM: 10 }]);
    expect(noBiome[0]!.highestBiome).toBe('city');
  });

  it('carries the generated avatar CONFIG (not just emoji) so the rail can render a real face', () => {
    const cfg = { skin: 'tan', eyes: 'happy' } as unknown as NonNullable<RivalMarker['customAvatar']>;
    const out = rivalsFromLeaderboard([
      { playerId: 'p9', username: 'Ivy', bestHeightM: 50, avatarConfig: cfg, avatarImage: 'img.png' },
    ]);
    expect(out[0]!.customAvatar).toBe(cfg);
    expect(out[0]!.avatarImage).toBe('img.png');
  });

  it('leaves customAvatar null when the rival has no custom avatar (Avatar falls back to the seeded face)', () => {
    const out = rivalsFromLeaderboard([{ playerId: 'p10', username: 'Jo', bestHeightM: 30 }]);
    expect(out[0]!.customAvatar).toBeNull();
  });
});
