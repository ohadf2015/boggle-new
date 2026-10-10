export interface TrailPoint {
  x: number;
  y: number;
}

export const RELEASE_HOLD_MS = 420;

export function buildTrailPath(points: TrailPoint[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

export function trailHeadPoint(points: TrailPoint[]): TrailPoint | null {
  return points[0] ?? null;
}

export function isReleaseHoldActive(elapsedMs: number): boolean {
  return elapsedMs < RELEASE_HOLD_MS;
}
