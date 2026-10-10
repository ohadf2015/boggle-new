export interface Point {
  x: number;
  y: number;
}

export interface TrailStroke {
  underlay: number;
  halo: number;
  core: number;
}

export const TRAIL_INK = '#0b1530';
export const TRAIL_ACCENT = '#BFFF00';

/** Stroke widths scale with the tile so the trail reads as chunky on phone and desktop alike. */
export function trailStroke(cellSize: number): TrailStroke {
  return {
    underlay: Math.max(10, cellSize * 0.31),
    halo: Math.max(7, cellSize * 0.22),
    core: Math.max(5, cellSize * 0.13),
  };
}

export function trailPoints(
  cells: ReadonlyArray<{ row: number; col: number }>,
  centers: ReadonlyMap<string, Point>,
  liftFor: (index: number) => number,
): Point[] {
  const out: Point[] = [];
  cells.forEach((cell, i) => {
    const p = centers.get(`${cell.row}-${cell.col}`);
    if (!p) return;
    out.push({ x: p.x, y: p.y + liftFor(i) });
  });
  return out;
}

export function toPointsAttr(points: ReadonlyArray<Point>): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

/** The live tail runs from the last committed tile to the finger. */
export function tailSegment(last: Point | undefined, pointer: Point | null): Point[] {
  if (!last || !pointer) return [];
  return [last, pointer];
}
