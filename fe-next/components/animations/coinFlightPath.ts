export type Point = { x: number; y: number };
export type Rect = { left: number; top: number; right: number; bottom: number };
export type Viewport = { w: number; h: number };

export interface CoinFlightInput {
  source: Point;
  target: Point;
  i: number;
  n: number;
  px: number;
  avoid: Rect[];
  viewport: Viewport;
  big?: boolean;
}

export interface CoinFlightPlan {
  fan: Point;
  hover: Point;
  /** Positions after the hover, ending exactly on the target. */
  route: Point[];
  /** Keyframe progress (0..1, accelerating) of each route point across the travel leg. */
  at: number[];
}

const ROUTE_STEPS = 6;
const ACCEL = 1.45;

const inflate = (r: Rect, m: number): Rect => ({ left: r.left - m, top: r.top - m, right: r.right + m, bottom: r.bottom + m });
const inside = (p: Point, r: Rect) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

function onScreen(p: Point, vp: Viewport, half: number): Point {
  return { x: clamp(p.x, half, vp.w - half), y: clamp(p.y, half, vp.h - half) };
}

/** Nudge a point out of any zone through its nearest edge that stays on screen. */
function pushOut(p: Point, zones: Rect[], vp: Viewport, half: number): Point {
  let q = p;
  for (const z of zones) {
    if (!inside(q, z)) continue;
    const exits: Point[] = [
      { x: q.x, y: z.bottom },
      { x: z.right, y: q.y },
      { x: z.left, y: q.y },
      { x: q.x, y: z.top },
    ].filter((e) => e.x >= half && e.x <= vp.w - half && e.y >= half && e.y <= vp.h - half);
    if (!exits.length) continue;
    q = exits.reduce((best, e) => (Math.hypot(e.x - q.x, e.y - q.y) < Math.hypot(best.x - q.x, best.y - q.y) ? e : best));
  }
  return q;
}

function fanPoint(input: CoinFlightInput, zones: Rect[]): Point {
  const { source, i, n, big } = input;
  const spread = n === 1 ? 0 : i / (n - 1) - 0.5;
  const sweep = big ? Math.PI * 1.6 : Math.PI * 1.1;
  const radius = big ? 80 + (i % 3) * 26 : 52 + (i % 3) * 16;
  const apex = { x: source.x, y: source.y - radius };
  // Coins spray away from the praise stamp: up normally, down when the stamp sits above the word.
  const centre = zones.some((z) => inside(apex, z)) ? Math.PI / 2 : -Math.PI / 2;
  const angle = centre + spread * sweep;
  return { x: source.x + Math.cos(angle) * radius, y: source.y + Math.sin(angle) * radius };
}

function bezier(from: Point, control: Point, to: Point, u: number): Point {
  const a = 1 - u;
  return { x: a * a * from.x + 2 * a * u * control.x + u * u * to.x, y: a * a * from.y + 2 * a * u * control.y + u * u * to.y };
}

/** Waypoints that take a coin around the zone on the wallet's side, then over it. */
function detour(hover: Point, target: Point, z: Rect, vp: Viewport, half: number): Point[] | null {
  if (hover.y <= z.top || target.y >= z.top) return [];
  const side = target.x >= (z.left + z.right) / 2 ? 1 : -1;
  const lane = clamp(side > 0 ? z.right : z.left, half, vp.w - half);
  if (lane > z.left && lane < z.right) return null;
  if (hover.y < z.bottom) return [{ x: hover.x, y: z.top }];
  const beyond = side > 0 ? hover.x >= lane : hover.x <= lane;
  if (beyond) return [{ x: hover.x, y: z.top }];
  return [{ x: lane, y: z.bottom }, { x: lane, y: z.top }];
}

function along(pts: Point[], s: number): Point {
  const lens = pts.slice(1).map((p, k) => Math.hypot(p.x - pts[k].x, p.y - pts[k].y));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let d = s * total;
  for (let k = 0; k < lens.length; k++) {
    if (d <= lens[k] || k === lens.length - 1) {
      const u = lens[k] ? Math.min(1, d / lens[k]) : 1;
      return { x: pts[k].x + (pts[k + 1].x - pts[k].x) * u, y: pts[k].y + (pts[k + 1].y - pts[k].y) * u };
    }
    d -= lens[k];
  }
  return pts[pts.length - 1];
}

function polylineRoute(pts: Point[]): { route: Point[]; at: number[] } {
  const lens = pts.slice(1).map((p, k) => Math.hypot(p.x - pts[k].x, p.y - pts[k].y));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const marks = new Set<number>();
  for (let k = 1; k <= ROUTE_STEPS; k++) marks.add(Math.pow(k / ROUTE_STEPS, ACCEL));
  let run = 0;
  for (let k = 0; k < lens.length - 1; k++) {
    run += lens[k];
    marks.add(run / total);
  }
  const sorted = [...marks].filter((s) => s > 0).sort((a, b) => a - b);
  return {
    route: sorted.map((s) => (s >= 1 ? pts[pts.length - 1] : along(pts, s))),
    at: sorted.map((s) => Math.pow(s, 1 / ACCEL)),
  };
}

/**
 * Where one coin goes: out of the word, a beat of hover, then into the wallet,
 * steering around any zone (the praise stamp) so it never covers the text.
 */
export function coinFlightPlan(input: CoinFlightInput): CoinFlightPlan {
  const { target, i, px, viewport: vp } = input;
  const half = px / 2;
  const zones = input.avoid.map((r) => inflate(r, half + 6));
  const fan = pushOut(onScreen(fanPoint(input, zones), vp, half), zones, vp, half);
  const hover = pushOut(onScreen({ x: fan.x, y: fan.y - 6 - (i % 2) * 4 }, vp, half), zones, vp, half);

  const side = i % 2 === 0 ? 1 : -1;
  const control = {
    x: (hover.x + target.x) / 2 + side * (36 + (i % 4) * 16),
    y: Math.min(hover.y, target.y) - 50 - (i % 3) * 22,
  };
  const curve = Array.from({ length: ROUTE_STEPS }, (_, k) => {
    const u = Math.pow((k + 1) / ROUTE_STEPS, ACCEL);
    return k === ROUTE_STEPS - 1 ? target : onScreen(bezier(hover, control, target, u), vp, half);
  });
  const blocker = zones.find((z) => curve.some((p) => inside(p, z)));
  if (!blocker) return { fan, hover, route: curve, at: curve.map((_, k) => (k + 1) / ROUTE_STEPS) };

  const way = detour(hover, target, blocker, vp, half);
  if (way === null) return { fan, hover, route: curve, at: curve.map((_, k) => (k + 1) / ROUTE_STEPS) };
  return { fan, hover, ...polylineRoute([hover, ...way, target]) };
}

/** Every position a coin passes through, from the word to the wallet. */
export function coinFlightPoints(input: CoinFlightInput): Point[] {
  const plan = coinFlightPlan(input);
  return [input.source, plan.fan, plan.hover, ...plan.route];
}

/** Centre for the big-word "+N" stamp: just under the word, clear of zones, on screen. */
export function jackpotStampAt(source: Point, avoid: Rect[], vp: Viewport, box: { w: number; h: number }): Point {
  const hw = box.w / 2;
  const hh = box.h / 2;
  const zones = avoid.map((r) => inflate({ left: r.left - hw, right: r.right + hw, top: r.top - hh, bottom: r.bottom + hh }, 6));
  const fit = (p: Point) => ({ x: clamp(p.x, hw + 4, vp.w - hw - 4), y: clamp(p.y, hh + 4, vp.h - hh - 4) });
  const candidates = [
    fit({ x: source.x, y: source.y + 66 }),
    fit({ x: source.x, y: source.y - 66 }),
    ...zones.map((z) => fit({ x: source.x, y: z.bottom + 1 })),
  ];
  return candidates.find((p) => !zones.some((z) => inside(p, z))) ?? candidates[0];
}
