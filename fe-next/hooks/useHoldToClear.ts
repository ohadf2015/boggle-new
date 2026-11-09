'use client';

import { useCallback, useEffect, useRef, type MouseEvent } from 'react';

/** How long a backspace press must be held to clear the whole word. */
export const CLEAR_HOLD_MS = 450;

interface HoldToClearOptions {
  /** A normal tap (rub out one letter). */
  onTap: () => void;
  /** A long press; omit to make every press a tap. */
  onHold?: () => void;
  holdMs?: number;
}

/**
 * Button handlers for a backspace key: tap removes a letter, holding clears the
 * word. The click that ends a hold is swallowed so it never also removes a letter.
 */
export function useHoldToClear({ onTap, onHold, holdMs = CLEAR_HOLD_MS }: HoldToClearOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const latest = useRef({ onTap, onHold });
  latest.current = { onTap, onHold };

  const cancel = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);
  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(() => {
    fired.current = false;
    cancel();
    if (!latest.current.onHold) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      fired.current = true;
      latest.current.onHold?.();
    }, holdMs);
  }, [cancel, holdMs]);

  const onClick = useCallback(() => {
    cancel();
    if (fired.current) { fired.current = false; return; }
    latest.current.onTap();
  }, [cancel]);

  const onContextMenu = useCallback((e: MouseEvent) => e.preventDefault(), []);

  return { onPointerDown, onClick, onPointerLeave: cancel, onPointerCancel: cancel, onContextMenu };
}
