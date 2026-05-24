'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { ZOOM_FEEL, boardFilter, computeAutoZoomScale } from '@/lib/word-craft/zoomFeel';

/**
 * Pinch-zoom + 1-finger pan wrapper for the WordCraft board.
 *
 * Why this exists: even on a maxed-out phone the 13×13 board is small in
 * absolute pixels, and the user can't read premium-cell labels. Native
 * browser pinch-zoom would zoom the entire page (and break our pointer
 * drag-to-place), so we run our own gesture engine on a transform
 * container scoped to just the board.
 *
 * Behaviour:
 * - Two pointers down → pinch-to-zoom relative to the midpoint between
 *   them. Scale clamped [1, MAX_SCALE].
 * - One pointer down while scale > 1 + outside any rack tile → pan.
 * - Single tap on a cell still propagates to children (pinch-suppression
 *   only kicks in when ≥2 active pointers).
 * - Double-tap cycles through 1× → 2× → 1× as a quick manual toggle.
 * - Exposes a "Reset zoom" button when scale > 1 + a small zoom-level
 *   chip so the player knows zoom is engaged.
 */

// Zoom magnitude + "camera feel" live in lib/word-craft/zoomFeel.ts so the
// heaviness (blur / vignette / how far it zooms) is tuned + tested in one place.
const MIN_SCALE = ZOOM_FEEL.minScale;
const MAX_SCALE = ZOOM_FEEL.maxScale;
const DOUBLE_TAP_MS = 280;

export interface WordCraftZoomShellProps {
  children: ReactNode;
  /** Optional aria-label for the wrapper. */
  ariaLabel?: string;
  resetLabel?: string;
  /**
   * Cells the view should keep centred and in frame — the active word's
   * tiles, or the centre star on the first move. When these change the shell
   * auto-zooms + pans to follow play. A manual pinch/pan/reset suppresses the
   * follow until the cells clear (turn end).
   */
  focusCells?: ReadonlyArray<{ row: number; col: number }>;
  /** N for the N×N board — maps cell coords to viewport fractions. */
  boardSize?: number;
}

interface PointerInfo {
  x: number;
  y: number;
}

function distance(a: PointerInfo, b: PointerInfo): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function midpoint(a: PointerInfo, b: PointerInfo): PointerInfo {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function WordCraftZoomShell({
  children,
  ariaLabel = 'WordCraft board zoom shell',
  resetLabel = 'Reset zoom',
  focusCells,
  boardSize,
}: WordCraftZoomShellProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef<Map<number, PointerInfo>>(new Map());
  // Last gesture snapshot — used to compute deltas between pointermove ticks.
  const gestureRef = useRef<{
    startScale: number;
    startDistance: number;
    startMidX: number;
    startMidY: number;
    startTx: number;
    startTy: number;
  } | null>(null);
  const lastTapRef = useRef<number>(0);
  // Set true when a single-finger pan actually moves the board. Used to
  // swallow the trailing click so the board cell under the player's finger
  // doesn't get placed by accident at the end of a pan gesture.
  const panMovedRef = useRef(false);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const reducedMotion = usePrefersReducedMotion();

  // Tracks whether a zoom transition is in flight. Kept separate from
  // `isZoomed` so any transition-only effect (see boardFilter) runs just during
  // the camera move, not the whole time the player is panning around. The
  // motion blur this once drove is now off (zoomFeel.motionBlurPx = 0) after
  // players said the zoom felt heavy.
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevTransformRef = useRef({ scale: 1, tx: 0, ty: 0 });

  // Auto-follow bookkeeping. `userControlled` flips on any manual gesture so
  // the follow stops fighting the player; it re-arms when focus clears (turn
  // end). `autoApplied` records that the follow currently owns the transform,
  // so we only force a reset-out of a view the follow itself set.
  const userControlledRef = useRef(false);
  const autoAppliedRef = useRef(false);

  const isZoomed = scale > 1.001;

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const handleManualReset = useCallback(() => {
    userControlledRef.current = true;
    reset();
  }, [reset]);

  // Keep translation within a sensible range so the board can't wander
  // off-screen at high zoom.
  const clampTranslation = useCallback((nextTx: number, nextTy: number, nextScale: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return { tx: nextTx, ty: nextTy };
    const { width, height } = wrapper.getBoundingClientRect();
    const slackX = (width * (nextScale - 1)) / 2;
    const slackY = (height * (nextScale - 1)) / 2;
    return {
      tx: clamp(nextTx, -slackX, slackX),
      ty: clamp(nextTy, -slackY, slackY),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = Array.from(pointersRef.current.values());

      // Two fingers down → start pinch.
      if (pts.length === 2) {
        userControlledRef.current = true;
        gestureRef.current = {
          startScale: scale,
          startDistance: distance(pts[0], pts[1]),
          startMidX: midpoint(pts[0], pts[1]).x,
          startMidY: midpoint(pts[0], pts[1]).y,
          startTx: tx,
          startTy: ty,
        };
        // Capture pointers so subsequent moves keep firing on us even if
        // the user's finger drifts off a child cell.
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }

      // Double-tap zoom toggle.
      if (pts.length === 1 && e.pointerType === 'touch') {
        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_MS) {
          userControlledRef.current = true;
          if (isZoomed) reset();
          else setScale(MAX_SCALE);
        }
        lastTapRef.current = now;
      }
    },
    [isZoomed, reset, scale, tx, ty],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = Array.from(pointersRef.current.values());

      // Two-finger pinch
      if (pts.length === 2 && gestureRef.current) {
        const dist = distance(pts[0], pts[1]);
        const ratio = dist / Math.max(gestureRef.current.startDistance, 1);
        const nextScale = clamp(gestureRef.current.startScale * ratio, MIN_SCALE, MAX_SCALE);

        const mid = midpoint(pts[0], pts[1]);
        const nextTx = gestureRef.current.startTx + (mid.x - gestureRef.current.startMidX);
        const nextTy = gestureRef.current.startTy + (mid.y - gestureRef.current.startMidY);
        const clamped = clampTranslation(nextTx, nextTy, nextScale);

        setScale(nextScale);
        setTx(clamped.tx);
        setTy(clamped.ty);
        return;
      }

      // Single-finger pan only while zoomed
      if (pts.length === 1 && isZoomed) {
        const lastX = (e as unknown as { movementX: number }).movementX ?? 0;
        const lastY = (e as unknown as { movementY: number }).movementY ?? 0;
        if (lastX === 0 && lastY === 0) return;
        panMovedRef.current = true;
        userControlledRef.current = true;
        const next = clampTranslation(tx + lastX, ty + lastY, scale);
        setTx(next.tx);
        setTy(next.ty);
      }
    },
    [clampTranslation, isZoomed, scale, tx, ty],
  );

  const handlePointerEnd = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) gestureRef.current = null;

    // If the gesture actually panned the board, swallow the click that follows
    // pointerup. Otherwise a pan ending over a board cell silently places a
    // tile, which players read as "the game just placed a tile randomly".
    if (panMovedRef.current && pointersRef.current.size === 0) {
      panMovedRef.current = false;
      const wrapper = wrapperRef.current;
      if (wrapper) {
        // One-shot capture-phase blocker: the very next click on the wrapper
        // (which is the one synthesized from this pointerup) is stopped, then
        // the listener self-removes. Subsequent clicks pass through normally.
        const block = (clickEvt: Event) => {
          clickEvt.stopImmediatePropagation();
          clickEvt.preventDefault();
          wrapper.removeEventListener('click', block, true);
        };
        wrapper.addEventListener('click', block, true);
      }
    }
  }, []);

  // Re-snap into bounds if window resizes mid-zoom.
  useEffect(() => {
    if (!isZoomed) return;
    const handle = () => {
      const next = clampTranslation(tx, ty, scale);
      setTx(next.tx);
      setTy(next.ty);
    };
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [clampTranslation, isZoomed, scale, tx, ty]);

  // Auto-zoom "active-play-follows". Recomputed whenever the focused cells
  // change: zoom in on the first move's centre star, then pan + ease the zoom
  // out as the word grows. A manual gesture sets `userControlled` and we back
  // off until the cells clear (turn submitted/recalled), which re-arms us.
  const focusKey = useMemo(
    () => (focusCells ?? []).map((c) => `${c.row},${c.col}`).join(';'),
    [focusCells],
  );

  useEffect(() => {
    if (focusKey === '' || !boardSize) {
      // Nothing to follow — ease back out of an auto-set view and re-arm.
      if (autoAppliedRef.current) {
        autoAppliedRef.current = false;
        setScale(1);
        setTx(0);
        setTy(0);
      }
      userControlledRef.current = false;
      return;
    }
    if (userControlledRef.current) return;

    const cells = focusCells ?? [];
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for (const c of cells) {
      if (c.row < minR) minR = c.row;
      if (c.row > maxR) maxR = c.row;
      if (c.col < minC) minC = c.col;
      if (c.col > maxC) maxC = c.col;
    }
    const boxFrac = Math.max((maxC - minC + 1) / boardSize, (maxR - minR + 1) / boardSize);
    const nextScale = computeAutoZoomScale(boxFrac);

    // Cell-grid centre of the focused box, as a 0..1 fraction of the board.
    const centerFracX = (minC + maxC + 1) / (2 * boardSize);
    const centerFracY = (minR + maxR + 1) / (2 * boardSize);
    const rect = wrapperRef.current?.getBoundingClientRect();
    const rawTx = rect ? -(centerFracX - 0.5) * rect.width * nextScale : 0;
    const rawTy = rect ? -(centerFracY - 0.5) * rect.height * nextScale : 0;
    const clamped = clampTranslation(rawTx, rawTy, nextScale);

    autoAppliedRef.current = true;
    setScale(nextScale);
    setTx(clamped.tx);
    setTy(clamped.ty);
  }, [focusKey, boardSize, focusCells, clampTranslation]);

  // Flag a transition whenever the transform actually changes (not during a
  // live pinch — that follows the finger 1:1 with no easing, so no blur).
  useEffect(() => {
    const prev = prevTransformRef.current;
    if (prev.scale === scale && prev.tx === tx && prev.ty === ty) return;
    prevTransformRef.current = { scale, tx, ty };
    if (!gestureRef.current) setIsTransitioning(true);
  }, [scale, tx, ty]);

  const handleTransitionEnd = useCallback(() => setIsTransitioning(false), []);

  const transformStyle = useMemo(() => {
    const transition = gestureRef.current
      ? 'none'
      : reducedMotion
        ? 'transform 1ms linear'
        : `transform ${ZOOM_FEEL.transitionMs}ms ${ZOOM_FEEL.easing}`;
    return {
      transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
      transformOrigin: 'center center',
      transition,
      filter: boardFilter({
        reducedMotion,
        isTransitioning,
        gestureActive: !!gestureRef.current,
      }),
      willChange: 'transform',
    };
  }, [scale, tx, ty, reducedMotion, isTransitioning]);

  return (
    <div
      ref={wrapperRef}
      role="region"
      aria-label={ariaLabel}
      data-wc-zoom={isZoomed ? 'true' : 'false'}
      className="relative w-full h-full overflow-hidden"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        className="w-full h-full"
        style={transformStyle}
        data-wc-board
        data-wc-transitioning={isTransitioning ? 'true' : 'false'}
        onTransitionEnd={handleTransitionEnd}
      >
        {children}
      </div>
      {/* Cinematic vignette — darkens the board edges while zoomed so the
          focused area reads as the camera's depth-of-field subject. */}
      <div
        data-wc-vignette
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300',
          isZoomed && !reducedMotion ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background: `radial-gradient(ellipse at center, transparent 60%, rgba(26,26,46,${ZOOM_FEEL.vignetteOpacity}) 100%)`,
        }}
      />
      {isZoomed && (
        <button
          type="button"
          onClick={handleManualReset}
          aria-label={resetLabel}
          data-wc-zoom-reset
          className={cn(
            'absolute top-1.5 end-1.5 z-10 inline-flex items-center justify-center',
            'min-w-9 h-9 px-2 rounded-neo border-2 border-black bg-neo-yellow text-neo-navy',
            'shadow-hard-sm font-neo-display font-black text-xs uppercase tracking-wider',
            'transition-transform active:scale-90 hover:-translate-y-0.5',
          )}
        >
          {Math.round(scale * 10) / 10}× ✕
        </button>
      )}
    </div>
  );
}
