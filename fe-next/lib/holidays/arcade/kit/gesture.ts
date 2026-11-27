export interface PointerSample {
  x: number;
  y: number;
  t: number;
}

export interface Gesture {
  kind: 'tap' | 'flick' | 'drag';
  dx: number;
  dy: number;
  vx: number;
  vy: number;
}

const TAP_PX = 12;
const TAP_MS = 300;
const FLICK_PX_PER_S = 600;

export function classifyGesture(a: PointerSample, b: PointerSample): Gesture {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const sec = Math.max(0.016, (b.t - a.t) / 1000);
  const vx = dx / sec;
  const vy = dy / sec;
  const dist = Math.hypot(dx, dy);
  const kind = dist < TAP_PX && b.t - a.t < TAP_MS ? 'tap' : Math.hypot(vx, vy) >= FLICK_PX_PER_S ? 'flick' : dist < TAP_PX ? 'tap' : 'drag';
  return { kind, dx, dy, vx, vy };
}
