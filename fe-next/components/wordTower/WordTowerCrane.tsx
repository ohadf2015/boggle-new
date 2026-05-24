'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  evaluatePlacement,
  craneOffsetAt,
  type PlacementOutcome,
} from '@/lib/wordTower/cranePlacement';

interface WordTowerCraneProps {
  /** The validated word being placed (rendered on the swinging block). */
  word: string;
  /** Prior bad-drop streak — feeds the recoverable-topple rule. */
  consecutiveSloppy: number;
  onDrop: (outcome: PlacementOutcome) => void;
  t: (key: string) => string;
  reducedMotion?: boolean;
  /** Sweep period (ms). */
  periodMs?: number;
  /** Test/override seam: returns the signed offset [-1,1] at drop time. */
  getOffset?: () => number;
}

const QUALITY_STYLE: Record<string, string> = {
  perfect: 'bg-neo-lime text-neo-black',
  good: 'bg-neo-cyan text-neo-black',
  sloppy: 'bg-neo-yellow text-neo-black',
  miss: 'bg-neo-red text-neo-white',
};

/**
 * WordTowerCrane — Tower-Bloks placement overlay.
 *
 * A block carrying the just-built word sweeps left↔right on a crane; tap to drop.
 * The horizontal error at drop time drives {@link evaluatePlacement} (the cosy
 * reward-amplifier model — see spec). Pure decision logic + a thin rAF sweep, so
 * the outcome is unit-tested and the component stays presentational.
 *
 * Accessibility: with reduced motion the block holds at centre (a generous,
 * skill-free "good" placement) rather than animating — no twitch reflex needed.
 */
export default function WordTowerCrane({
  word,
  consecutiveSloppy,
  onDrop,
  t,
  reducedMotion = false,
  periodMs = 1800,
  getOffset,
}: WordTowerCraneProps) {
  // Live sweep position (-1..1) for rendering; the ref is read at drop time.
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const droppedRef = useRef(false);
  const [result, setResult] = useState<PlacementOutcome | null>(null);

  useEffect(() => {
    if (reducedMotion) return; // hold centre — accessible, skill-free
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const x = craneOffsetAt(now - start, periodMs);
      posRef.current = x;
      setPos(x);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, periodMs]);

  const drop = () => {
    if (droppedRef.current) return; // one drop per word
    droppedRef.current = true;
    const offset = getOffset ? getOffset() : posRef.current;
    const outcome = evaluatePlacement(Math.abs(offset), consecutiveSloppy);
    setResult(outcome);
    onDrop(outcome);
  };

  // Map sweep [-1,1] → track position [0%,100%].
  const leftPct = `${((pos + 1) / 2) * 100}%`;

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 top-[18%] z-30 flex flex-col items-center gap-2 px-4"
      role="group"
      aria-label={t('wordTower.crane.place')}
    >
      {/* Sweep track with a centre target zone */}
      <div className="relative h-12 w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-navy-light/90 shadow-hard">
        {/* centre target */}
        <div className="absolute left-1/2 top-0 h-full w-12 -translate-x-1/2 rounded-neo border-2 border-dashed border-neo-lime/70" />
        {/* swinging word block */}
        <div
          data-testid="crane-block"
          style={{ left: leftPct }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-neo border-neo-thick border-black bg-neo-cyan px-3 py-1 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard"
        >
          {word}
        </div>
      </div>

      {result ? (
        <div
          role="status"
          aria-live="assertive"
          className={cn(
            'rounded-neo border-neo-thick border-black px-4 py-1 font-neo-display text-base font-black uppercase shadow-hard',
            QUALITY_STYLE[result.quality],
          )}
        >
          {t(`wordTower.crane.${result.quality}`)}
        </div>
      ) : (
        <button
          type="button"
          data-testid="crane-drop"
          onClick={drop}
          className="animate-neo-pop rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-2 font-neo-display text-base font-black uppercase text-neo-black shadow-hard transition-transform active:translate-y-px"
        >
          {t('wordTower.crane.tapToDrop')}
        </button>
      )}
    </div>
  );
}
