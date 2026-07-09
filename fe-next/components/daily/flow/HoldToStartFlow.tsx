'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Zap, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface HoldToStartFlowProps {
  /**
   * Fired once per gesture. `fast` is false for a quick tap (relaxed flow) and
   * true when the player holds long enough to fill the ring (fast flow).
   */
  onStart: (fast: boolean) => void;
  /** Primary label (e.g. "Play all challenges"). */
  label: string;
  /** Sub-hint describing the hold gesture (e.g. "Hold for fast flow"). */
  holdHint: string;
  /** How long the hold must last to arm the fast flow. */
  holdMs?: number;
  className?: string;
}

/**
 * One control, two intents — the "fun to select" start affordance for the Daily
 * Flow. A quick tap begins the relaxed run; pressing and holding fills a ring
 * around the button and, once full, commits to the fast run. Every press also
 * drops a ripple from the touch point so the gesture always feels alive.
 *
 * Deliberately a single button so the choice reads as one playful gesture
 * ("tap, or hold for turbo") instead of two competing CTAs.
 */
export function HoldToStartFlow({
  onStart,
  label,
  holdHint,
  holdMs = 850,
  className,
}: HoldToStartFlowProps) {
  const [holdProgress, setHoldProgress] = useState(0); // 0..1
  const [holding, setHolding] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // Refs so timers/RAF read live values without re-subscribing.
  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false); // guards against tap+hold double fire
  const rippleIdRef = useRef(0);
  // Holds the latest frame callback so the rAF loop can re-schedule itself
  // without `tick` referencing its own binding (react-hooks/immutability).
  const tickRef = useRef<() => void>(() => {});

  const clearLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => clearLoop, [clearLoop]);

  const commit = useCallback(
    (fast: boolean) => {
      if (firedRef.current) return;
      firedRef.current = true;
      clearLoop();
      setHolding(false);
      setHoldProgress(0);
      onStart(fast);
    },
    [clearLoop, onStart],
  );

  // Drive the hold ring. happy-dom/jsdom lack a real rAF clock, so we fall back
  // to Date.now() deltas that fake timers can advance; the frame loop just
  // re-samples elapsed / holdMs until it hits 1 → fast flow.
  const tick = useCallback(() => {
    const elapsed = Date.now() - startedAtRef.current;
    const progress = Math.min(1, elapsed / holdMs);
    setHoldProgress(progress);
    if (progress >= 1) {
      commit(true);
      return;
    }
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [holdMs, commit]);

  // Keep the ref pointed at the current tick so the self-scheduling loop always
  // runs the latest closure.
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const addRipple = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++rippleIdRef.current;
    setRipples((prev) => [
      ...prev,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    // Auto-retire the ripple after its animation window.
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 650);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      firedRef.current = false;
      addRipple(e);
      startedAtRef.current = Date.now();
      setHolding(true);
      setHoldProgress(0);
      // Some environments don't implement pointer capture — guard it.
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        /* no-op */
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [addRipple, tick],
  );

  const endHold = useCallback(() => {
    clearLoop();
    setHolding(false);
    setHoldProgress(0);
    // Released before the ring filled → treat as a tap (relaxed flow). If the
    // hold already committed the fast flow, firedRef short-circuits this.
    commit(false);
  }, [clearLoop, commit]);

  const handlePointerUp = useCallback(() => {
    if (firedRef.current) {
      // Fast flow already fired mid-hold; just reset visual state.
      setHolding(false);
      setHoldProgress(0);
      return;
    }
    endHold();
  }, [endHold]);

  const handlePointerLeave = useCallback(() => {
    // Dragging off the button cancels an in-progress hold without starting
    // anything — avoids an accidental relaxed-flow fire on a fumbled press.
    if (firedRef.current || !holding) return;
    firedRef.current = true;
    clearLoop();
    setHolding(false);
    setHoldProgress(0);
  }, [clearLoop, holding]);

  // SVG ring geometry.
  const R = 30;
  const C = 2 * Math.PI * R;

  return (
    <div className={cn('relative w-full', className)}>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        aria-label={label}
        className={cn(
          'relative w-full overflow-hidden select-none touch-none',
          'rounded-neo border-3 border-neo-black shadow-hard-lg',
          'bg-gradient-to-br from-neo-lime to-neo-cyan',
          'px-5 py-4 flex items-center gap-4',
          'transition-transform active:translate-y-px',
          'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
        )}
      >
        {/* Hold-fill wash rising from the bottom as the ring fills. */}
        <div
          className="absolute inset-0 bg-neo-black/10 origin-bottom pointer-events-none"
          style={{ transform: `scaleY(${holdProgress})` }}
          aria-hidden
        />

        {/* Ripples — self-retire from state after their animation window, so no
            AnimatePresence is needed (keeps the control renderable under partial
            framer-motion mocks). */}
        {ripples.map((r) => (
          <m.span
            key={r.id}
            className="absolute rounded-full bg-neo-white/50 pointer-events-none"
            style={{ left: r.x, top: r.y }}
            initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.5 }}
            animate={{ width: 320, height: 320, x: -160, y: -160, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            aria-hidden
          />
        ))}

        {/* Progress ring around the icon medallion. */}
        <span className="relative shrink-0 w-16 h-16 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 68 68" aria-hidden>
            <circle cx="34" cy="34" r={R} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="5" />
            <circle
              cx="34"
              cy="34"
              r={R}
              fill="none"
              stroke="#0B0F1A"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - holdProgress)}
              style={{ transition: holding ? 'none' : 'stroke-dashoffset 0.2s ease-out' }}
            />
          </svg>
          <span className="w-11 h-11 rounded-full bg-neo-white border-2 border-neo-black flex items-center justify-center shadow-hard-xs">
            {holdProgress > 0.05 ? (
              <Zap className="w-6 h-6 text-neo-black" strokeWidth={2.5} />
            ) : (
              <Play className="w-6 h-6 text-neo-black" strokeWidth={2.5} />
            )}
          </span>
        </span>

        {/* Labels */}
        <span className="relative flex-1 min-w-0 text-start">
          <span className="block font-neo-display font-black text-lg text-neo-black leading-tight">
            {label}
          </span>
          <span className="block text-xs font-bold text-neo-black/70">
            {holding && holdProgress > 0.05 ? holdHint : holdHint}
          </span>
        </span>
      </button>
    </div>
  );
}

export default HoldToStartFlow;
