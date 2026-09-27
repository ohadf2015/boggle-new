import { useCallback, useRef, type MutableRefObject } from 'react';

/**
 * Shared wheel drag-to-spell input — the single source of truth for the
 * pointer-drag algorithm used by BOTH the live `WordWheelGame`
 * (`components/daily/WordWheelGame.tsx`) and the practice wheel sandbox
 * (`components/practice/PracticeWheelSandbox.tsx`).
 *
 * Behaviour (kept identical across both call sites):
 *  - Drag engages only once the pointer moves to a DIFFERENT letter than the
 *    one it started on, so a single tap stays a tap (the button's native
 *    onClick still fires) and double-tap-to-submit keeps working.
 *  - Letters are added additively; already-used indices are skipped.
 *  - Releasing an engaged drag with `>= minLength` letters auto-submits.
 *
 * The caller owns the `draggingRef` / `pointerPosRef` (they're also fed to the
 * decorative `WordWheelPixiRing` and, in the live game, to `useHoldToSubmit`),
 * so the hook takes them as inputs rather than owning them — this avoids a
 * hook-ordering cycle with the hold-to-submit hook.
 */
export interface UseWheelDragSpellOptions {
  /** Shared "a drag is in progress" flag (also read by the Pixi ring). */
  draggingRef: MutableRefObject<boolean>;
  /** Shared latest pointer position (also read by the Pixi ring). */
  pointerPosRef: MutableRefObject<{ x: number; y: number } | null>;
  /** Minimum built length required for a drag-release to auto-submit. */
  minLength?: number;
  /** Whether a wheel index is already part of the built word. */
  isIndexUsed: (index: number) => boolean;
  /** Append a wheel letter to the built word. `el` is provided for effects. */
  addLetter: (index: number, letter: string, el: HTMLButtonElement) => void;
  /** Current built-word length, read fresh at pointer-up. */
  getBuiltLength: () => number;
  /** Submit the built word (drag-release auto-submit). */
  submit: () => void;
  /**
   * Fired once when a drag transitions idle → engaged, with the start index.
   * Return `false` to suppress the hook's default "add the start letter"
   * (the live game uses this to avoid double-adding an eager-added hold letter).
   */
  onEngage?: (startIndex: number) => boolean | void;
  /** Fired immediately before a drag-release submit (e.g. mark last-was-drag). */
  onBeforeDragSubmit?: () => void;
  /** Cancel any pending idle auto-submit before a drag-release submit. */
  cancelPendingSubmit?: () => void;
}

export interface WheelDragSpellHandlers {
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: () => void;
}

export function useWheelDragSpell(
  options: UseWheelDragSpellOptions,
): WheelDragSpellHandlers {
  // Latest options in a ref so the returned handlers stay referentially stable
  // (callers spread them onto a div every render).
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const lastDragIdxRef = useRef<number | null>(null);
  const dragStartIdxRef = useRef<number | null>(null);
  const dragEngagedRef = useRef(false);

  const tryDragHit = useCallback((clientX: number, clientY: number) => {
    const o = optionsRef.current;
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>('[data-wheel-letter]');
    if (!btn) return;
    const idx = Number(btn.dataset.wheelIndex);
    if (idx === lastDragIdxRef.current) return;
    if (!dragEngagedRef.current) {
      const startIdx = dragStartIdxRef.current;
      if (startIdx === null || idx === startIdx) return;
      dragEngagedRef.current = true;
      lastDragIdxRef.current = startIdx;
      const shouldAddStart = o.onEngage ? o.onEngage(startIdx) !== false : true;
      const startBtn = document.querySelector<HTMLButtonElement>(
        `[data-wheel-index="${startIdx}"]`,
      );
      if (shouldAddStart && startBtn && !o.isIndexUsed(startIdx)) {
        o.addLetter(startIdx, startBtn.dataset.wheelLetter || '', startBtn);
      }
    }
    if (optionsRef.current.isIndexUsed(idx)) return;
    lastDragIdxRef.current = idx;
    o.addLetter(idx, btn.dataset.wheelLetter || '', btn);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const o = optionsRef.current;
    o.draggingRef.current = true;
    dragEngagedRef.current = false;
    lastDragIdxRef.current = null;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>('[data-wheel-letter]');
    dragStartIdxRef.current = btn ? Number(btn.dataset.wheelIndex) : null;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const o = optionsRef.current;
    o.pointerPosRef.current = { x: e.clientX, y: e.clientY };
    if (!o.draggingRef.current) return;
    tryDragHit(e.clientX, e.clientY);
  }, [tryDragHit]);

  const handlePointerUp = useCallback(() => {
    const o = optionsRef.current;
    o.pointerPosRef.current = null;
    const wasEngaged = dragEngagedRef.current;
    o.draggingRef.current = false;
    lastDragIdxRef.current = null;
    dragStartIdxRef.current = null;
    dragEngagedRef.current = false;
    if (wasEngaged && o.getBuiltLength() >= (o.minLength ?? 3)) {
      o.cancelPendingSubmit?.();
      o.onBeforeDragSubmit?.();
      o.submit();
    }
  }, []);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
