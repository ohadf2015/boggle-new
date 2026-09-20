import { describe, it, expect } from 'vitest';
import { buildRunMap } from '@/lib/adventure/play/runMap';
import { mapScale, PHONE_SCALE, TV_SCALE, RAIL_PX, MAP_GUTTER_PX, layoutMap, mapHeight, rowY, ROW_GAP_PX, MAP_PAD_PX } from '../mapLayout';

const map = buildRunMap('seed-scale', 1);

describe('mapScale breakpoints', () => {
  it('Given a phone viewport, when the scale is read, then it is the narrow preset with no side rails', () => {
    expect(mapScale(390)).toEqual(PHONE_SCALE);
    expect(mapScale(390).rails).toBe(false);
    expect(mapScale(0)).toEqual(PHONE_SCALE);
  });

  it('Given a tablet viewport, when the scale is read, then the lattice widens and the nodes grow', () => {
    const s = mapScale(820);
    expect(s.maxW).toBeGreaterThan(PHONE_SCALE.maxW);
    expect(s.node).not.toBe(PHONE_SCALE.node);
  });

  it('Given ANY width where the rails turn on, then what is left for the lattice is still WIDER than the phone column', () => {
    // The rails cost 2 × RAIL_PX. If they are switched on before the remainder
    // clears the phone cap, a tablet draws a NARROWER map than a phone — which
    // is the exact "wider screen, worse map" failure this whole piece is about.
    for (let w = 320; w <= 2560; w += 4) {
      const s = mapScale(w);
      if (!s.rails) continue;
      expect(w - RAIL_PX * 2 - MAP_GUTTER_PX).toBeGreaterThanOrEqual(PHONE_SCALE.maxW);
    }
  });

  it('Given an iPad-portrait viewport, when the scale is read, then the rails stay OFF (they do not fit)', () => {
    expect(mapScale(768).rails).toBe(false);
    expect(mapScale(820).rails).toBe(false);
  });

  it('Given every width, when the scale is read, then maxW and the node tier never shrink as the screen grows', () => {
    let prevW = 0;
    const rank = { sm: 0, md: 1, lg: 2 } as const;
    let prevNode = -1;
    for (let w = 320; w <= 2560; w += 4) {
      const s = mapScale(w);
      expect(s.maxW).toBeGreaterThanOrEqual(prevW);
      expect(rank[s.node]).toBeGreaterThanOrEqual(prevNode);
      prevW = s.maxW;
      prevNode = rank[s.node];
    }
  });

  it('Given a TV viewport, when the scale is read, then the lattice is widest and the nodes are largest', () => {
    const s = mapScale(1280);
    expect(s).toEqual(TV_SCALE);
    expect(s.maxW).toBeGreaterThan(mapScale(820).maxW);
    expect(s.node).toBe('lg');
    expect(s.rails).toBe(true);
  });

  it('Given the TV preset, when the lattice is measured, then it is far wider than a phone column but capped well under 1280', () => {
    expect(TV_SCALE.maxW).toBeGreaterThanOrEqual(760);
    expect(TV_SCALE.maxW).toBeLessThanOrEqual(1000);
  });

  it('Given the TV preset, when the gutters are read, then they are TIGHTER than the phone so the lattice does not thin out', () => {
    expect(TV_SCALE.minX).toBeGreaterThan(PHONE_SCALE.minX);
    expect(TV_SCALE.maxX).toBeLessThan(PHONE_SCALE.maxX);
  });

  it('Given the TV preset, when the row gap is read, then it stays close to the phone gap so MORE rows stay on screen, not fewer', () => {
    expect(TV_SCALE.gap).toBeLessThanOrEqual(PHONE_SCALE.gap * 1.25);
  });
});

describe('mapLayout honours a scale', () => {
  it('Given no scale, when the map is laid out, then the phone geometry is unchanged (defaults)', () => {
    expect(layoutMap(map)).toEqual(layoutMap(map, PHONE_SCALE));
    expect(mapHeight(map.rows)).toBe(mapHeight(map.rows, PHONE_SCALE));
    expect(rowY(0, map.rows)).toBe(rowY(0, map.rows, PHONE_SCALE));
    expect(PHONE_SCALE.gap).toBe(ROW_GAP_PX);
    expect(PHONE_SCALE.pad).toBe(MAP_PAD_PX);
  });

  it('Given the TV scale, when the map is laid out, then every node stays inside the tighter gutters and lanes keep their order', () => {
    const laid = layoutMap(map, TV_SCALE);
    for (const n of laid) {
      expect(n.x).toBeGreaterThanOrEqual(TV_SCALE.minX);
      expect(n.x).toBeLessThanOrEqual(TV_SCALE.maxX);
    }
    const row0 = laid.filter((n) => n.node.row === 0).sort((a, b) => a.node.lane - b.node.lane);
    for (let i = 1; i < row0.length; i++) expect(row0[i].x).toBeGreaterThan(row0[i - 1].x);
  });

  it('Given the TV scale, when the height is computed, then it follows that scale gap and padding', () => {
    expect(mapHeight(map.rows, TV_SCALE)).toBe((map.rows - 1) * TV_SCALE.gap + TV_SCALE.pad * 2);
    expect(rowY(map.rows - 1, map.rows, TV_SCALE)).toBe(TV_SCALE.pad);
  });

  it('Given the boss row on any scale, when laid out, then it stays centred', () => {
    for (const s of [PHONE_SCALE, mapScale(820), TV_SCALE]) {
      expect(layoutMap(map, s).find((n) => n.node.kind === 'boss')!.x).toBe(50);
    }
  });
});
