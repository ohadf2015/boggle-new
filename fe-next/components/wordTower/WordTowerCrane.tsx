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
import { releaseFx } from '@/lib/wordTower/craneReleaseFx';
import { swayAngleAt, swayNormalizedOffset, effectiveDropError } from '@/lib/wordTower/towerSway';
import { craneBeamBricks, craneBeamTilePx } from '@/lib/wordTower/craneBeamDisplay';
import { pendulumTargetDeg, stepPendulum, REST_PENDULUM, type PendulumState } from '@/lib/wordTower/cranePendulum';
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
  /** The FINAL committed material colour of the tile at the current build line
   *  (CSS `#rrggbb`). The carried girder wears this exact colour so it does NOT
   *  change appearance when it commits — the old build tinted the held block by
   *  drop quality, so it snapped to a different colour on landing. Quality
   *  feedback now lives on the reticle/shadow/glow ring instead. */
  blockColorHex?: string;
  /** Legible glyph colour on `blockColorHex` (CSS `#rrggbb`). */
  blockTextHex?: string;
}

const QUALITY_STYLE: Record<string, string> = {
  perfect: 'bg-neo-lime text-neo-black',
  good: 'bg-neo-cyan text-neo-black',
  sloppy: 'bg-neo-yellow text-neo-black',
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

/** Default per-letter tile size for the held girder (short words). The word is
 *  carried as a VERTICAL column of square bricks — the exact orientation it
 *  settles into in the tower (pos 0 = base at the bottom) — so the carried
 *  payload reads as the same shape it becomes once placed. Longer words shrink
 *  the bricks (craneBeamTilePx) so the FULL word still fits the bay. */
const CRANE_BEAM_TILE_PX = 38;
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
    blockColorHex = '#7c8a99',
    blockTextHex = '#fffef0',
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
  // The band the drop actually scored — drives the release celebration (a clean
  // "you nailed the spot" burst) shown DURING the fall, before the parent clears
  // the word and unmounts the crane.
  const [droppedQuality, setDroppedQuality] = useState<PlacementQuality | null>(null);

  // Cosmetic pendulum: the carried girder LAGS the trolley as it sweeps, swings,
  // and settles — sells "this block has weight + gravity". Render-only; never
  // feeds the drop verdict (drop() reads posRef/swayRef only). On release the
  // target snaps to 0 so the load hangs straight as it falls (so a perfect-aimed
  // drop never *looks* offset at the landing moment — WYSIWYG stays honest).
  const [pendulumDeg, setPendulumDeg] = useState(0);
  const pendulumRef = useRef<PendulumState>({ ...REST_PENDULUM });
  const prevPosRef = useRef(0);
  const prevNowRef = useRef(0);
  const fallingRef = useRef(false);

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
      // Pendulum: trail the trolley's velocity (units/sec, normalised), settle to
      // 0 the instant the load is released so it hangs straight through the fall.
      const dtMs = prevNowRef.current ? now - prevNowRef.current : 16;
      const velNorm = (x - prevPosRef.current) / (Math.max(dtMs, 1) / 1000) / 2.5;
      const target = fallingRef.current ? 0 : pendulumTargetDeg(velNorm);
      const p = stepPendulum(pendulumRef.current, target, dtMs);
      pendulumRef.current = p;
      setPendulumDeg(p.angleDeg);
      prevPosRef.current = x;
      prevNowRef.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, periodMs]);

  const drop = useCallback(() => {
    if (droppedRef.current) return;
    droppedRef.current = true;
    fallingRef.current = true; // straighten the pendulum through the fall
    const signedOffset = getOffset ? getOffset() : posRef.current;
    const swayOffset = swayRef.current;
    // Residual misalignment vs the (possibly swaying) top — drives both the lean
    // tracker and the verdict, so tracking a swinging tower lands clean.
    const residual = signedOffset - swayOffset;
    onSignedDrop?.(residual);
    const outcome = evaluatePlacement(effectiveDropError(signedOffset, swayOffset), consecutiveSloppy);
    setDroppedQuality(outcome.quality);
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
  // The band the CURRENT sweep position would score AGAINST THE SWAYING TOP —
  // drives the live beam tint + landing shadow so the drop is a readable skill
  // shot even while the target swings (WYSIWYG).
  const liveBand = alignmentBand(effectiveDropError(pos, sway));
  const aiming = !falling && !result;
  // Release celebration — fires DURING the fall when the drop scored well, so the
  // "you let go in the right spot!" payoff lands before the crane unmounts. Perfect
  // gets a glowing girder + a fat sparkle burst; good gets a small spark.
  const release = droppedQuality ? releaseFx(droppedQuality) : null;
  const celebrating = falling && !reducedMotion && !!release?.celebrate;
  const onSweetSpot = aiming && liveBand === 'perfect';
  // Hebrew: show the word-final letter in its sofit form and lay the beam RTL.
  const beamWord = language === 'he' ? applyHebrewFinalLetters(word) : word;
  // Show the FULL word the crane is placing (founder: "show all the letters it
  // is trying to put"). The bricks shrink to share a fixed vertical budget so a
  // long girder stays inside the bay instead of running off the top. Only a
  // pathologically long word (> the cap) badges any remainder.
  const { chars: beamChars, hiddenCount } = craneBeamBricks(beamWord);
  const beamTilePx = craneBeamTilePx(beamChars.length);
  const beamH = beamChars.length * beamTilePx;
  // Glyph size tracks the brick so dense (small-brick) girders stay legible.
  const beamFontPx = Math.max(11, Math.round(beamTilePx * 0.5));

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
              transform: `translateY(${falling ? 100 : 0}px)`,
              // True gravity feel: an ease-IN curve so the girder ACCELERATES the
              // whole way down (slow lift-off → fast slam) instead of the old
              // ease-in-out that decelerated before landing. The landing squash on
              // the girder below supplies the "catch", so the fall itself can hit
              // hard. Tuned to land just as the verdict pops (drop() fires at 300ms).
              transition: falling ? 'transform 300ms cubic-bezier(0.55,0.06,0.9,0.28)' : 'none',
              transformOrigin: 'top center',
            }}
          >
            {/* Trolley carriage — the fixed joint the load hangs + swings from. */}
            <div className="mx-auto h-3 w-9 rounded-sm border border-black bg-neo-navy-light shadow-hard" aria-hidden />
            {/* Pendulum group — cable + hook + beam swing as ONE rigid load around
                the carriage joint (transform-origin top). The tilt LAGS the trolley
                so the block reads as a heavy thing under gravity; it settles to
                upright the moment it's released (drop straightens it). */}
            <div
              className="relative will-change-transform"
              style={{ transform: `rotate(${pendulumDeg}deg)`, transformOrigin: 'top center' }}
            >
              {/* Cable */}
              <div
                className="mx-auto w-[2px] bg-black"
                style={{ height: `${CABLE_LEN_PX}px` }}
                aria-hidden
              />
              {/* Hook */}
              <div className="mx-auto -mt-1 h-3 w-4 rounded-b-full border-[1.5px] border-t-0 border-black bg-neo-yellow-light shadow-hard" aria-hidden />
              {/* Held WORD BEAM — up to 3 bricks stacked base-first (flex-col-reverse:
                  word[0] at the bottom, exactly how it settles into the tower at pos 0).
                  The bricks wear the FINAL committed material colour, so the girder does
                  NOT change colour when it lands. The "stop here" skill cue lives on the
                  glow ring + the reticle/shadow below, not on the face. */}
              <div className="relative mx-auto" style={{ width: `${beamTilePx}px` }}>
                <div
                  data-testid="crane-block"
                  className={cn(
                    'flex flex-col-reverse items-stretch justify-center gap-px rounded-neo',
                    !reducedMotion && !falling && 'animate-neo-pop',
                    !reducedMotion && falling && 'crane-girder-land',
                    celebrating && release?.glow && 'crane-girder-perfect',
                    // Perfect-release cue: a lime glow ring (NOT a face recolour) so
                    // the skill shot stays readable while the colour stays honest.
                    onSweetSpot && 'ring-4 ring-neo-lime ring-offset-2 ring-offset-neo-navy',
                  )}
                  style={{ width: `${beamTilePx}px`, height: `${beamH}px` }}
                  dir={language === 'he' ? 'rtl' : 'ltr'}
                >
                  {beamChars.map((ch, i) => (
                    <span
                      key={i}
                      data-testid="crane-letter"
                      className="flex flex-1 items-center justify-center rounded-neo border-neo-thick border-black font-neo-display font-black uppercase shadow-hard"
                      style={{ backgroundColor: blockColorHex, color: blockTextHex, fontSize: `${beamFontPx}px` }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                {/* "+N" badge — the carried girder is capped to 3 bricks; this keeps
                    the word's true length legible without building a tall stack. */}
                {hiddenCount > 0 && (
                  <span
                    className="absolute -right-2 -top-2 z-20 rounded-full border border-black bg-neo-navy px-1 font-neo-display text-[9px] font-black leading-tight text-neo-white shadow-hard"
                    aria-hidden
                  >
                    +{hiddenCount}
                  </span>
                )}
                {/* Sparkle burst — scattered around the landed girder when the drop
                    scored well. Pure CSS; count + reach scale with how clean it was. */}
                {celebrating && release && (
                  <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
                    {Array.from({ length: release.sparkles }).map((_, i) => {
                      const ang = (i / release.sparkles) * Math.PI * 2;
                      const dist = release.glow ? 30 : 18;
                      return (
                        <span
                          key={i}
                          className="crane-spark absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-neo-lime"
                          style={{
                            // @ts-expect-error custom props consumed by the keyframe
                            '--sx': `${Math.cos(ang) * dist}px`,
                            '--sy': `${Math.sin(ang) * dist}px`,
                            animationDelay: `${(i % 4) * 20}ms`,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
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
          className={cn(
            'absolute bottom-2 z-0 h-2 w-20 rounded-full border-neo border-dashed will-change-transform',
            // On the sweet spot the reticle goes SOLID + bright + pulses, so the
            // player can SEE the perfect release moment before letting go.
            onSweetSpot
              ? cn(
                  'border-solid border-neo-lime bg-neo-lime/60 shadow-[0_0_10px_2px_rgba(191,255,0,0.7)]',
                  !reducedMotion && 'crane-target-hot',
                )
              : 'border-neo-lime/70 bg-neo-lime/20',
          )}
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
