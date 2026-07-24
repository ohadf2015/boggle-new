'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  evaluatePlacement,
  craneOffsetAt,
  alignmentBand,
  type PlacementOutcome,
  type PlacementQuality,
} from '@/lib/wordTower/cranePlacement';
import { craneSwingFactor } from '@/lib/wordTower/craneSweep';
import { landFeedback } from '@/lib/wordTower/landFeedback';
import { CraneAlignmentBar, CraneFooter, CraneSparkBurst, CraneStabilityMeter } from './WordTowerCraneBits';
import { swayAngleAt, swayNormalizedOffset, effectiveDropError } from '@/lib/wordTower/towerSway';
import { craneBeamBricks, craneBeamTilePx } from '@/lib/wordTower/craneBeamDisplay';
import {
  CRANE_CHROME_H_PX,
  CRANE_SHADOW_Y_PX,
  CRANE_OUTER_GAP_PX,
  CRANE_TROLLEY_TOP_PX,
  CRANE_SHADOW_VISUAL_NUDGE_PX,
  craneArmPx,
  craneCableLenPx,
  craneFallPx,
} from '@/lib/wordTower/craneGeometry';
import { fallDurationMs } from '@/lib/wordTower/fallProfile';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

/** Imperative handle so a parent CTA can trigger the drop. */
export interface WordTowerCraneHandle {
  drop: () => void;
}

interface WordTowerCraneProps {
  word: string;
  consecutiveSloppy: number;
  onDrop: (outcome: PlacementOutcome) => void;
  /** Signed drop offset for lean tracking. Simplified: just the trolley position. */
  onSignedDrop?: (signed: number) => void;
  t: (key: string) => string;
  reducedMotion?: boolean;
  periodMs?: number;
  instability?: number;
  perfectBandBonus?: number;
  getOffset?: () => number;
  hideOwnButton?: boolean;
  blockColorHex?: string;
  blockTextHex?: string;
  craneTopPx?: number;
}

/** Drop-target guide colours keyed to the live placement band. */
const BAND_SHADOW: Record<PlacementQuality, string> = {
  perfect: 'rgba(191,255,0,0.55)',
  good: 'rgba(0,255,255,0.4)',
  sloppy: 'rgba(255,225,53,0.4)',
  miss: 'rgba(255,51,102,0.4)',
};

const BAND_GLOW: Record<PlacementQuality, string> = {
  perfect: 'rgba(191,255,0,0.9)',
  good: 'rgba(0,255,255,0.8)',
  sloppy: 'rgba(255,225,53,0.75)',
  miss: 'rgba(255,51,102,0.7)',
};

const TROLLEY_RANGE_PX = 110;

/**
 * WordTowerCrane — Rebuilt from scratch: simplified placement mechanic.
 *
 * A horizontal jib spans the top of the bay; a trolley carriage slides L/R
 * along it; a cable drops from the trolley to the WORD BEAM. Tap to drop —
 * the beam falls straight down to where the trolley is. No pendulum, no
 * ballistic drift, no load offset — WYSIWYG: the trolley position IS the
 * scored position. The alignment bar shows the current quality band so the
 * player learns the timing intuitively.
 *
 * The placement verdict still uses evaluatePlacement from cranePlacement.ts
 * (untouched). Only the crane's visual mechanic is simplified.
 */
const WordTowerCrane = forwardRef<WordTowerCraneHandle, WordTowerCraneProps>(function WordTowerCrane(
  {
    word,
    consecutiveSloppy,
    craneTopPx,
    onDrop,
    onSignedDrop,
    t,
    reducedMotion = false,
    periodMs = 1800,
    instability = 0,
    perfectBandBonus = 0,
    getOffset,
    hideOwnButton = false,
    blockColorHex = '#7c8a99',
    blockTextHex = '#fffef0',
  },
  ref,
) {
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const [sway, setSway] = useState(0);
  const swayRef = useRef(0);
  const instabilityRef = useRef(instability);
  instabilityRef.current = instability;
  const swingKRef = useRef(1);
  const droppedRef = useRef(false);
  const [result, setResult] = useState<PlacementOutcome | null>(null);
  const [falling, setFalling] = useState(false);
  const [droppedQuality, setDroppedQuality] = useState<PlacementQuality | null>(null);
  const fallingRef = useRef(false);
  const dropAtRef = useRef(0);

  const beamLen = craneBeamBricks(word).chars.length;
  const beamHPx = beamLen * craneBeamTilePx(beamLen);
  const cableLen = craneCableLenPx(beamHPx);
  const fallPx = craneFallPx(beamHPx);
  const armPx = craneArmPx(beamHPx);
  const fallMs = fallDurationMs(Math.max(0, beamLen - 2));
  const fallMsRef = useRef(fallMs);
  fallMsRef.current = fallMs;

  // rAF sweep: moves the trolley left-right at constant velocity (triangle wave)
  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      // Trolley position: triangle wave [-1, 1], scaled by swing factor
      const x = droppedRef.current ? posRef.current : craneOffsetAt(elapsed, periodMs) * swingKRef.current;
      posRef.current = x;
      setPos(x);
      // Tower sway offset — the landing target oscillates when unstable
      const s = swayNormalizedOffset(swayAngleAt(now, instabilityRef.current));
      swayRef.current = s;
      setSway(s);
      // If falling, do nothing special — beam falls straight down from trolley
      if (fallingRef.current) {
        // No pendulum to straighten, no drift to decay — just wait for impact
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, periodMs]);

  const drop = useCallback(() => {
    if (droppedRef.current) return;
    droppedRef.current = true;
    fallingRef.current = true;

    // The trolley position IS the scored position — WYSIWYG, no pendulum/drift
    const signedOffset = getOffset ? getOffset() : posRef.current;
    const swayOffset = swayRef.current;
    // Effective error: distance from trolley to (possibly swaying) target
    const residual = signedOffset - swayOffset;
    onSignedDrop?.(residual);
    const outcome = evaluatePlacement(effectiveDropError(signedOffset, swayOffset), consecutiveSloppy, perfectBandBonus);
    setDroppedQuality(outcome.quality);
    dropAtRef.current = performance.now();
    setFalling(true);
    // Let the beam fall before the verdict pops
    setTimeout(() => {
      setResult(outcome);
      onDrop(outcome);
    }, reducedMotion ? 0 : fallMsRef.current);
  }, [getOffset, onSignedDrop, onDrop, consecutiveSloppy, reducedMotion, perfectBandBonus]);

  useImperativeHandle(ref, () => ({ drop }), [drop]);

  const { language } = useLanguage();
  const perf = useDevicePerformance();
  const enableGlowTrail = perf.enableGlowEffects && !reducedMotion;
  const trolleyX = pos * TROLLEY_RANGE_PX;

  // The band the CURRENT sweep position would score against the swaying top
  const liveBand = alignmentBand(effectiveDropError(pos, sway), perfectBandBonus);
  const aiming = !falling && !result;
  // Release celebration
  const release = droppedQuality
    ? landFeedback(droppedQuality, { reducedMotion, depthFloors: word.length })
    : null;
  const celebrating = falling && !reducedMotion && !!release?.celebrate;
  const onSweetSpot = aiming && liveBand === 'perfect';

  // Hebrew: show word-final letters in sofit form
  const beamWord = language === 'he' ? applyHebrewFinalLetters(word) : word;
  const { chars: beamChars, hiddenCount } = craneBeamBricks(beamWord);
  const beamTilePx = craneBeamTilePx(beamChars.length);
  const beamFontPx = Math.max(11, Math.round(beamTilePx * 0.5));
  swingKRef.current = craneSwingFactor(beamChars.length);

  return (
    <div
      data-testid="wt-crane"
      className="pointer-events-auto absolute inset-x-0 z-30 flex flex-col items-center px-4"
      style={{ top: craneTopPx ?? '20%', gap: `${CRANE_OUTER_GAP_PX}px` }}
      role="group"
      aria-label={t('wordTower.crane.place')}
    >
      <CraneStabilityMeter consecutiveSloppy={consecutiveSloppy} t={t} />

      {/* Crane chrome — mast + jib + cable + beam */}
      <div
        data-testid="crane-chrome"
        className="relative flex w-full max-w-md flex-col items-center"
        style={{ height: `${CRANE_CHROME_H_PX}px` }}
      >
        {/* Left mast */}
        <div
          className="absolute start-2 top-0 h-[90px] w-3 rounded-b-neo border-neo border-black bg-neo-yellow shadow-hard"
          style={{ boxShadow: 'inset 2px 0 0 rgba(255,255,255,0.4), inset -2px 0 0 rgba(0,0,0,0.3), 2px 2px 0 rgba(0,0,0,0.85)' }}
          aria-hidden
        />
        <div
          className="absolute start-3 top-12 h-1 w-12 origin-top-left rounded-sm bg-neo-yellow-hover border border-black"
          style={{ transform: 'rotate(28deg)' }}
          aria-hidden
        />
        <div
          className="absolute start-3 top-[88px] h-1 w-12 origin-bottom-left rounded-sm bg-neo-yellow-hover border border-black"
          style={{ transform: 'rotate(-28deg)' }}
          aria-hidden
        />
        {/* Cab image */}
        <img
          src="/images/word-tower/crane/cab.png"
          alt=""
          aria-hidden
          width={39}
          height={40}
          className="absolute -top-2 start-0 z-0 h-10 w-auto select-none"
          draggable={false}
        />
        {/* Horizontal jib */}
        <div
          className="absolute top-[18px] z-10 h-3 w-[90%] overflow-hidden rounded-neo border-neo-thick border-black bg-neo-yellow shadow-hard"
          style={{
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.3), 2px 2px 0 rgba(0,0,0,0.85)',
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(0,0,0,0.3) 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.3) 0 1.5px, transparent 1.5px 9px)',
          }}
          aria-hidden
        />
        {/* Trolley sweep wrapper */}
        <div
          className="absolute z-20 will-change-transform"
          style={{ top: `${CRANE_TROLLEY_TOP_PX}px`, transform: `translateX(${trolleyX}px)` }}
        >
          <div
            style={{
              transform: `translateY(${falling ? fallPx : 0}px)`,
              transition: falling ? `transform ${fallMs}ms cubic-bezier(0.55,0.06,0.9,0.28)` : 'none',
              transformOrigin: 'top center',
            }}
          >
            {/* Trolley carriage */}
            <div className="relative mx-auto h-3 w-9 rounded-sm border border-black bg-neo-navy-light shadow-hard" aria-hidden>
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-black bg-neo-yellow-hover shadow-hard-sm" />
            </div>
            {/* Cable + beam — no pendulum, beam hangs straight down */}
            <div className="relative will-change-transform">
              {/* Cable */}
              <div
                data-testid="crane-cable"
                className="mx-auto w-[2px] bg-black"
                style={{ height: `${cableLen}px` }}
                aria-hidden
              />
              {/* Hook */}
              <div
                className="mx-auto -mt-1 h-3 w-4 rounded-b-full border-[1.5px] border-t-0 border-black bg-neo-yellow-light shadow-hard"
                style={{
                  transform: falling ? 'rotate(26deg)' : 'rotate(0deg)',
                  transformOrigin: 'top center',
                  transition: reducedMotion ? 'none' : 'transform 120ms ease-out',
                }}
                aria-hidden
              />
              {/* Held WORD BEAM */}
              <div className="relative mx-auto" style={{ width: `${beamTilePx}px` }}>
                <div
                  data-testid="crane-block"
                  className={cn(
                    'flex flex-col-reverse items-stretch justify-center gap-px rounded-none',
                    !reducedMotion && !falling && 'animate-neo-pop',
                    !reducedMotion && falling && 'crane-girder-land',
                    celebrating && release?.glow && 'crane-girder-perfect',
                    onSweetSpot && 'ring-4 ring-neo-lime ring-offset-2 ring-offset-neo-navy',
                  )}
                  style={{ width: `${beamTilePx}px`, height: `${beamHPx}px` }}
                  dir={language === 'he' ? 'rtl' : 'ltr'}
                >
                  {beamChars.map((ch, i) => (
                    <span
                      key={i}
                      data-testid="crane-letter"
                      className="flex flex-1 items-center justify-center border-neo-thick border-black font-neo-display font-black uppercase"
                      style={{
                        backgroundColor: blockColorHex,
                        color: blockTextHex,
                        fontSize: `${beamFontPx}px`,
                        boxShadow: 'inset 3px 3px 0 rgba(255,255,255,0.38), inset -3px -4px 0 rgba(0,0,0,0.34), 2px 2px 0 rgba(0,0,0,0.85)',
                      }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                {hiddenCount > 0 && (
                  <span
                    className="absolute -right-2 -top-2 z-20 rounded-full border border-black bg-neo-navy px-1 font-neo-display text-[9px] font-black leading-tight text-neo-white shadow-hard"
                    aria-hidden
                  >
                    +{hiddenCount}
                  </span>
                )}
                {celebrating && release && <CraneSparkBurst release={release} />}
              </div>
            </div>
          </div>
          {/* Predictive landing shadow */}
          {aiming && (
            <div
              className="absolute left-1/2 z-0 h-2 w-14 rounded-[50%] blur-[1px]"
              style={{
                top: `${CRANE_SHADOW_Y_PX - CRANE_SHADOW_VISUAL_NUDGE_PX}px`,
                backgroundColor: BAND_SHADOW[liveBand],
                transition: 'background-color 100ms linear',
              }}
              aria-hidden
            />
          )}
        </div>

        {/* Glow trail along the jib */}
        {enableGlowTrail && aiming && (
          <div
            className="pointer-events-none absolute inset-x-0 z-0 will-change-transform"
            style={{
              top: `${CRANE_TROLLEY_TOP_PX - 10}px`,
              height: '22px',
              background: `radial-gradient(circle at calc(50% + ${trolleyX}px), ${BAND_GLOW[liveBand]} 0%, transparent 70%)`,
              opacity: liveBand === 'perfect' ? 0.85 : liveBand === 'good' ? 0.55 : liveBand === 'sloppy' ? 0.35 : 0.2,
              transition: 'opacity 100ms linear',
            }}
            aria-hidden
          />
        )}

        {/* Drop-target guide — swings with unstable tower */}
        <div
          className={cn(
            'absolute z-0 h-2 w-20 rounded-full border-neo border-dashed will-change-transform',
            onSweetSpot
              ? cn(
                  'border-solid border-neo-lime bg-neo-lime/60 shadow-[0_0_10px_2px_rgba(191,255,0,0.7)]',
                  !reducedMotion && 'crane-target-hot',
                )
              : 'border-neo-lime/70 bg-neo-lime/20',
          )}
          style={{
            top: `${CRANE_TROLLEY_TOP_PX + CRANE_SHADOW_Y_PX - CRANE_SHADOW_VISUAL_NUDGE_PX}px`,
            transform: `translateX(${sway * TROLLEY_RANGE_PX}px)`,
            transition: reducedMotion ? 'none' : 'transform 60ms linear',
          }}
          aria-hidden
        />
      </div>

      {/* Alignment bar — shows the current quality band */}
      {aiming && (
        <CraneAlignmentBar
          pos={pos}
          sway={sway}
          liveBand={liveBand}
          perfectBandBonus={perfectBandBonus}
          onSweetSpot={onSweetSpot}
          reducedMotion={reducedMotion}
          t={t}
        />
      )}

      {!hideOwnButton && (
        <CraneFooter result={result} falling={falling} reducedMotion={reducedMotion} onTap={drop} t={t} />
      )}
    </div>
  );
});

export default WordTowerCrane;
