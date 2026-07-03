'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type PointerKind = 'mouse' | 'touch' | 'pen';

export interface DragState {
  tileId: string;
  letter: string;
  value: number;
  /** Pointer position at drag START (viewport coords). Live motion is applied
   *  imperatively to the ghost element via `ghostRef` — never through React
   *  state, so a 120 Hz drag causes zero re-renders. */
  x: number;
  y: number;
  /** Cell key 'r,c' currently under pointer if it's a valid drop target, else null. */
  hoverCell: string | null;
  /** True once movement exceeds threshold; we don't show the ghost until then. */
  active: boolean;
  /** Pointer kind so the ghost renderer knows how high to lift the preview. */
  pointerType: PointerKind;
}

export interface UseWordCraftDragArgs {
  onDrop: (tileId: string, row: number, col: number) => void;
  /**
   * Live set of empty board cell keys ('r,c'). Read per pointermove from a
   * ref-backed getter — the board never changes mid-drag, but this keeps the
   * hook stateless about board contents.
   */
  getEmptyCells: () => ReadonlySet<string>;
}

const DRAG_THRESHOLD_PX = 6;
// Vertical-only fast lane for touch. Lifting a tile straight up off the rack
// activates the drag on as little as 4 px of dy — we don't wait for the
// hypot threshold. Pairs with `touch-pan-x` on rack tiles so horizontal
// swipes scroll the rack instead.
const TOUCH_VERTICAL_THRESHOLD_PX = 4;
// Drop-snap radius. The board has 2 px gaps between cells; without a snap a
// pointerup that lands dead-on in the gap misses every cell and the drop
// silently fails. 32 px keeps landing forgiving (the #1 "dragging is fiddly"
// complaint) while staying under a full phone cell (~30 px) so we won't pull
// a tile two cells over by accident.
const SNAP_RADIUS_PX = 32;
// Upward-travel activation. The rack sits below the board, so any decisive
// upward motion is a drag-to-place — even when it's horizontal-dominant
// (reaching for a board cell off to the side). Without this, diagonal drags
// where dx > dy never activated and the gesture felt "stuck".
const UPWARD_ACTIVATE_PX = 6;

/**
 * O(1) drop-cell resolution: ONE getBoundingClientRect on the board container
 * per call (post-transform, so ZoomShell pinch/pan needs no invalidation
 * bookkeeping) + pure grid arithmetic. Replaces the old per-move
 * querySelectorAll over ~225 cells with per-cell rect reads — the main cause
 * of drag jank on 15×15 boards.
 *
 * Snap: when the computed cell is occupied/out of bounds, the 3×3
 * neighbourhood is checked for the nearest empty cell center within
 * SNAP_RADIUS_PX (scaled) — bounded 9 arithmetic checks, no DOM.
 */
export function resolveDropCellFast(
  clientX: number,
  clientY: number,
  boardEl: HTMLElement,
  emptyCells: ReadonlySet<string>,
): string | null {
  const size = Number(boardEl.dataset.boardSize) || 15;
  const rect = boardEl.getBoundingClientRect();
  if (rect.width <= 0) return null;
  const scale = boardEl.offsetWidth > 0 ? rect.width / boardEl.offsetWidth : 1;
  const cs = getComputedStyle(boardEl);
  const chrome = ((parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.paddingLeft) || 0)) * scale;
  const gap = 2 * scale;
  const originX = rect.left + chrome;
  const originY = rect.top + chrome;
  const inner = rect.width - 2 * chrome;
  const pitch = (inner + gap) / size;
  if (pitch <= 0) return null;
  const cellSpan = pitch - gap;

  const col = Math.floor((clientX - originX) / pitch);
  const row = Math.floor((clientY - originY) / pitch);
  const key = `${row},${col}`;
  if (row >= 0 && row < size && col >= 0 && col < size && emptyCells.has(key)) {
    return key;
  }

  let best: string | null = null;
  let bestDist = SNAP_RADIUS_PX * scale;
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      const k = `${r},${c}`;
      if (!emptyCells.has(k)) continue;
      const cx = originX + c * pitch + cellSpan / 2;
      const cy = originY + r * pitch + cellSpan / 2;
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (d < bestDist) {
        bestDist = d;
        best = k;
      }
    }
  }
  return best;
}

function vibrate(ms: number) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch {
      // some browsers throw on user-gesture-required policy; ignore
    }
  }
}

function normalizePointerType(t: string | undefined): PointerKind {
  if (t === 'touch' || t === 'pen') return t;
  return 'mouse';
}

/**
 * Pointer-driven drag from rack → board cell.
 *
 * Begin: rack tile dispatches `begin()` on pointerdown.
 * Move:  global pointermove moves the ghost IMPERATIVELY (style.transform via
 *        rAF) and resolves the hover cell with resolveDropCellFast. React
 *        state changes ONLY on activation flip and hover-cell crossings —
 *        never per pixel.
 * Drop:  global pointerup. If over a snap-eligible empty cell, fires onDrop.
 *
 * Touch activation routing:
 *  - vertical-dominant motion ≥ TOUCH_VERTICAL_THRESHOLD_PX = drag wins
 *    (lifting tile up off rack)
 *  - hypot ≥ 6 px AND dy ≥ dx = drag wins (diagonal toward board)
 *  - upward travel ≥ UPWARD_ACTIVATE_PX = drag wins even when horizontal-dominant
 *  - horizontal-dominant motion = drag stays dormant; browser handles
 *    `touch-pan-x` scroll of the rack instead; the trailing click is
 *    suppressed via consumeDropFlag()
 *
 * Mouse/pen activate on any movement (unchanged).
 */
export function useWordCraftDrag({ onDrop, getEmptyCells }: UseWordCraftDragArgs) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const droppedRef = useRef(false);
  // Horizontal swipe flag — when the browser doesn't fire pointercancel
  // (e.g. rack already scrolled to the boundary) the click that follows
  // pointerup would otherwise reach the rack tile's onClick. consumeDropFlag
  // reads this and suppresses.
  const horizontalSwipeRef = useRef(false);
  const lastHoverRef = useRef<string | null>(null);
  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const boardElRef = useRef<HTMLElement | null>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    if (!drag) return;

    const paintGhost = () => {
      rafRef.current = 0;
      const el = ghostElRef.current;
      if (el) {
        // Absolute pointer position — the ghost wrapper lives at (0,0) fixed.
        el.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
      }
    };

    const move = (e: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const distanceSquared = dx * dx + dy * dy;
      const passedThreshold = distanceSquared >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;

      const verticalActivates = absDy >= TOUCH_VERTICAL_THRESHOLD_PX && absDy >= absDx;
      const hypotVerticalActivates = passedThreshold && absDy >= absDx;
      // Heading up toward the board — wins even when horizontal-dominant.
      const upwardActivates = dy <= -UPWARD_ACTIVATE_PX;
      const shouldActivate =
        drag.pointerType === 'touch'
          ? verticalActivates || hypotVerticalActivates || upwardActivates
          : distanceSquared > 0;

      // Only a non-upward horizontal sweep is a rack scroll; an upward
      // diagonal is a drag-to-board and must not be flagged as a swipe.
      if (drag.pointerType === 'touch' && absDx >= 8 && absDx > absDy && dy > -UPWARD_ACTIVATE_PX) {
        horizontalSwipeRef.current = true;
      }

      // Ghost follows the pointer imperatively — no React involvement.
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!rafRef.current) rafRef.current = requestAnimationFrame(paintGhost);

      const boardEl = boardElRef.current;
      const hoverCell = boardEl ? resolveDropCellFast(e.clientX, e.clientY, boardEl, getEmptyCells()) : null;
      if (hoverCell !== lastHoverRef.current) {
        if (hoverCell) vibrate(8);
        lastHoverRef.current = hoverCell;
        setDrag((prev) => (prev ? { ...prev, hoverCell, active: prev.active || shouldActivate } : null));
        return;
      }
      // Activation flip without a hover change (e.g. lifting straight up).
      if (shouldActivate && !drag.active) {
        setDrag((prev) => (prev ? { ...prev, active: true } : null));
      }
    };

    const finish = (e: PointerEvent) => {
      const boardEl = boardElRef.current;
      const cellKey = boardEl ? resolveDropCellFast(e.clientX, e.clientY, boardEl, getEmptyCells()) : null;
      if (cellKey && drag.active) {
        const [r, c] = cellKey.split(',').map(Number);
        droppedRef.current = true;
        onDrop(drag.tileId, r, c);
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      setDrag(null);
      startRef.current = null;
      lastHoverRef.current = null;
    };

    const cancel = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      setDrag(null);
      startRef.current = null;
      lastHoverRef.current = null;
      horizontalSwipeRef.current = false;
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.tileId, drag?.active]);

  const begin = useCallback(
    (tileId: string, letter: string, value: number, e: React.PointerEvent) => {
      // Pinch guard: only respond to the primary pointer in a multi-touch
      // sequence, so a second finger landing on a rack tile during a pinch
      // can't kidnap the tile.
      if (e.isPrimary === false) return;
      startRef.current = { x: e.clientX, y: e.clientY };
      posRef.current = { x: e.clientX, y: e.clientY };
      droppedRef.current = false;
      horizontalSwipeRef.current = false;
      lastHoverRef.current = null;
      boardElRef.current = document.querySelector<HTMLElement>('[data-wc-board]');
      setDrag({
        tileId,
        letter,
        value,
        x: e.clientX,
        y: e.clientY,
        hoverCell: null,
        active: false,
        pointerType: normalizePointerType(e.pointerType),
      });
    },
    [],
  );

  /** Attach to the ghost's positioned wrapper — live motion is written here. */
  const ghostRef = useCallback((el: HTMLDivElement | null) => {
    ghostElRef.current = el;
  }, []);

  /** Returns true if the most recent gesture (a) ended in a successful drop,
   *  or (b) was a clear horizontal swipe on touch — in either case the rack
   *  tile's onClick should be suppressed. Without (b) a partial-pan that
   *  doesn't trigger browser pointercancel would still flip selection. */
  const consumeDropFlag = useCallback(() => {
    const consumed = droppedRef.current || horizontalSwipeRef.current;
    droppedRef.current = false;
    horizontalSwipeRef.current = false;
    return consumed;
  }, []);

  return { drag, begin, consumeDropFlag, ghostRef };
}
