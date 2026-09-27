// Pan/zoom math for the board, kept pure so it can be tested without a DOM.
//
// The board viewport is a SQUARE clip box whose side is `vw` CSS px. The grid inside is laid out
// at exactly that size and then transformed — never resized. That distinction matters: the
// original clipping bug came from letting the board's layout size exceed its scrollport, so here
// layout is fixed and only `transform` moves, which can't overflow anything.
//
// Content coordinates: (0,0) is the grid's top-left at scale 1. A view of {x, y, scale} renders as
// `translate(x px, y px) scale(scale)` with `transform-origin: 0 0`.

export interface BoardView {
  x: number;
  y: number;
  scale: number;
}

export const FIT: BoardView = { x: 0, y: 0, scale: 1 };

/** Zoom bounds. Below 1 the grid would no longer fill its box; above 3 cells get comically large. */
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

/**
 * The zoom a grid opens at. A mini fits comfortably, so it opens fitted and never needs panning.
 * A newspaper-scale grid fitted to a phone gives ~30px cells — legible but below the 44px touch
 * target — so it opens showing roughly VISIBLE_COLS columns and is panned like a paper.
 */
const VISIBLE_COLS = 7;
export function initialScale(size: number): number {
  if (size <= VISIBLE_COLS) return 1;
  return Math.min(MAX_SCALE, size / VISIBLE_COLS);
}

/** True when the grid is bigger than its box, i.e. dragging can actually move something. */
export function isPannable(view: BoardView): boolean {
  return view.scale > 1.0001;
}

/**
 * Keep the grid covering its box: the transform may never expose empty space at an edge.
 * At scale 1 this pins the view to {0,0}, so a fitted board can't be dragged off-centre.
 */
export function clampView(view: BoardView, vw: number): BoardView {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale));
  const overflow = vw * (scale - 1); // how far the content extends past the box
  // `|| 0` normalises the -0 that Math.max(-0, …) yields at scale 1, so a fitted view compares
  // equal to FIT instead of being a distinct-but-identical-looking object.
  const clamp1 = (v: number) => Math.min(0, Math.max(-overflow, v)) || 0;
  return { x: clamp1(view.x), y: clamp1(view.y), scale };
}

/** Zoom about a point given in VIEWPORT coordinates, so the pinch/cursor anchor stays put. */
export function zoomAt(view: BoardView, nextScale: number, px: number, py: number, vw: number): BoardView {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
  const ratio = scale / view.scale;
  return clampView(
    { x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio, scale },
    vw,
  );
}

export interface CellFocusArgs {
  /** Grid dimension in cells. */
  size: number;
  row: number;
  col: number;
  /** Viewport side in CSS px (square). */
  vw: number;
  /** RTL grids lay column 0 on the RIGHT, so the visual x of a column is mirrored. */
  rtl: boolean;
}

/**
 * Pan the minimum distance that brings a cell fully inside the box, with one cell of breathing
 * room so the focused square never sits flush against an edge. Returns the view unchanged when
 * the cell is already comfortably visible — otherwise every keystroke would nudge the board.
 *
 * Without this, zooming would silently break keyboard navigation: arrows and Tab would walk the
 * cursor off-screen with nothing following it.
 */
export function ensureCellVisible(view: BoardView, args: CellFocusArgs): BoardView {
  const { size, row, col, vw, rtl } = args;
  if (!isPannable(view)) return view;

  const cell = (vw * view.scale) / size;
  const margin = Math.min(cell, vw / 4); // one cell of padding, but never a quarter of the box
  const visualCol = rtl ? size - 1 - col : col;

  const axis = (index: number, offset: number): number => {
    const near = index * cell + offset; // cell's leading edge, in viewport coords
    const far = near + cell;
    if (near < margin) return offset + (margin - near);
    if (far > vw - margin) return offset - (far - (vw - margin));
    return offset;
  };

  return clampView(
    { x: axis(visualCol, view.x), y: axis(row, view.y), scale: view.scale },
    vw,
  );
}
