'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  evaluatePlacement,
  craneOffsetAt,
  alignmentBand,
  TOPPLE_AFTER_SLOPPY,
  type PlacementOutcome,
  type PlacementQuality,
} from '@/lib/wordTower/cranePlacement';
import { beamWidthFor } from '@/lib/wordTower/craneBeam';
import { swayAngleAt, swayNormalizedOffset, effectiveDropError } from '@/lib/wordTower/towerSway';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';

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
  /** Tower instability (0..1). Above the sway gate the LANDING TARGET swings —
   *  the player must time the drop against a moving top. WYSIWYG: the target
   *  guide + landing shadow track the same offset that scores the drop. */
  instability?: number;
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

/** Live beam tint by the band the CURRENT sweep position would score — turns the
 *  blind tap into a readable skill shot. Perfect gets a glowing ring to nail the
 *  "stop it here" feedback loop. */
const BAND_BEAM: Record<PlacementQuality, string> = {
  perfect: 'bg-neo-lime ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy',
  good: 'bg-neo-cyan',
  sloppy: 'bg-neo-yellow',
  miss: 'bg-neo-red text-neo-white',
};
/** Landing-shadow fill (CSS colour) matching the live band — projected on the
 *  drop guide so the player sees WHERE + HOW WELL the beam will land. */
const BAND_SHADOW: Record<PlacementQuality, string> = {
  perfect: 'rgba(191,255,0,0.55)',
  good: 'rgba(0,255,255,0.4)',
  sloppy: 'rgba(255,225,53,0.4)',
  miss: 'rgba(255,51,102,0.4)',
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
    instability = 0,
    getOffset,
    hideOwnButton = false,
  },
  ref,
) {
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  // Sway offset of the landing target (signed, crane [-1,1] space). 0 when the
  // tower is steady; oscillates once unstable so the target swings under the beam.
  const [sway, setSway] = useState(0);
  const swayRef = useRef(0);
  const instabilityRef = useRef(instability);
  instabilityRef.current = instability;
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
      const elapsed = now - start;
      const x = craneOffsetAt(elapsed, periodMs);
      posRef.current = x;
      setPos(x);
      // Swing the landing target when the tower is unstable (0 = steady). Uses the
      // ABSOLUTE timestamp (not `elapsed`, which resets each floor when periodMs
      // changes) so it stays phase-locked with the Pixi tower's visible swing —
      // the swaying tower IS the moving target the player aims at.
      const s = swayNormalizedOffset(swayAngleAt(now, instabilityRef.current));
      swayRef.current = s;
      setSway(s);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, periodMs]);

  const drop = useCallback(() => {
    if (droppedRef.current) return;
    droppedRef.current = true;
    const signedOffset = getOffset ? getOffset() : posRef.current;
    const swayOffset = swayRef.current;
    // Residual misalignment vs the (possibly swaying) top — drives both the lean
    // tracker and the verdict, so tracking a swinging tower lands clean.
    const residual = signedOffset - swayOffset;
    onSignedDrop?.(residual);
    const outcome = evaluatePlacement(effectiveDropError(signedOffset, swayOffset), consecutiveSloppy);
    setFalling(true);
    // Let the girder fall most of the way (so the beam visibly lands) before the
    // verdict pops + the tower commits — keeps the placement one continuous beat.
    setTimeout(() => {
      setResult(outcome);
      onDrop(outcome);
    }, reducedMotion ? 0 : 300);
  }, [getOffset, onSignedDrop, onDrop, consecutiveSloppy, reducedMotion]);

  useImperativeHandle(ref, () => ({ drop }), [drop]);

  const { language } = useLanguage();
  const trolleyX = pos * TROLLEY_RANGE_PX;
  const beamW = beamWidthFor(word.length);
  // The band the CURRENT sweep position would score AGAINST THE SWAYING TOP —
  // drives the live beam tint + landing shadow so the drop is a readable skill
  // shot even while the target swings (WYSIWYG).
  const liveBand = alignmentBand(effectiveDropError(pos, sway));
  const aiming = !falling && !result;
  // Hebrew: show the word-final letter in its sofit form and lay the beam RTL.
  // Width still keys off the raw length (same glyph count).
  const beamWord = language === 'he' ? applyHebrewFinalLetters(word) : word;

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
        {/* Trolley sweep wrapper — translateX only. The landing shadow lives in
            here too, so it shares the EXACT horizontal offset + centring as the
            beam and stays glued under it (no abspos-in-flex drift). The inner div
            owns the vertical fall so the ground shadow doesn't drop with it. */}
        <div
          className="absolute top-[20px] z-20 will-change-transform"
          style={{ transform: `translateX(${trolleyX}px)` }}
        >
          <div
            style={{
              transform: `translateY(${falling ? 94 : 0}px)`,
              // Gravity accelerates the girder down, then a soft catch as it sets
              // onto the tower — heavier + more satisfying than the old fast snap.
              transition: falling ? 'transform 340ms cubic-bezier(0.45,0,0.2,1)' : 'none',
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
                'mx-auto mt-0.5 flex items-center justify-center rounded-neo border-neo-thick border-black font-neo-display text-base font-black uppercase tracking-wide text-neo-black shadow-hard transition-colors duration-100',
                BAND_BEAM[liveBand],
                !reducedMotion && !falling && 'animate-neo-pop',
              )}
              style={{ width: `${beamW}px`, height: '38px' }}
              dir={language === 'he' ? 'rtl' : 'ltr'}
            >
              {beamWord}
            </div>
          </div>
          {/* Predictive landing shadow — centred under the beam (shares this
              wrapper's translateX), parked on the drop guide; recolours by the
              live band so the player SEES where + how cleanly the beam will land.
              Sibling of the faller, so it stays on the ground. */}
          {aiming && (
            <div
              className="absolute left-1/2 top-[132px] z-0 h-2 w-14 -translate-x-1/2 rounded-[50%] blur-[1px]"
              style={{ backgroundColor: BAND_SHADOW[liveBand], transition: 'background-color 100ms linear' }}
              aria-hidden
            />
          )}
        </div>

        {/* Drop-target guide — the bullseye the beam should land on. It SWINGS
            with the unstable tower-top (same offset that scores the drop), so the
            player aims the beam at where the top actually is. Brighter ring makes
            it a clear reticle, not just a faint dash. */}
        <div
          className="absolute bottom-2 z-0 h-2 w-20 rounded-full border-neo border-dashed border-neo-lime/70 bg-neo-lime/20 will-change-transform"
          style={{ transform: `translateX(${sway * TROLLEY_RANGE_PX}px)`, transition: reducedMotion ? 'none' : 'transform 60ms linear' }}
          aria-hidden
        />
      </div>

      {/* When the parent drives the drop (hideOwnButton), it also OWNS the
          verdict — the big center pop — so the crane shows neither button nor
          its own small pill here (avoids a double verdict + double SR announce). */}
      {hideOwnButton ? null : result ? (
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
      ) : (
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
