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
 * Move:  global pointermove updates ghost position; resolves the cell under
 *        pointer via document.elementFromPoint and the [data-board-cell] attr.
 * Drop:  global pointerup. If pointer is over an empty cell, fires onDrop.
 *
 * The drag is "active" only after the user moves past DRAG_THRESHOLD — below
 * that we leave it dormant, so a quick tap still falls through to the rack
 * button's onClick (which toggles selection, the existing tap-to-place flow).
 *
 * Haptic: we vibrate(8) once each time the hovered cell *changes* to a valid
 * drop target. That gives the player a physical-feeling "lock" cue without
 * spamming the motor.
 */
export function useWordCraftDrag({ onDrop }: UseWordCraftDragArgs) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const droppedRef = useRef(false);
  const lastHoverRef = useRef<string | null>(null);

  useEffect(() => {
    if (!drag) return;

    const move = (e: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const distanceSquared = dx * dx + dy * dy;
      const passedThreshold = distanceSquared >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;

      // Touch pointers only activate drag after exceeding threshold.
      // Mouse/pen activate immediately on any movement.
      const shouldActivate = drag.pointerType === 'touch' ? passedThreshold : distanceSquared > 0;

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const cellEl = target instanceof Element ? target.closest('[data-board-cell]') : null;
      const hoverCell =
        cellEl instanceof HTMLElement && cellEl.dataset.tileState === 'empty'
          ? cellEl.dataset.boardCell ?? null
          : null;

      if (hoverCell && hoverCell !== lastHoverRef.current) {
        vibrate(8);
      }
      lastHoverRef.current = hoverCell;

      setDrag((prev) =>
        prev ? { ...prev, x: e.clientX, y: e.clientY, hoverCell, active: prev.active || shouldActivate } : null,
      );
    };

    const finish = (e: PointerEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const cellEl = target instanceof Element ? target.closest('[data-board-cell]') : null;
      if (
        cellEl instanceof HTMLElement &&
        cellEl.dataset.tileState === 'empty' &&
        cellEl.dataset.boardCell &&
        drag.active
      ) {
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
      // Don't capture the pointer on the rack button — we want events on document
      // so cells can detect hover. Just record the start position.
      startRef.current = { x: e.clientX, y: e.clientY };
      droppedRef.current = false;
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

  /** Returns true if the most recent gesture ended in a successful drop.
   *  Rack tiles consult this in their click handler to suppress the toggle-select
   *  click that otherwise fires after pointerup. */
  const consumeDropFlag = useCallback(() => {
    const dropped = droppedRef.current;
    droppedRef.current = false;
    return dropped;
  }, []);

  return { drag, begin, consumeDropFlag };
}
