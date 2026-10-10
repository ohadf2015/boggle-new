import { getWheelOuterOffset } from '@/lib/geometry/wheelOrbitGeometry';

export interface TrailPoint {
  x: number;
  y: number;
}

/** Slot position relative to the wheel centre; index -1 is the centre letter. */
export function wheelSlotPoint(index: number, radius: number, outerCount: number, cx: number, cy: number): TrailPoint {
  if (index < 0) return { x: cx, y: cy };
  const o = getWheelOuterOffset(index, outerCount, radius);
  return { x: cx + o.x, y: cy + o.y };
}

export function trailPathD(points: TrailPoint[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}
