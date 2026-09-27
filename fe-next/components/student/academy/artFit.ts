/**
 * Where the map art goes on screen — a px rect, solved per viewport.
 *
 * Islands are positioned in % of the ART, so the art rect decides where every
 * island lands. "Cover" alone crops islands off-screen whenever the viewport's
 * aspect differs from the art's (4:3 tablets, ultrawide, landscape phones), so
 * this solves for the rect directly:
 *
 *  1. every island's box (point ± its art/pointer/plaque extents, in px) must
 *     sit inside the safe area (viewport minus the chrome insets) — hard rule;
 *  2. islands that share a column should not overlap each other — soft rule,
 *     reported as `crowded` when the view cannot honour it (the map then
 *     renders compact nodes and asks again);
 *  3. otherwise prefer cover (no letterbox), zooming in on a short path;
 *  4. lean toward the focus island, within all of the above.
 *
 * Pure; px in, px out.
 */

/** An island: position in % of the art, box extents in px around it. */
export interface FitPoint {
  x: number;
  y: number;
  /** px above the point (art, pointer). */
  up: number;
  /** px below the point (plaque). */
  down: number;
  /** half the box width in px. */
  half: number;
}

export interface Insets { top: number; right: number; bottom: number; left: number }

export interface ArtFit {
  left: number;
  top: number;
  width: number;
  height: number;
  /** The art fills the whole view (no letterbox showing). */
  covers: boolean;
  /** The islands could not all be kept apart at this size. */
  crowded: boolean;
}

export interface FitInput {
  view: { width: number; height: number };
  /** Art width / height. */
  aspect: number;
  points: FitPoint[];
  insets: Insets;
  focus?: { x: number; y: number } | null;
  /** Largest zoom past cover for a short path. */
  maxZoom?: number;
  /** Breathing room between two islands' boxes, px. */
  gap?: number;
}

/** Share of the way the camera leans toward the focus, and its cap (fraction of the art). */
const LEAN_PULL = 0.5;
const MAX_LEAN = 0.08;

export function fitArt({ view, aspect, points, insets, focus = null, maxZoom = 1.3, gap = 6 }: FitInput): ArtFit {
  const { width: vw, height: vh } = view;
  const coverW = Math.max(vw, vh * aspect);

  if (points.length === 0) {
    const h = coverW / aspect;
    return { left: (vw - coverW) / 2, top: (vh - h) / 2, width: coverW, height: h, covers: true, crowded: false };
  }

  const L = insets.left;
  const R = vw - insets.right;
  const T = insets.top;
  const B = vh - insets.bottom;
  const safeW = Math.max(1, R - L);
  const safeH = Math.max(1, B - T);

  // (1) Largest width at which every pair still fits inside the safe area.
  let maxW = Infinity;
  for (const a of points) {
    for (const b of points) {
      if (b.x > a.x) maxW = Math.min(maxW, (100 * (safeW - a.half - b.half)) / (b.x - a.x));
      if (b.y > a.y) maxW = Math.min(maxW, (aspect * 100 * (safeH - a.up - b.down)) / (b.y - a.y));
    }
  }
  // A viewport too small for even one island: fall back to contain, it is the best there is.
  const floorW = Math.min(vw, vh * aspect) * 0.5;
  if (!Number.isFinite(maxW)) maxW = coverW * maxZoom;
  maxW = Math.max(floorW, maxW);

  // (2) Smallest width at which every pair is apart — sideways OR vertically.
  let minW = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const [hi, lo] = points[i].y <= points[j].y ? [points[i], points[j]] : [points[j], points[i]];
      const dx = Math.abs(points[i].x - points[j].x);
      const dy = lo.y - hi.y;
      const side = dx > 0 ? (100 * (points[i].half + points[j].half + gap)) / dx : Infinity;
      const stack = dy > 0 ? (aspect * 100 * (hi.down + lo.up + gap)) / dy : Infinity;
      minW = Math.max(minW, Math.min(side, stack));
    }
  }

  // (3) Preferred: cover, zoomed in when the path is short.
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const spanX = ((Math.max(...xs) - Math.min(...xs)) / 100) * coverW;
  const spanY = ((Math.max(...ys) - Math.min(...ys)) / 100) * (coverW / aspect);
  const spread = Math.max(spanX / safeW, spanY / safeH);
  const pref = spread < 0.8 ? coverW * Math.min(maxZoom, spread > 0 ? 0.8 / spread : maxZoom) : coverW;

  const crowded = minW > maxW;
  const width = crowded ? maxW : Math.min(maxW, Math.max(minW, pref));
  const height = width / aspect;

  // (4) Offsets, one axis at a time.
  const axis = (viewLen: number, size: number, pos: (p: FitPoint) => number, lowExt: (p: FitPoint) => number, highExt: (p: FitPoint) => number, lo: number, hi: number, f: number | null) => {
    let nLo = -Infinity;
    let nHi = Infinity;
    for (const p of points) {
      const at = (pos(p) / 100) * size;
      nLo = Math.max(nLo, lo + lowExt(p) - at);
      nHi = Math.min(nHi, hi - highExt(p) - at);
    }
    const centre = (viewLen - size) / 2;
    let want = centre;
    if (f != null) {
      const toFocus = viewLen / 2 - (f / 100) * size - centre;
      want = centre + Math.max(-MAX_LEAN * size, Math.min(MAX_LEAN * size, toFocus * LEAN_PULL));
    }
    if (nLo > nHi) return (nLo + nHi) / 2;
    let rLo = nLo;
    let rHi = nHi;
    if (size >= viewLen) {
      // The art should also keep covering the view on this axis, if it can.
      const cLo = Math.max(nLo, viewLen - size);
      const cHi = Math.min(nHi, 0);
      if (cLo <= cHi) { rLo = cLo; rHi = cHi; }
    }
    return Math.max(rLo, Math.min(rHi, want));
  };

  const left = axis(vw, width, (p) => p.x, (p) => p.half, (p) => p.half, L, R, focus?.x ?? null);
  const top = axis(vh, height, (p) => p.y, (p) => p.up, (p) => p.down, T, B, focus?.y ?? null);
  const covers = left <= 0.5 && top <= 0.5 && left + width >= vw - 0.5 && top + height >= vh - 0.5;

  return { left, top, width, height, covers, crowded };
}
