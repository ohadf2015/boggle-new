'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type PointerKind = 'mouse' | 'touch' | 'pen';

export interface DragState {
  tileId: string;
  letter: string;
  value: number;
  /** Pointer position in viewport coords (clientX/Y). */
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
  /** Optional handler for off-axis drops when an axis is locked. */
  onOffAxisDrop?: (tileId: string, row: number, col: number) => void;
}

const DRAG_THRESHOLD_PX = 6;
// Vertical-only fast lane for touch. Lifting a tile straight up off the rack
// activates the drag on as little as 4 px of dy — we don't wait for the
// hypot threshold. Pairs with `touch-pan-x` on rack tiles so horizontal
// swipes scroll the rack instead.
const TOUCH_VERTICAL_THRESHOLD_PX = 4;
// Drop-snap radius. The board has 2 px gaps between cells; without a snap a
// pointerup that lands dead-on in the gap returns null from elementFromPoint
// and the drop silently fails. Widened 24→32 px to make landing a tile more
// forgiving (the #1 "dragging is fiddly" complaint) — still under a full
// phone cell (~30 px) so we won't pull a tile two cells over by accident.
const SNAP_RADIUS_PX = 32;
// Upward-travel activation. The rack sits below the board, so any decisive
// upward motion is a drag-to-place — even when it's horizontal-dominant
// (reaching for a board cell off to the side). Without this, diagonal drags
// where dx > dy never activated and the gesture felt "stuck".
const UPWARD_ACTIVATE_PX = 6;

/**
 * Locate the nearest empty board cell to a viewport point.
 * Falls back to nearest-center snap when the pointer is in a cell gap.
 */
function resolveDropCell(clientX: number, clientY: number): HTMLElement | null {
  const direct = document.elementFromPoint(clientX, clientY);
  const direct$ = direct instanceof Element ? direct.closest('[data-board-cell]') : null;
  if (direct$ instanceof HTMLElement && direct$.dataset.tileState === 'empty') {
    return direct$;
  }
  const cells = document.querySelectorAll<HTMLElement>('[data-board-cell][data-tile-state="empty"]');
  let best: HTMLElement | null = null;
  let bestDist = SNAP_RADIUS_PX;
  for (const cell of cells) {
    const r = cell.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = Math.hypot(clientX - cx, clientY - cy);
    if (d < bestDist) {
      bestDist = d;
      best = cell;
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
 * Move:  global pointermove updates ghost position; resolves the cell via
 *        resolveDropCell (direct-hit + nearest-center snap fallback).
 * Drop:  global pointerup. If over a snap-eligible cell, fires onDrop.
 *
 * Touch activation routing:
 *  - vertical-dominant motion ≥ TOUCH_VERTICAL_THRESHOLD_PX = drag wins
 *    (lifting tile up off rack)
 *  - hypot ≥ 6 px AND dy ≥ dx = drag wins (diagonal toward board)
 *  - horizontal-dominant motion = drag stays dormant; browser handles
 *    `touch-pan-x` scroll of the rack instead; the trailing click is
 *    suppressed via consumeDropFlag()
 *
 * Mouse/pen activate on any movement (unchanged).
 */
export function useWordCraftDrag({ onDrop }: UseWordCraftDragArgs) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const droppedRef = useRef(false);
  // Horizontal swipe flag — when the browser doesn't fire pointercancel
  // (e.g. rack already scrolled to the boundary) the click that follows
  // pointerup would otherwise reach the rack tile's onClick. consumeDropFlag
  // reads this and suppresses.
  const horizontalSwipeRef = useRef(false);
  const lastHoverRef = useRef<string | null>(null);

  useEffect(() => {
    if (!drag) return;

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

      const cellEl = resolveDropCell(e.clientX, e.clientY);
      const hoverCell = cellEl?.dataset.boardCell ?? null;

      if (hoverCell && hoverCell !== lastHoverRef.current) {
        vibrate(8);
      }
      lastHoverRef.current = hoverCell;

      setDrag((prev) =>
        prev ? { ...prev, x: e.clientX, y: e.clientY, hoverCell, active: prev.active || shouldActivate } : null,
      );
    };

    const finish = (e: PointerEvent) => {
      const cellEl = resolveDropCell(e.clientX, e.clientY);
      if (cellEl && cellEl.dataset.boardCell && drag.active) {
        const [r, c] = cellEl.dataset.boardCell.split(',').map(Number);
        droppedRef.current = true;
        onDrop(drag.tileId, r, c);
      }
      setDrag(null);
      startRef.current = null;
      lastHoverRef.current = null;
    };

    const cancel = () => {
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
      droppedRef.current = false;
      horizontalSwipeRef.current = false;
      lastHoverRef.current = null;
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

  return { drag, begin, consumeDropFlag };
}
