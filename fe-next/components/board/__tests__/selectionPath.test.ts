import { describe, it, expect } from 'vitest';
import {
  buildGeometry,
  hitTest,
  stepPath,
  samplesBetween,
  heatOf,
  type TileBox,
} from '../selectionPath';

function grid3(size = 100, gap = 10): TileBox[] {
  const letters = ['CAT', 'DOG', 'SUN'];
  const out: TileBox[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out.push({ row: r, col: c, letter: letters[r][c], cx: c * (size + gap) + size / 2, cy: r * (size + gap) + size / 2, size });
    }
  }
  return out;
}

const cell = (row: number, col: number, letter = '?') => ({ row, col, letter });
const always = () => true;
const adjacent8 = (a: { row: number; col: number }, b: { row: number; col: number }) =>
  Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) === 1;

describe('hitTest', () => {
  const geo = buildGeometry(grid3());

  it('given a point on a tile centre, when tested, then returns that tile', () => {
    expect(hitTest(geo, 160, 50)).toMatchObject({ row: 0, col: 1 });
  });

  it('given the corner where four tiles meet, when tested, then picks nothing (no accidental diagonal)', () => {
    expect(hitTest(geo, 105, 105)).toBeNull();
  });

  it('given a point inside the inner circle but off-centre, when tested, then still picks the tile', () => {
    expect(hitTest(geo, 50 + 35, 50 + 10)).toMatchObject({ row: 0, col: 0 });
  });

  it('given a generous radius (first touch), when the edge of a tile is hit, then it counts', () => {
    expect(hitTest(geo, 98, 98, 0.72)).toMatchObject({ row: 0, col: 0 });
  });
});

describe('stepPath', () => {
  const opts = { canEnter: always, adjacent: adjacent8 };

  it('given an adjacent new tile, when stepped, then it is appended', () => {
    const r = stepPath([cell(0, 0, 'C')], cell(1, 1, 'O'), opts);
    expect(r.change).toBe('add');
    expect(r.path.map((c) => c.letter).join('')).toBe('CO');
  });

  it('given the second-to-last tile, when stepped, then the last tile is dropped (backtrack)', () => {
    const r = stepPath([cell(0, 0), cell(0, 1), cell(0, 2)], cell(0, 1), opts);
    expect(r.change).toBe('back');
    expect(r.path).toHaveLength(2);
  });

  it('given an older tile in the path, when crossed, then nothing changes', () => {
    const path = [cell(0, 0), cell(0, 1), cell(1, 1), cell(1, 0)];
    expect(stepPath(path, cell(0, 0), opts).change).toBe('none');
  });

  it('given a non-adjacent tile, when stepped, then nothing changes', () => {
    expect(stepPath([cell(0, 0)], cell(2, 2), opts).change).toBe('none');
  });

  it('given a filter that refuses the tile, when stepped, then nothing changes', () => {
    const r = stepPath([cell(0, 0)], cell(0, 1), { ...opts, canEnter: () => false });
    expect(r.change).toBe('none');
  });

  it('given an adjacency override (portal), when the far tile is allowed, then it is appended', () => {
    const r = stepPath([cell(0, 0)], cell(2, 2), { canEnter: always, adjacent: () => true });
    expect(r.change).toBe('add');
  });
});

describe('samplesBetween', () => {
  it('given a fast jump across two tiles, when sampled, then the intermediate tile is visited', () => {
    const geo = buildGeometry(grid3());
    const pts = samplesBetween({ x: 50, y: 50 }, { x: 270, y: 50 }, 25);
    const hits = pts.map((p) => hitTest(geo, p.x, p.y)).filter(Boolean).map((t) => t!.col);
    expect(hits).toContain(1);
    expect(pts[pts.length - 1]).toEqual({ x: 270, y: 50 });
  });
});

describe('heatOf', () => {
  it('climbs with word length', () => {
    expect([0, 2, 3, 5, 7].map(heatOf)).toEqual([0, 0, 1, 2, 3]);
  });
});
