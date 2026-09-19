/**
 * Apartment-floor layout for a Word Tower v2 block. Pure geometry in block-local
 * physics px (origin at the block centre), so Pixi only paints what this returns
 * and the layout can be asserted without a renderer.
 *
 *   ┌──────────────────────────┐  cornice
 *   │   ┌──────────────────┐   │
 *   │   │     W O R D      │   │  sign plaque (the word)
 *   │   └──────────────────┘   │
 *   │  ▯  ▯  ▯  ▯  ▯  ▯  ▯     │  windows (lit = tenants), lobby: door in the middle
 *   ├──────────────────────────┤  floor slab
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ApartmentLayout {
  cornice: Rect;
  sign: Rect;
  windows: Rect[];
  door: Rect | null;
  slab: Rect;
}

const CORNICE_H = 10;
const SLAB_H = 14;
const SIGN_INSET_X = 18;
const SIGN_TOP_GAP = 4;
const SIGN_H = 42;
const WIN_W = 24;
const WIN_GAP = 12;
const WIN_H = 36;
const DOOR_W = 36;
const EDGE_PAD = 12;

export function apartmentLayout(w: number, h: number, lobby: boolean): ApartmentLayout {
  const top = -h / 2;
  const bottom = h / 2;
  const signY = top + CORNICE_H + SIGN_TOP_GAP;
  const slabY = bottom - SLAB_H;
  const rowTop = signY + SIGN_H + 4;
  const winY = rowTop + (slabY - rowTop - WIN_H) / 2;

  const door = lobby ? { x: -DOOR_W / 2, y: rowTop, w: DOOR_W, h: slabY - rowTop } : null;

  const n = Math.max(1, Math.floor((w - EDGE_PAD * 2 + WIN_GAP) / (WIN_W + WIN_GAP)));
  const rowW = n * WIN_W + (n - 1) * WIN_GAP;
  const windows: Rect[] = [];
  for (let i = 0; i < n; i += 1) {
    const win = { x: -rowW / 2 + i * (WIN_W + WIN_GAP), y: winY, w: WIN_W, h: WIN_H };
    if (door && win.x < door.x + door.w + 4 && win.x + win.w > door.x - 4) continue;
    windows.push(win);
  }

  return {
    cornice: { x: -w / 2, y: top, w, h: CORNICE_H },
    sign: { x: -w / 2 + SIGN_INSET_X, y: signY, w: w - SIGN_INSET_X * 2, h: SIGN_H },
    windows,
    door,
    slab: { x: -w / 2, y: slabY, w, h: SLAB_H },
  };
}

/**
 * Which windows are lit for `tenants` people, in a fixed per-floor order so a
 * repaint never moves the light and each arrival only adds one more window.
 */
export function litWindows(count: number, tenants: number, seed: number): boolean[] {
  const order = Array.from({ length: count }, (_, i) => i);
  let s = (seed * 2654435761) >>> 0 || 1;
  for (let i = count - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const lit = new Array<boolean>(count).fill(false);
  for (let k = 0; k < Math.min(count, tenants); k += 1) lit[order[k]] = true;
  return lit;
}
