'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  clampView,
  ensureCellVisible,
  initialScale,
  isPannable,
  zoomAt,
  MAX_SCALE,
  MIN_SCALE,
  type BoardView,
} from '@/lib/crossword/viewport';

/** Movement past this (CSS px) turns a press into a drag, so it stops counting as a cell tap. */
const DRAG_SLOP = 8;
const ZOOM_STEP = 0.5;

export interface BoardPanZoom {
  /** Goes on the clip box. */
  viewportRef: (node: HTMLDivElement | null) => void;
  /** Goes on the transformed layer inside it. */
  contentRef: (node: HTMLDivElement | null) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** Swallows the click that ends a drag, so panning never also selects a cell. */
  onClickCapture: (e: { stopPropagation: () => void }) => void;
  zoomBy: (delta: number) => void;
  scale: number;
  pannable: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

/**
 * Drag-to-pan and pinch-to-zoom for the board.
 *
 * The transform is written straight to the DOM during a gesture and only mirrored into React
 * state when it settles. Cells are memoised, but a state update per pointermove would still
 * re-render all 121 of them on a newspaper-size grid — imperative writes keep the drag on the
 * compositor.
 */
export function useBoardPanZoom(args: {
  size: number;
  rtl: boolean;
  active: { row: number; col: number };
}): BoardPanZoom {
  const { size, rtl, active } = args;

  const viewRef = useRef<BoardView>({ x: 0, y: 0, scale: initialScale(size) });
  const viewportEl = useRef<HTMLDivElement | null>(null);
  const contentEl = useRef<HTMLDivElement | null>(null);
  const vwRef = useRef(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const travelled = useRef(0);
  const dragged = useRef(false);

  const [scale, setScale] = useState(viewRef.current.scale);

  const paint = useCallback(() => {
    const el = contentEl.current;
    if (!el) return;
    const { x, y, scale: s } = viewRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
  }, []);

  const commit = useCallback(
    (next: BoardView) => {
      viewRef.current = clampView(next, vwRef.current || 1);
      paint();
    },
    [paint],
  );

  // Measure with a callback ref + ResizeObserver rather than a mount effect: the board can be
  // laid out after first paint (it lives behind a loader), and a size read once at mount comes
  // back 0 and never corrects itself.
  const viewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      roRef.current?.disconnect();
      roRef.current = null;
      viewportEl.current = node;
      if (!node) return;
      const measure = () => {
        vwRef.current = node.clientWidth;
        commit(viewRef.current);
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(node);
      roRef.current = ro;
    },
    [commit],
  );

  const contentRef = useCallback(
    (node: HTMLDivElement | null) => {
      contentEl.current = node;
      if (node) paint();
    },
    [paint],
  );

  // A grid swapped for a differently-sized one re-opens at that size's natural zoom.
  useEffect(() => {
    commit({ x: 0, y: 0, scale: initialScale(size) });
    setScale(viewRef.current.scale);
  }, [size, commit]);

  // Any focus change — arrows, Tab, a clue tap, auto-advance — must drag the board along, or
  // keyboard navigation walks the cursor off-screen with nothing following it.
  useEffect(() => {
    const vw = vwRef.current;
    if (!vw) return;
    const next = ensureCellVisible(viewRef.current, {
      size,
      row: active.row,
      col: active.col,
      vw,
      rtl,
    });
    if (next !== viewRef.current) commit(next);
  }, [active.row, active.col, size, rtl, commit]);

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    travelled.current = 0;
    dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: dist(a, b), scale: viewRef.current.scale };
    }
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      const next = { x: e.clientX, y: e.clientY };
      pointers.current.set(e.pointerId, next);

      const box = viewportEl.current?.getBoundingClientRect();
      if (!box) return;

      if (pointers.current.size >= 2 && pinchStart.current) {
        const [a, b] = [...pointers.current.values()];
        const ratio = dist(a, b) / (pinchStart.current.dist || 1);
        const mid = { x: (a.x + b.x) / 2 - box.left, y: (a.y + b.y) / 2 - box.top };
        dragged.current = true;
        commit(
          zoomAt(viewRef.current, pinchStart.current.scale * ratio, mid.x, mid.y, vwRef.current),
        );
        return;
      }

      if (!isPannable(viewRef.current)) return;
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      travelled.current += Math.hypot(dx, dy);
      if (travelled.current > DRAG_SLOP) dragged.current = true;
      if (!dragged.current) return;
      commit({ x: viewRef.current.x + dx, y: viewRef.current.y + dy, scale: viewRef.current.scale });
    },
    [commit],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    setScale(viewRef.current.scale);
  }, []);

  const onClickCapture = useCallback((e: { stopPropagation: () => void }) => {
    if (!dragged.current) return;
    dragged.current = false;
    e.stopPropagation();
  }, []);

  const zoomBy = useCallback(
    (delta: number) => {
      const vw = vwRef.current || 1;
      commit(zoomAt(viewRef.current, viewRef.current.scale + delta, vw / 2, vw / 2, vw));
      setScale(viewRef.current.scale);
    },
    [commit],
  );

  return {
    viewportRef,
    contentRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClickCapture,
    zoomBy,
    scale,
    pannable: scale > MIN_SCALE + 0.0001,
    canZoomIn: scale < MAX_SCALE - 0.0001,
    canZoomOut: scale > MIN_SCALE + 0.0001,
  };
}

export { ZOOM_STEP };
