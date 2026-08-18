'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  evaluatePlacement,
  craneOffsetAt,
  alignmentBand,
  dropQualityIntensity,
  type PlacementOutcome,
  type PlacementQuality,
} from '@/lib/wordTower/cranePlacement';
import { craneSwingFactor } from '@/lib/wordTower/craneSweep';
import { landFeedback } from '@/lib/wordTower/landFeedback';
import { CraneFooter, CraneSparkBurst } from './WordTowerCraneBits';
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
import {
  pendulumTargetDeg,
  stepPendulum,
  REST_PENDULUM,
  cableRecoilPx,
  cableStretchAt,
  loadOffsetNorm,
  type PendulumState,
} from '@/lib/wordTower/cranePendulum';
import { landingOffset, driftFracAt, smoothVelocity } from '@/lib/wordTower/dropKinematics';
import {
  fallDurationMs,
  fallEase,
  settleBounceFrac,
  settleOvershoot,
  impactParams,
  FALL_PHASE_FRAC,
} from '@/lib/wordTower/fallProfile';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

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
  /** Fires whenever the LIVE placement band changes while aiming. Lets the
   *  bottom-of-screen DROP control mirror the crane's aim, so the player can
   *  time the shot without splitting their attention between the crane at the
   *  top of the screen and their thumb at the bottom. `null` once released. */
  onLiveBandChange?: (band: PlacementQuality | null) => void;
  t: (key: string) => string;
  reducedMotion?: boolean;
  /** Sweep period (ms). */
  periodMs?: number;
  /** Tower instability (0..1). Above the sway gate the LANDING TARGET swings —
   *  the player must time the drop against a moving top. WYSIWYG: the target
   *  guide + landing shadow track the same offset that scores the drop. */
  instability?: number;
  /** Widens the PERFECT landing band (Wide Footing upgrade) so the green sweet-
   *  spot is easier to nail. Applied to both the live preview band and the scored
   *  drop, so WYSIWYG holds. 0 = base window. */
  perfectBandBonus?: number;
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
  /** Outer top (px) from {@link playChromeFrame} so the landing shadow sits on
   *  the shared build line. Falls back to a 20% viewport fraction. */
  craneTopPx?: number;
}

/** Landing-shadow fill — a NEUTRAL cast shadow showing WHERE the beam will land.
 *
 *  It used to be keyed to the live placement band (lime on perfect, cyan/yellow/red
 *  otherwise), which pre-announced the verdict before the player committed: line
 *  the lime up, release, collect the multiplier. The judgement is meant to be the
 *  player's, so the guide now reports position only. `alignmentBand` and
 *  `evaluatePlacement` are untouched — the post-drop verdict pill still tells you
 *  how you did, it just no longer tells you beforehand. */
const NEUTRAL_SHADOW = 'rgba(12,18,32,0.45)';

/** Soft jib glow — a luminous trail that helps time the drop. Constant for the
 *  same reason as the shadow: brightness must not leak the band. */
const NEUTRAL_GLOW = 'rgba(226,232,240,0.55)';
const NEUTRAL_GLOW_OPACITY = 0.4;

/** How far the trolley carriage slides along the jib (px from centre). */
const TROLLEY_RANGE_PX = 110;

/**
 * WordTowerCrane — Tower-Bloks placement overlay with a real crane chrome.
 *
 * A horizontal jib spans the top of the bay; a trolley carriage slides L↔R
 * along it; a SHORT cable drops from the trolley to a hook that carries the
 * WORD BEAM (length scales with word length so longer words read as bigger
 * girders). Tap to drop — the beam detaches and falls under real, integrated
 * gravity, then squashes and rebounds where it lands.
 *
 * ## Why this component is imperative
 *
 * Every per-frame value (trolley position, pendulum angle, cable stretch, fall
 * offset, drift) is held in a REF and written straight to the element's
 * `style`, exactly the way `WordTowerScene.applyPan` drives the camera. These
 * used to be `useState`, which meant the whole crane subtree re-rendered on
 * every animation frame for the entire time a word was held — the single
 * biggest reason play felt sluggish, and (via `setSway`) the flicker that got
 * tower sway switched off entirely. The only values that reach React are ones
 * that change a handful of times per drop: `falling`, `result`, the scored
 * quality, and the live placement band.
 *
 * The drop verdict still reads `posRef`/`swayRef`, so nothing about WYSIWYG or
 * the scoring path changed — only who owns the pixels.
 *
 * A11y: reduced-motion holds the carriage at centre (a generous, skill-free
 * "good" placement) rather than animating.
 */
const WordTowerCrane = forwardRef<WordTowerCraneHandle, WordTowerCraneProps>(function WordTowerCrane(
  {
    word,
    consecutiveSloppy,
    craneTopPx,
    onDrop,
    onSignedDrop,
    onLiveBandChange,
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
  // ── per-frame state: refs only, never React ──
  const posRef = useRef(0);
  const swayRef = useRef(0);
  const instabilityRef = useRef(instability);
  instabilityRef.current = instability;
  // Per-letter swing scale — read live inside the rAF sweep; updated in render
  // from the current beam length so adding a letter widens the swing (#9).
  const swingKRef = useRef(1);
  const droppedRef = useRef(false);
  const pendulumRef = useRef<PendulumState>({ ...REST_PENDULUM });
  const prevPosRef = useRef(0);
  const prevNowRef = useRef(0);
  const fallingRef = useRef(false);
  const dropAtRef = useRef(0);
  // Ballistic momentum: the trolley's smoothed velocity (norm units/ms) at
  // release decides how far the freed girder DRIFTS during the fall — the
  // Tower Bloxx skill of letting go slightly before centre. The verdict and
  // the visual both come from the same projection (WYSIWYG stays honest).
  const velPerMsRef = useRef(0);
  const driftPxRef = useRef(0);
  // Load tracking — the swinging girder (trolley + swung arm) is the SCORED
  // object; its smoothed velocity feeds the momentum projection at release.
  const prevLoadRef = useRef(0);
  const releaseAngleRef = useRef(0);
  const dropQualityRef = useRef<PlacementQuality | null>(null);
  const liveBandRef = useRef<PlacementQuality>('perfect');

  // ── element refs the rAF writes to directly ──
  const trolleyElRef = useRef<HTMLDivElement>(null);
  const driftElRef = useRef<HTMLDivElement>(null);
  const fallerElRef = useRef<HTMLDivElement>(null);
  const pendulumElRef = useRef<HTMLDivElement>(null);
  const cableElRef = useRef<HTMLDivElement>(null);
  const beamElRef = useRef<HTMLDivElement>(null);
  const shadowElRef = useRef<HTMLDivElement>(null);
  const reticleElRef = useRef<HTMLDivElement>(null);
  const glowElRef = useRef<HTMLDivElement>(null);

  // ── React state: only what actually changes the rendered TREE ──
  const [result, setResult] = useState<PlacementOutcome | null>(null);
  // Detach animation: once dropped, the beam falls before the verdict pill
  // replaces the tap button — gives the impact a real beat.
  const [falling, setFalling] = useState(false);
  // The band the drop actually scored — drives the release celebration (a clean
  // "you nailed the spot" burst) shown DURING the fall, before the parent clears
  // the word and unmounts the crane.
  const [droppedQuality, setDroppedQuality] = useState<PlacementQuality | null>(null);
  // The band the CURRENT sweep would score. Changes at most a few times per
  // pass, so it is cheap to keep in React — and the reticle/sweet-spot styling
  // plus the parent's DROP control both need it declaratively.
  const [liveBand, setLiveBand] = useState<PlacementQuality>('perfect');

  // Adaptive hang geometry — cable, swing arm and fall distance all derive from
  // the girder height so the load hangs high under the jib and lands EXACTLY on
  // the shadow (craneGeometry owns the arithmetic).
  const beamLen = craneBeamBricks(word).chars.length;
  // The girder is now ONE ROW of bricks (the floor it becomes), so its height is
  // a single brick and its width grows with the word. Height feeds the hang
  // geometry — a one-brick-tall load leaves real air under the hook to fall
  // through, where the old vertical column ate most of the drop.
  const beamTileSize = craneBeamTilePx(beamLen);
  const beamHPx = beamLen > 0 ? beamTileSize : 0;
  const beamWPx = beamLen > 0 ? beamLen * beamTileSize + (beamLen - 1) * 3 : 0;
  const cableLen = craneCableLenPx(beamHPx);
  const fallPx = craneFallPx(beamHPx);
  const armPx = craneArmPx(beamHPx);
  const armPxRef = useRef(armPx);
  armPxRef.current = armPx;
  const cableLenRef = useRef(cableLen);
  cableLenRef.current = cableLen;
  const fallPxRef = useRef(fallPx);
  fallPxRef.current = fallPx;
  // Depth-scaled hang — longer words fall longer (Tower Bloxx weight). Shared
  // with landingOffset so projected drift matches the visual fall window.
  const fallMs = fallDurationMs(Math.max(0, beamLen - 2));
  const fallMsRef = useRef(fallMs);
  fallMsRef.current = fallMs;
  // Rebound height of the landed girder, in px. Depth-scaled and capped by
  // `settleOvershoot` so a long drop lands heavier without ever pinging.
  const settleUpPx = fallPx * settleOvershoot(Math.max(0, beamLen - 2));
  const settleUpPxRef = useRef(settleUpPx);
  settleUpPxRef.current = settleUpPx;
  // Landing squash — how far the girder pancakes at touchdown, by drop depth.
  const squashAmt = impactParams(Math.max(0, beamLen - 2)).squash;
  const squashAmtRef = useRef(squashAmt);
  squashAmtRef.current = squashAmt;
  const perfectBandBonusRef = useRef(perfectBandBonus);
  perfectBandBonusRef.current = perfectBandBonus;
  const onLiveBandChangeRef = useRef(onLiveBandChange);
  onLiveBandChangeRef.current = onLiveBandChange;

  /** Publish a band change to React + the parent — only on an actual change. */
  const pushBand = useCallback((band: PlacementQuality) => {
    if (liveBandRef.current === band) return;
    liveBandRef.current = band;
    setLiveBand(band);
    onLiveBandChangeRef.current?.(band);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      const dtMs = prevNowRef.current ? now - prevNowRef.current : 16;

      if (fallingRef.current) {
        // ── released: ballistic girder ──────────────────────────────────────
        // The drop window is split: FALL_PHASE_FRAC of it is the fall, the rest
        // is the touchdown settle. Total time is unchanged, so the commit still
        // fires exactly when it always did — the settle is bought from the tail
        // of the same window rather than appended after it (the crane unmounts
        // on commit, so anything appended would never be seen).
        const total = fallMsRef.current;
        const impactAt = total * FALL_PHASE_FRAC;
        const tSince = now - dropAtRef.current;
        const qI = dropQualityIntensity(dropQualityRef.current ?? 'good');

        if (tSince < impactAt) {
          const k = Math.min(1, tSince / impactAt);
          // TRUE GRAVITY: position integrates as k² (fallEase), so the girder is
          // genuinely slow off the hook and genuinely fast at touchdown. This
          // replaces a CSS cubic-bezier that only approximated the shape and
          // could not be interrupted or followed by a settle.
          if (fallerElRef.current) {
            fallerElRef.current.style.transform = `translateY(${fallPxRef.current * fallEase(k)}px)`;
          }
          // Momentum carry — the freed girder keeps sliding sideways (ease-out)
          // and lands exactly on the projected offset the verdict scored.
          if (driftElRef.current) {
            driftElRef.current.style.transform = `translateX(${driftPxRef.current * driftFracAt(k)}px)`;
          }
          // Deterministic straighten: the freed load pivots to hang straight in
          // sync with the fall window, so at touchdown its visual x is exactly
          // trolley + drift — the projected offset the verdict scored.
          const straight = releaseAngleRef.current * Math.pow(1 - k, 1.5);
          pendulumRef.current = { angleDeg: straight, velDegPerSec: 0 };
          if (pendulumElRef.current) pendulumElRef.current.style.transform = `rotate(${straight}deg)`;
          // Cable personality: whip (recoil) + load stretch scaled by drop quality
          // (heavier miss yanks the cable harder — Tower Bloxx cable feel).
          if (cableElRef.current) {
            cableElRef.current.style.height = `${cableLenRef.current + cableRecoilPx(k) + cableStretchAt(k, qI)}px`;
          }
        } else {
          // ── touchdown: squash, rebound, rest ──
          const k2 = Math.min(1, (tSince - impactAt) / Math.max(1, total - impactAt));
          const up = settleUpPxRef.current * settleBounceFrac(k2);
          if (fallerElRef.current) {
            fallerElRef.current.style.transform = `translateY(${fallPxRef.current - up}px)`;
          }
          if (driftElRef.current) driftElRef.current.style.transform = `translateX(${driftPxRef.current}px)`;
          if (pendulumElRef.current) pendulumElRef.current.style.transform = 'rotate(0deg)';
          // Pancake on contact and recover — the "catch" that makes the block
          // read as heavy. Scaled by drop depth, origin at the girder's feet so
          // it compresses onto the tower rather than sinking through it.
          if (beamElRef.current) {
            const rebound = Math.pow(1 - k2, 3);
            const sy = 1 - squashAmtRef.current * rebound;
            const sx = 1 + squashAmtRef.current * 0.6 * rebound;
            beamElRef.current.style.transform = `scale(${sx}, ${sy})`;
          }
          if (cableElRef.current) cableElRef.current.style.height = `${cableLenRef.current}px`;
        }
      } else {
        // ── aiming: sweep + pendulum + live preview ─────────────────────────
        // Each letter on the beam widens the swing, capped at the full sweep (#9).
        // Scales the single source of the sweep, so the shown swing and the scored
        // release offset stay identical (WYSIWYG).
        const x = craneOffsetAt(elapsed, periodMs) * swingKRef.current;
        posRef.current = x;
        if (trolleyElRef.current) {
          trolleyElRef.current.style.transform = `translateX(${x * TROLLEY_RANGE_PX}px)`;
        }
        // Swing the landing target when the tower is unstable (0 = steady). Uses the
        // ABSOLUTE timestamp (not `elapsed`, which resets each floor when periodMs
        // changes) so it stays phase-locked with the Pixi tower's visible swing —
        // the swaying tower IS the moving target the player aims at.
        const s = swayNormalizedOffset(swayAngleAt(now, instabilityRef.current));
        swayRef.current = s;
        if (reticleElRef.current) {
          reticleElRef.current.style.transform = `translateX(${s * TROLLEY_RANGE_PX}px)`;
        }

        const velNorm = (x - prevPosRef.current) / (Math.max(dtMs, 1) / 1000) / 2.5;
        // Pendulum: the load trails the trolley's velocity (spring-damper).
        const p = stepPendulum(pendulumRef.current, pendulumTargetDeg(velNorm), dtMs);
        pendulumRef.current = p;
        if (pendulumElRef.current) pendulumElRef.current.style.transform = `rotate(${p.angleDeg}deg)`;
        // Live cable stretch from swing load — the girder yanks the cable when
        // the pendulum is maxed (weight under gravity).
        const loadPull = Math.min(1, Math.abs(p.angleDeg) / 10);
        if (cableElRef.current) {
          cableElRef.current.style.height = `${cableLenRef.current + cableStretchAt(0.35, loadPull * 0.55)}px`;
        }
        // The LOAD is what the player times — smooth ITS velocity (norm/ms) for
        // the momentum projection read at the moment of letting go.
        const load = loadOffsetNorm(x, p.angleDeg, armPxRef.current, TROLLEY_RANGE_PX);
        velPerMsRef.current = smoothVelocity(velPerMsRef.current, (load - prevLoadRef.current) / Math.max(dtMs, 1));
        prevLoadRef.current = load;

        // Momentum-projected preview from the LOAD's live position — the exact
        // same projection the verdict uses, so the preview can never disagree
        // with the verdict that follows (WYSIWYG invariant). The depth-scaled
        // `fallMs` MUST be passed here too: the preview used to fall back to the
        // module default while `drop()` passed the real window, so the shadow
        // marked one landing spot and the verdict scored a slightly different one.
        const previewProjected = landingOffset(load, velPerMsRef.current, fallMsRef.current);
        const band = alignmentBand(effectiveDropError(previewProjected, s), perfectBandBonusRef.current);
        pushBand(band);
        const previewDriftPx = (previewProjected - x) * TROLLEY_RANGE_PX;
        if (shadowElRef.current) {
          shadowElRef.current.style.transform = `translateX(calc(-50% + ${previewDriftPx}px))`;
          shadowElRef.current.style.backgroundColor = NEUTRAL_SHADOW;
        }
        if (glowElRef.current) {
          glowElRef.current.style.transform = `translateX(${x * TROLLEY_RANGE_PX}px)`;
          glowElRef.current.style.background = `radial-gradient(circle at 50%, ${NEUTRAL_GLOW} 0%, transparent 70%)`;
          glowElRef.current.style.opacity = String(NEUTRAL_GLOW_OPACITY);
        }
        prevPosRef.current = x;
      }
      prevNowRef.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, periodMs, pushBand]);

  // Stop mirroring the aim once this crane goes away — the parent's DROP control
  // must not keep wearing a stale band after the word has been placed.
  useEffect(() => () => onLiveBandChangeRef.current?.(null), []);

  const drop = useCallback(() => {
    if (droppedRef.current) return;
    droppedRef.current = true;
    fallingRef.current = true; // straighten the pendulum through the fall
    // The LOAD (trolley + swung arm) is the scored object — what the player
    // watches is what the verdict reads.
    const signedOffset = getOffset
      ? getOffset()
      : loadOffsetNorm(posRef.current, pendulumRef.current.angleDeg, armPxRef.current, TROLLEY_RANGE_PX);
    releaseAngleRef.current = pendulumRef.current.angleDeg;
    const swayOffset = swayRef.current;
    // Ballistic landing: same fallMs as the rAF window so carry matches visual.
    const projected = landingOffset(signedOffset, velPerMsRef.current, fallMsRef.current);
    // Drift is applied inside the (frozen) trolley wrapper, so it spans from
    // the trolley to the projected landing — the straightening pendulum closes
    // the swing part of that gap during the fall.
    driftPxRef.current = (projected - posRef.current) * TROLLEY_RANGE_PX;
    // Residual misalignment vs the (possibly swaying) top — drives both the lean
    // tracker and the verdict, so tracking a swinging tower lands clean.
    const residual = projected - swayOffset;
    onSignedDrop?.(residual);
    const outcome = evaluatePlacement(effectiveDropError(projected, swayOffset), consecutiveSloppy, perfectBandBonus);
    setDroppedQuality(outcome.quality);
    dropQualityRef.current = outcome.quality;
    dropAtRef.current = performance.now();
    onLiveBandChangeRef.current?.(null); // aim is spent — clear the mirrored band
    setFalling(true);
    // Let the girder fall + settle before the verdict pops and the tower
    // commits — keeps the placement one continuous beat.
    setTimeout(() => {
      setResult(outcome);
      onDrop(outcome);
    }, reducedMotion ? 0 : fallMsRef.current);
  }, [getOffset, onSignedDrop, onDrop, consecutiveSloppy, reducedMotion, perfectBandBonus]);

  useImperativeHandle(ref, () => ({ drop }), [drop]);

  const { language } = useLanguage();
  const perf = useDevicePerformance();
  const enableGlowTrail = perf.enableGlowEffects && !reducedMotion;
  const aiming = !falling && !result;
  // Release celebration — event-driven landFeedback so perfect/good sparkles
  // + glow match the scene's land punch; reduced-motion zeroes continuous juice.
  const release = droppedQuality
    ? landFeedback(droppedQuality, { reducedMotion, depthFloors: word.length })
    : null;
  const celebrating = falling && !reducedMotion && !!release?.celebrate;
  // Hebrew: show the word-final letter in its sofit form and lay the beam RTL.
  const beamWord = language === 'he' ? applyHebrewFinalLetters(word) : word;
  // Show the FULL word the crane is placing (founder: "show all the letters it
  // is trying to put"). The bricks shrink to share a fixed vertical budget so a
  // long girder stays inside the bay instead of running off the top. Only a
  // pathologically long word (> the cap) badges any remainder.
  const { chars: beamChars, hiddenCount } = craneBeamBricks(beamWord);
  const beamTilePx = craneBeamTilePx(beamChars.length);
  // Glyph size tracks the brick so dense (small-brick) girders stay legible.
  const beamFontPx = Math.max(11, Math.round(beamTilePx * 0.52));
  // Feed the live beam length to the sweep so each added letter swings wider (#9).
  swingKRef.current = craneSwingFactor(beamChars.length);

  return (
    <div
      data-testid="wt-crane"
      className="pointer-events-auto absolute inset-x-0 z-30 flex flex-col items-center px-4"
      // `gap` is driven by the SAME constant `craneShadowOffsetFromOuterTop`
      // uses, deliberately. It is 0 today (the chrome is the only child since
      // the stability meter was removed), so it is inert — but anything mounted
      // ABOVE the chrome later must bump that constant, or the gap it adds will
      // push the landing shadow off the build line it is pinned to. Keeping the
      // style bound to the constant means the two can never drift apart.
      style={{ top: craneTopPx ?? '20%', gap: `${CRANE_OUTER_GAP_PX}px` }}
      role="group"
      aria-label={t('wordTower.crane.place')}
    >
      {/* The STABILITY dot-meter that used to sit here is gone. It was an
          always-on widget at the top of the screen restating something the
          scene now says better and diegetically: the tower visibly leans and
          sways as drops get imprecise, and the do-or-die state already gets its
          own banner via the notice column's `critical` flag. Dropping it also
          bought ~44px of headroom above the build line, which went straight
          into a longer fall (see CRANE_SHADOW_Y_PX). */}

      {/* Crane chrome — mast + jib + cable + hook + beam */}
      <div
        data-testid="crane-chrome"
        className="relative flex w-full max-w-md flex-col items-center"
        style={{ height: `${CRANE_CHROME_H_PX}px` }}
      >
        {/* Left mast — same pixel-block bevel as the tower bricks (inset
            highlight/shadow) so the crane reads as one material with the
            tower it's building, not a flat colour cutout. */}
        <div
          className="absolute start-2 top-0 h-[90px] w-3 rounded-b-neo border-neo border-black bg-neo-yellow shadow-hard"
          style={{ boxShadow: 'inset 2px 0 0 rgba(255,255,255,0.4), inset -2px 0 0 rgba(0,0,0,0.3), 2px 2px 0 rgba(0,0,0,0.85)' }}
          aria-hidden
        />
        {/* X-cross lattice bracing — a real tower-crane mast reads as a truss,
            not a single stick; two crossing struts sell "riveted steel". */}
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
        {/* Operator cab — sticker art riding the mast top (decorative). Faces the
            jib; sits under it in z so the arm reads as bolted onto the cab. */}
        <Image
          src="/images/word-tower/crane/cab.png"
          alt=""
          aria-hidden
          width={39}
          height={40}
          className="absolute -top-2 start-0 z-0 h-10 w-auto select-none"
          draggable={false}
        />
        {/* Horizontal jib (the arm) — spans the bay. A diagonal criss-cross
            lattice (matching the rival-rail tower's texture technique) reads
            as a real steel truss instead of the old flat bar + tiny glyph
            placeholder text that was illegible at game scale. */}
        <div
          className="absolute top-[18px] z-10 h-3 w-[90%] overflow-hidden rounded-neo border-neo-thick border-black bg-neo-yellow shadow-hard"
          style={{
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.3), 2px 2px 0 rgba(0,0,0,0.85)',
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(0,0,0,0.3) 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.3) 0 1.5px, transparent 1.5px 9px)',
          }}
          aria-hidden
        />
        {/* Trolley sweep wrapper — translateX only, written by the rAF. The
            landing shadow lives in here too, so it shares the EXACT horizontal
            offset + centring as the beam and stays glued under it (no
            abspos-in-flex drift). The inner div owns the vertical fall so the
            ground shadow doesn't drop with it. top offset is
            CRANE_TROLLEY_TOP_PX (SSoT with playChromeFrame). */}
        <div
          ref={trolleyElRef}
          className="absolute z-20 will-change-transform"
          style={{ top: `${CRANE_TROLLEY_TOP_PX}px` }}
        >
          {/* Momentum drift — its own wrapper so the ease-out sideways carry
              composes with the ease-in gravity fall below (one transform can't
              express both curves). */}
          <div ref={driftElRef} className="will-change-transform">
          <div
            ref={fallerElRef}
            className="will-change-transform"
            style={{ transformOrigin: 'top center' }}
          >
            {/* Trolley carriage — the fixed joint the load hangs + swings from.
                A pulley wheel riding on top sells "runs along the jib" instead
                of reading as a floating box with a string. */}
            <div className="relative mx-auto h-3 w-9 rounded-sm border border-black bg-neo-navy-light shadow-hard" aria-hidden>
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-black bg-neo-yellow-hover shadow-hard-sm" />
            </div>
            {/* Pendulum group — cable + hook + beam swing as ONE rigid load around
                the carriage joint (transform-origin top). The tilt LAGS the trolley
                so the block reads as a heavy thing under gravity; it settles to
                upright the moment it's released (drop straightens it). */}
            <div
              ref={pendulumElRef}
              className="relative will-change-transform"
              style={{ transformOrigin: 'top center' }}
            >
              {/* Cable — a SHORT drape holding the load high under the jib.
                  Whips up on release, then settles as the girder falls. */}
              <div
                ref={cableElRef}
                data-testid="crane-cable"
                className="mx-auto w-[2px] bg-black"
                style={{ height: `${cableLen}px` }}
                aria-hidden
              />
              {/* Hook — snaps open the instant the load releases */}
              <div
                className="mx-auto -mt-1 h-3 w-4 rounded-b-full border-[1.5px] border-t-0 border-black bg-neo-yellow-light shadow-hard"
                style={{
                  transform: falling ? 'rotate(26deg)' : 'rotate(0deg)',
                  transformOrigin: 'top center',
                  transition: reducedMotion ? 'none' : 'transform 120ms ease-out',
                }}
                aria-hidden
              />
              {/* Held WORD GIRDER — ONE ROW in reading order, i.e. exactly the
                  floor it becomes when it lands (see lib/wordTower/towerFloor.ts).
                  The bricks wear the FINAL committed material colour, so the girder does
                  NOT change colour when it lands. The "stop here" skill cue lives on the
                  glow ring + the reticle/shadow below, not on the face. */}
              <div className="relative mx-auto" style={{ width: `${beamWPx}px` }}>
                <div
                  ref={beamElRef}
                  data-testid="crane-block"
                  className={cn(
                    'flex flex-row items-stretch justify-center gap-[3px] rounded-none',
                    !reducedMotion && !falling && 'animate-neo-pop',
                    celebrating && release?.glow && 'crane-girder-perfect',
                  )}
                  style={{
                    width: `${beamWPx}px`,
                    height: `${beamHPx}px`,
                    // Squash on touchdown compresses the girder onto the tower.
                    transformOrigin: 'bottom center',
                  }}
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
                        // Same pixel-block read as the tower tiles (#8): a square
                        // face with a flat inset bevel — light top-left, dark
                        // bottom-right — plus a hard drop shadow. So the block
                        // hanging on the crane IS visually the block that lands.
                        boxShadow: 'inset 3px 3px 0 rgba(255,255,255,0.38), inset -3px -4px 0 rgba(0,0,0,0.34), 2px 2px 0 rgba(0,0,0,0.85)',
                      }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                {/* "+N" badge — the carried girder is capped; this keeps the
                    word's true length legible without building a tall stack. */}
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
          </div>
          {/* Predictive landing shadow — centred under the beam (shares this
              wrapper's translateX) PLUS the momentum drift, so it marks where
              the girder will actually LAND; recoloured per frame by the rAF.
              Sibling of the faller, so it stays on the ground. */}
          {aiming && (
            <div
              ref={shadowElRef}
              className="absolute left-1/2 z-0 h-2 w-14 -translate-x-1/2 rounded-[50%] blur-[1px] will-change-transform"
              style={{
                top: `${CRANE_SHADOW_Y_PX - CRANE_SHADOW_VISUAL_NUDGE_PX}px`,
                backgroundColor: NEUTRAL_SHADOW,
              }}
              aria-hidden
            />
          )}
        </div>

        {/* Glow trail along the jib — a tinted puck that TRACKS the trolley via
            transform. It used to repaint a full-width radial gradient every
            frame (a new paint of the whole strip, 60×/s); a translated element
            composites instead. Disabled on reduced-motion or low-end devices. */}
        {enableGlowTrail && aiming && (
          <div
            className="pointer-events-none absolute inset-x-0 z-0 overflow-hidden"
            style={{ top: `${CRANE_TROLLEY_TOP_PX - 10}px`, height: '22px' }}
            aria-hidden
          >
            <div
              ref={glowElRef}
              className="absolute left-1/2 h-full w-40 -translate-x-1/2 will-change-transform"
              style={{
                background: `radial-gradient(circle at 50%, ${NEUTRAL_GLOW} 0%, transparent 70%)`,
                opacity: NEUTRAL_GLOW_OPACITY,
              }}
            />
          </div>
        )}

        {/* Drop-target guide — the build line the beam should land on. It SWINGS
            with the unstable tower-top (same offset that scores the drop), so the
            player aims the beam at where the top actually is.

            Deliberately NEUTRAL. It used to be lime, and go solid + hot + pulsing
            once `liveBand === 'perfect'`, which meant the game showed you the
            verdict while you could still act on it — aiming became "wait for the
            green" rather than reading the swing. It marks the target; judging the
            release is the player's job. */}
        <div
          ref={reticleElRef}
          className={cn(
            'absolute z-0 h-2 w-20 rounded-full border-neo border-dashed will-change-transform',
            'border-neo-cream/50 bg-neo-cream/10',
          )}
          style={{
            // Shares the shadow's landing line (trolley top + shadowY − nudge)
            // so guide + shadow + touchdown are one mark, not three. Offsets
            // share SSoT with playChromeFrame / craneShadowOffsetFromOuterTop.
            top: `${CRANE_TROLLEY_TOP_PX + CRANE_SHADOW_Y_PX - CRANE_SHADOW_VISUAL_NUDGE_PX}px`,
          }}
          aria-hidden
        />
      </div>

      {/* When the parent drives the drop (hideOwnButton), it also OWNS the
          verdict — the big center pop — so the crane shows neither button nor
          its own small pill here (avoids a double verdict + double SR announce). */}
      {!hideOwnButton && (
        <CraneFooter result={result} falling={falling} reducedMotion={reducedMotion} onTap={drop} t={t} />
      )}
    </div>
  );
});

export default WordTowerCrane;
