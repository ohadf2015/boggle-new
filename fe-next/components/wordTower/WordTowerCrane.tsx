'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  evaluatePlacement,
  craneOffsetAt,
  TOPPLE_AFTER_SLOPPY,
  type PlacementOutcome,
} from '@/lib/wordTower/cranePlacement';
import { beamWidthFor } from '@/lib/wordTower/craneBeam';

/** Imperative handle so a parent CTA (e.g. the bottom HUD) can trigger the
 *  drop — keeps the player's finger pinned to one button rather than chasing
 *  the crane to the top of the screen. */
export interface WordTowerCraneHandle {
  drop: () => void;
}

interface WordTowerCraneProps {
  /** The validated word being placed (rendered on the swinging block). */
  word: string;
  /** Prior bad-drop streak — feeds the recoverable-topple rule + meter. */
  consecutiveSloppy: number;
  onDrop: (outcome: PlacementOutcome) => void;
  /** Sweep direction at drop time — fed to lean tracking by the parent. */
  onSignedDrop?: (signed: number) => void;
  t: (key: string) => string;
  reducedMotion?: boolean;
  /** Sweep period (ms). */
  periodMs?: number;
  /** Test/override seam: returns the signed offset [-1,1] at drop time. */
  getOffset?: () => number;
  /** When true, the crane chrome renders without its own drop button — the
   *  parent CTA drives `drop()` via the imperative ref instead. */
  hideOwnButton?: boolean;
}

const QUALITY_STYLE: Record<string, string> = {
  perfect: 'bg-neo-lime text-neo-black',
  good: 'bg-neo-cyan text-neo-black',
  sloppy: 'bg-neo-yellow text-neo-black',
  miss: 'bg-neo-red text-neo-white',
};

/** How far the trolley carriage slides along the jib (px from centre). */
const TROLLEY_RANGE_PX = 110;
/** Length of the cable from the trolley down to the hook (px). */
const CABLE_LEN_PX = 64;

/**
 * WordTowerCrane — Tower-Bloks placement overlay with a real crane chrome.
 *
 * A horizontal jib spans the top of the bay; a trolley carriage slides L↔R
 * along it; a cable drops from the trolley to a hook that carries the WORD
 * BEAM (length scales with word length so longer words read as bigger girders).
 * Tap to drop — beam detaches, falls, squashes on landing, then disappears.
 *
 * Pure decision logic + a thin rAF sweep — the outcome is unit-tested and
 * the component stays presentational.
 *
 * The drop trigger is exposed via `useImperativeHandle` so the parent can
 * mount the CTA at the BOTTOM of the screen (where the player's thumb already
 * is) instead of forcing a finger trip to the top.
 *
 * A11y: reduced-motion holds the carriage at centre (a generous, skill-free
 * "good" placement) rather than animating.
 */
const WordTowerCrane = forwardRef<WordTowerCraneHandle, WordTowerCraneProps>(function WordTowerCrane(
  {
    word,
    consecutiveSloppy,
    onDrop,
    onSignedDrop,
    t,
    reducedMotion = false,
    periodMs = 1800,
    getOffset,
    hideOwnButton = false,
  },
  ref,
) {
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const droppedRef = useRef(false);
  const [result, setResult] = useState<PlacementOutcome | null>(null);
  // Detach animation: once dropped, the beam drops straight down before the
  // verdict pill replaces the tap button — gives the impact a real beat.
  const [falling, setFalling] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
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

  const drop = useCallback(() => {
    if (droppedRef.current) return;
    droppedRef.current = true;
    const signedOffset = getOffset ? getOffset() : posRef.current;
    onSignedDrop?.(signedOffset);
    const outcome = evaluatePlacement(Math.abs(signedOffset), consecutiveSloppy);
    setFalling(true);
    // Short fall, then settle the verdict — keeps the impact felt.
    setTimeout(() => {
      setResult(outcome);
      onDrop(outcome);
    }, reducedMotion ? 0 : 260);
  }, [getOffset, onSignedDrop, onDrop, consecutiveSloppy, reducedMotion]);

  useImperativeHandle(ref, () => ({ drop }), [drop]);

  const trolleyX = pos * TROLLEY_RANGE_PX;
  const beamW = beamWidthFor(word.length);

  // Instability dots — 0, 1, 2, 3 (3 = next miss topples a floor).
  const dots = Array.from({ length: TOPPLE_AFTER_SLOPPY + 1 }, (_, i) => i < consecutiveSloppy);

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 top-[10%] z-30 flex flex-col items-center gap-3 px-4"
      role="group"
      aria-label={t('wordTower.crane.place')}
    >
      {/* Stability meter — instability you can SEE before the topple lands */}
      <div
        className="flex items-center gap-1.5 rounded-neo border-neo border-black bg-neo-navy/85 px-2 py-1 font-neo-body text-[10px] font-bold uppercase tracking-wider text-neo-white shadow-hard backdrop-blur-sm"
        aria-label={t('wordTower.crane.stability')}
      >
        <span className="text-[10px]">{t('wordTower.crane.stability')}</span>
        <div className="flex gap-1" aria-hidden>
          {dots.map((on, i) => (
            <span
              key={i}
              className={cn(
                'h-2 w-2 rounded-full border border-black',
                on
                  ? i >= TOPPLE_AFTER_SLOPPY
                    ? 'bg-neo-red'
                    : i === TOPPLE_AFTER_SLOPPY - 1
                    ? 'bg-neo-orange'
                    : 'bg-neo-yellow'
                  : 'bg-neo-navy-light',
              )}
            />
          ))}
        </div>
      </div>

      {/* Crane chrome — mast + jib + cable + hook + beam */}
      <div className="relative flex w-full max-w-md flex-col items-center" style={{ height: '168px' }}>
        {/* Left mast */}
        <div className="absolute start-2 top-0 h-[90px] w-3 rounded-b-neo border-neo border-black bg-neo-yellow shadow-hard" aria-hidden />
        {/* Diagonal mast brace */}
        <div
          className="absolute start-3 top-12 h-1 w-12 origin-top-left rounded-sm bg-neo-yellow border border-black"
          style={{ transform: 'rotate(28deg)' }}
          aria-hidden
        />
        {/* Horizontal jib (the arm) — spans the bay */}
        <div className="absolute top-[18px] z-10 h-3 w-[90%] rounded-neo border-neo-thick border-black bg-neo-yellow shadow-hard" aria-hidden>
          {/* Jib bracing pattern */}
          <div className="flex h-full items-center justify-between px-2 text-[8px] text-black/40">
            <span>▲▼▲▼▲▼</span>
          </div>
        </div>
        {/* Trolley + cable + hook + held beam — slides along the jib */}
        <div
          className="absolute top-[20px] z-20 will-change-transform"
          style={{
            transform: `translateX(${trolleyX}px) translateY(${falling ? 80 : 0}px)`,
            transition: falling ? 'transform 240ms cubic-bezier(0.5,0,0.75,0)' : 'none',
            transformOrigin: 'top center',
          }}
        >
          {/* Trolley carriage */}
          <div className="mx-auto h-3 w-9 rounded-sm border border-black bg-neo-navy-light shadow-hard" aria-hidden />
          {/* Cable */}
          <div
            className="mx-auto w-[2px] bg-black"
            style={{ height: `${CABLE_LEN_PX}px` }}
            aria-hidden
          />
          {/* Hook */}
          <div className="mx-auto -mt-1 h-3 w-4 rounded-b-full border-[1.5px] border-t-0 border-black bg-neo-yellow-light shadow-hard" aria-hidden />
          {/* Held WORD BEAM — width scales with word length */}
          <div
            data-testid="crane-block"
            className={cn(
              'mx-auto mt-0.5 flex items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cyan font-neo-display text-base font-black uppercase tracking-wide text-neo-black shadow-hard',
              !reducedMotion && !falling && 'animate-neo-pop',
            )}
            style={{ width: `${beamW}px`, height: '38px' }}
          >
            {word}
          </div>
        </div>

        {/* Centre drop guide — the place the beam should land */}
        <div
          className="absolute bottom-2 z-0 h-1.5 w-20 rounded-full border border-dashed border-neo-lime/60 bg-neo-lime/15"
          aria-hidden
        />
      </div>

      {result ? (
        <div
          role="status"
          aria-live="assertive"
          className={cn(
            'rounded-neo border-neo-thick border-black px-4 py-1 font-neo-display text-base font-black uppercase shadow-hard',
            QUALITY_STYLE[result.quality],
            !reducedMotion && 'animate-neo-pop',
          )}
        >
          {t(`wordTower.crane.${result.quality}`)}
        </div>
      ) : hideOwnButton ? null : (
        <button
          type="button"
          data-testid="crane-drop"
          onClick={drop}
          disabled={falling}
          className={cn(
            'rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-2 font-neo-display text-base font-black uppercase text-neo-black shadow-hard transition-transform active:translate-y-px',
            !reducedMotion && !falling && 'animate-neo-pop',
            falling && 'opacity-40',
          )}
        >
          {t('wordTower.crane.tapToDrop')}
        </button>
      )}
    </div>
  );
});

export default WordTowerCrane;
