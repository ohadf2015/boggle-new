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

const MIN_SCALE = 1;
const MAX_SCALE = 2.4;
const DOUBLE_TAP_MS = 280;

export interface WordCraftZoomShellProps {
  children: ReactNode;
  /** Optional aria-label for the wrapper. */
  ariaLabel?: string;
  resetLabel?: string;
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

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const isZoomed = scale > 1.001;

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

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
          if (isZoomed) reset();
          else setScale(2);
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

  const transformStyle = useMemo(
    () => ({
      transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
      transformOrigin: 'center center',
      transition: gestureRef.current ? 'none' : 'transform 180ms ease-out',
      willChange: 'transform',
    }),
    [scale, tx, ty],
  );

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
      <div className="w-full h-full" style={transformStyle}>
        {children}
      </div>
      {isZoomed && (
        <button
          type="button"
          onClick={reset}
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
