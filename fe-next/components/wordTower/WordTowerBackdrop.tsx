'use client';

import { memo, type CSSProperties } from 'react';
import { biomeBackdrop } from '@/lib/wordTower/towerLayout';
import { dollyScaleFor } from '@/lib/wordTower/dollyZoom';
import { biomeBlendAt } from '@/lib/wordTower/biomeBlend';
import { BIOME_THEME, type BiomeTheme } from './biomeTheme';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/**
 * Parallax ascent backdrop for the Word Tower scene — pure decoration behind
 * the Pixi tower that sells one continuous climb from a bright city ground into
 * deep space. Every layer is driven by altitude (`heightM`): a two-depth city
 * skyline + ground slide off the bottom as you leave land, three star sheets
 * scroll at parallax depths (far = slow), the sun fades out, clouds fall away,
 * and distant planets fade in for the "and beyond". The biome sky gradient
 * (rendered by the parent) cross-fades the colour underneath.
 *
 * All layers are inert (`aria-hidden`, `pointer-events-none`); under
 * `reducedMotion` every parallax offset collapses to zero (opacities only).
 */

const PX_PER_M = 5.2; // screen px of parallax travel per metre climbed
// Height updates land discretely (one jump per accepted word). Easing every
// altitude-driven offset turns those jumps into a continuous glide — the single
// change that makes the ascent read as motion rather than a static jolt.
const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const FLOW = `transform 900ms ${EASE}, background-position 900ms ${EASE}, opacity 1000ms ease-out`;

/** NEAR skyline — the dark foreground silhouette. Tall, tightly-packed towers. */
const SKYLINE_NEAR = 'M0 26 L0 14 L6 14 L6 8 L12 8 L12 16 L18 16 L18 5 L23 5 L23 16 L30 16 L30 11 L36 11 L36 18 L44 18 L44 7 L49 7 L49 18 L56 18 L56 13 L63 13 L63 4 L68 4 L68 15 L75 15 L75 9 L81 9 L81 17 L88 17 L88 6 L93 6 L93 16 L100 16 L100 26 Z';
/** FAR skyline — a genuinely DIFFERENT silhouette, not the near path recoloured.
 *  Reusing one path at two depths is the single loudest "this is fake" tell in a
 *  parallax city: the eye locks onto the repeated rhythm instantly. This one sits
 *  lower (haze eats the tops), uses wider/squatter blocks, and breaks the roofline
 *  with two slim antenna spires the near layer doesn't have. */
const SKYLINE_FAR = 'M0 26 L0 19 L4 19 L4 15 L11 15 L11 20 L15 20 L15 12 L17 12 L17 6 L18 6 L18 12 L21 12 L21 20 L27 20 L27 17 L34 17 L34 21 L40 21 L40 14 L46 14 L46 19 L52 19 L52 16 L57 16 L57 21 L64 21 L64 13 L66 13 L66 7 L67 7 L67 13 L71 13 L71 19 L78 19 L78 16 L85 16 L85 20 L91 20 L91 14 L96 14 L96 19 L100 19 L100 26 Z';
const MOUNTAINS = 'M0 26 L0 18 L8 10 L16 17 L24 7 L32 16 L40 11 L48 19 L56 9 L64 17 L72 12 L80 20 L88 13 L96 21 L100 26 Z';
/** Lit windows on the NEAR skyline's tall blocks, in the same 0..100 × 0..26
 *  viewBox. Deliberately IRREGULAR (gaps, uneven columns) — a full grid reads as
 *  a texture swatch; a patchy one reads as a building where some people are home.
 *  Each pair is `[x, y]` of a small warm rectangle. */
const WINDOW_CELLS: ReadonlyArray<readonly [number, number]> = [
  [7.2, 10], [9.4, 10], [7.2, 13], [9.4, 16], [7.2, 19],
  [19.1, 7], [21.0, 7], [19.1, 10], [21.0, 13], [19.1, 16], [21.0, 16], [19.1, 21],
  [45.1, 9], [46.9, 9], [46.9, 12], [45.1, 15], [46.9, 18],
  [64.1, 6], [65.9, 9], [64.1, 9], [65.9, 12], [64.1, 15], [65.9, 15], [64.1, 20],
  [89.1, 8], [90.9, 11], [89.1, 14], [90.9, 14], [89.1, 20],
];

/** Repeating star-field gradient — `seed` shifts the pattern so layers differ. */
function starSheet(size: number, dot: number, seed: number): CSSProperties {
  const p = (n: number) => `${(n * 37 + seed * 13) % 100}% ${(n * 53 + seed * 29) % 100}%`;
  const g = (i: number) => `radial-gradient(${dot}px ${dot}px at ${p(i)}, #fff, transparent)`;
  return {
    backgroundImage: [g(1), g(2), g(3), g(4), g(5), g(6)].join(', '),
    backgroundSize: `${size}px ${size}px`,
  };
}

/**
 * Which slice of the backdrop this instance draws.
 *
 * Only `sky` may ride the user's pan. A bottom-anchored layer translated by
 * `pan × BG_PAN_DEPTH` lifts clean off the horizon and exposes bare sky
 * underneath, and a vignette whose centre slides away from the screen centre
 * stops being a lens effect. The screen-locked slices still parallax with
 * ALTITUDE (their `slide()` offsets) — that was always the effect wanted; only
 * the camera pan had to stop moving them.
 *
 * There are THREE slices rather than two purely to preserve paint order. The
 * layers originally rendered in one list, so splitting into "locked" + "panned"
 * and drawing the panned group last would put clouds in front of the near city
 * skyline and bury the fog and vignette under the stars. Sandwiching the pan
 * wrapper keeps the original stacking exactly:
 *
 *   `horizon`  → washes, sun/moon, far skyline, mountains   (behind the pan)
 *   `sky`      → stars, planets, wisps, streaks, clouds      (inside the pan)
 *   `front`    → near skyline, ground fog, vignette          (in front of it)
 */
export type BackdropBand = 'horizon' | 'sky' | 'front';

export const WordTowerBackdrop = memo(function WordTowerBackdrop({
  biomeId,
  heightM = 0,
  reducedMotion = false,
  groundInsetPx,
  band = 'sky',
  panning = false,
}: {
  biomeId: WordTowerBiomeId;
  heightM?: number;
  reducedMotion?: boolean;
  /** Distance from viewport bottom to the control-deck top (px). Ground layers
   *  anchor to this line so the tower base never floats above the cityscape. */
  groundInsetPx?: number;
  /** Which half to draw — see {@link BackdropBand}. */
  band?: BackdropBand;
  /** True while the user is actively panning the camera. Altitude-driven layers
   *  drop their 900ms eases for the duration: `viewAlt` steps every few metres
   *  during a drag, so a long transition just restarts forever and every depth
   *  chases a target it never reaches (reads as the backdrop tearing apart). */
  panning?: boolean;
}) {
  const b = biomeBackdrop(biomeId);
  const theme = BIOME_THEME[biomeId];
  const stars = theme.stars;
  // While panning, altitude offsets must apply INSTANTLY — the pan itself is
  // already the motion; easing on top of it is what desyncs the depths.
  const flow = panning ? 'none' : FLOW;
  const isSky = band === 'sky';
  const isHorizon = band === 'horizon';
  const isFront = band === 'front';
  const sun = Math.max(0, 1 - stars * 2.2); // daytime sun, gone by deep space
  // High-altitude cirrus wisps: build through the stratosphere/orbit, fade out
  // by the galaxy (where the aurora + dense stars carry the sky instead).
  const wisp = Math.max(0, Math.min(0.42, stars * 1.1)) * Math.max(0, 1 - Math.max(0, stars - 0.8) / 0.2);

  const climb = reducedMotion ? 0 : heightM * PX_PER_M;
  const starPos = (depth: number) => `0px ${climb * depth}px`; // seamless infinite scroll
  const slide = (depth: number, cap: number) => (reducedMotion ? 0 : Math.min(climb * depth, cap));

  // Altitude dolly: gently scale the whole backdrop UP about the ground line as
  // the player climbs, so the world recedes/fills the frame ("the ground falls
  // away") — vertigo with ZERO impact on the Pixi tower's camera/landing math.
  const dolly = reducedMotion ? 1 : dollyScaleFor(heightM);
  const groundBase = groundInsetPx ?? (typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.2) : 140);

  // Dynamic sun/moon disc: arcs from low/right toward high/left as you climb,
  // tinting the whole scene. Colour cools with altitude.
  const celestialLeft = reducedMotion ? '72%' : `${72 - stars * 50}%`;
  const celestialTop = reducedMotion ? '68%' : `${68 - stars * 55}%`;
  const celestialSize = 96 + stars * 40;

  // Signature sky layers for the zone we're in and the one we're climbing into,
  // weighted by progress through the band — the same continuous cross-fade the
  // base gradient already gets, so arriving in the nebula is a dissolve rather
  // than a cut. Usually 0 or 1 entries; 2 only inside a transition.
  const bandBlend = biomeBlendAt(heightM);
  const skyFeatures: Array<{ key: string; feat: NonNullable<BiomeTheme['skyFeature']>; weight: number }> = [];
  const addFeature = (key: string, id: WordTowerBiomeId, weight: number) => {
    const feat = BIOME_THEME[id].skyFeature;
    if (feat && weight > 0.001) skyFeatures.push({ key, feat, weight });
  };
  addFeature('from', bandBlend.fromId, 1 - bandBlend.t);
  // At the top biome `toId === fromId`, so there is nothing to fade toward.
  if (bandBlend.toId !== bandBlend.fromId) addFeature('to', bandBlend.toId, bandBlend.t);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      data-biome-backdrop={biomeId}
      style={{ transform: `scale(${dolly})`, transformOrigin: '50% 100%', transition: reducedMotion || panning ? 'none' : `transform 1000ms ${EASE}` }}
    >
      {/* ── Screen-locked band ───────────────────────────────────────────────
          Lens washes + the horizon. Never rides the user's pan. */}
      {isHorizon && (
        <>
          {/* Per-biome accent wash — graphic identity beyond a pure colour remap. */}
          <div className="absolute inset-0" style={{ background: theme.accentGlow, opacity: 0.9 }} />
          {/* Slow drifting aurora — gives the sky life + a sense of "changing"
              weather. Soft electric tints, stronger as you climb into the dark. */}
          <div className="wt-aurora absolute" style={{ opacity: 0.18 + stars * 0.42 }} />
          {/* Warm sun glow (low altitude only) */}
          <div
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: sun, background: 'radial-gradient(120% 70% at 82% 8%, rgba(255,247,214,0.85), rgba(255,236,180,0.25) 28%, transparent 55%)' }}
          />

          {/* Dynamic sun/moon disc + glow. Screen-locked: a body at effectively
              infinite distance must not shift with a local camera pan. */}
          <div
            className="absolute rounded-full will-change-transform"
            style={{
              left: celestialLeft,
              top: celestialTop,
              width: celestialSize,
              height: celestialSize,
              transform: 'translate(-50%, -50%)',
              transition: reducedMotion || panning ? 'none' : `left 900ms ${EASE}, top 900ms ${EASE}, width 900ms ${EASE}, height 900ms ${EASE}`,
              background: `radial-gradient(circle at 35% 30%, ${theme.celestial.core}, ${theme.celestial.glow} 55%, transparent 80%)`,
              boxShadow: `0 0 ${60 + stars * 30}px ${theme.celestial.glow}`,
              opacity: 0.6 + sun * 0.35,
            }}
          />
        </>
      )}

      {/* Three parallax star sheets (far→near). Widely separated depths so the
          near field streaks past while the far field barely creeps — the depth
          cue that sells real distance. Fade in with altitude. */}
      {isSky && (
        <>
          {/* Signature zone layers (nebula ion clouds / the galactic band). Drawn
              FIRST so the star sheets sit in front of them — the stars are nearer
              than the thing they're embedded in, and painting the cloud over them
              would read as fog on the lens instead of depth.
              Cross-faded across the biome band like the sky gradient itself:
              `backgroundImage` is not an animatable property, so a layer keyed to
              the hard biome switch would POP into existence at the threshold. */}
          {skyFeatures.map(({ key, feat, weight }) => (
            <div
              key={key}
              className="absolute -inset-x-[10%] -inset-y-[20%]"
              style={{
                transition: flow,
                opacity: feat.opacity * weight,
                backgroundImage: feat.image,
                mixBlendMode: feat.blend as CSSProperties['mixBlendMode'],
                transform: `translateY(${-slide(feat.depth, 900)}px)`,
              }}
            />
          ))}
          <div className="absolute inset-0" style={{ transition: flow, opacity: Math.min(1, stars + 0.04), backgroundPosition: starPos(0.2), ...starSheet(340, 1, 1) }} />
          <div className="absolute inset-0" style={{ transition: flow, opacity: stars * 0.85, backgroundPosition: starPos(0.55), ...starSheet(260, 1.5, 4) }} />
          <div className="absolute inset-0" style={{ transition: flow, opacity: stars * 0.72, backgroundPosition: starPos(1.05), ...starSheet(200, 2.4, 7) }} />

          {/* Distant celestial bodies — the "and beyond". Fade in deep, drift slow. */}
          <div className="absolute inset-0" style={{ transition: flow, opacity: stars }}>
            <div className="absolute h-28 w-28 rounded-full" style={{ left: '14%', top: '22%', transition: flow, transform: `translateY(${-slide(0.18, 700)}px)`, background: 'radial-gradient(circle at 35% 30%, #ffe7a8, #d98a3a 55%, #7a3f12 100%)', boxShadow: '0 0 48px rgba(255,200,120,0.35)' }} />
            <div className="absolute h-16 w-16 rounded-full" style={{ right: '16%', top: '40%', transition: flow, transform: `translateY(${-slide(0.1, 700)}px)`, background: 'radial-gradient(circle at 40% 35%, #cfe8ff, #6f8fc0 60%, #2a3a66 100%)', boxShadow: '0 0 30px rgba(150,190,255,0.3)' }} />
          </div>
        </>
      )}

      {isHorizon && (
        <>
          {/* Far city skyline — light, atmospheric (recedes into the haze). Slow
              parallax. Anchored to the control-deck top so it reads as the horizon. */}
          <svg
            className="absolute inset-x-0 bottom-0 w-full"
            style={{ height: groundBase + 120, opacity: b.skyline * 0.7, transition: flow, transform: `translateY(${slide(0.85, 1400)}px)` }}
            viewBox="0 0 100 26"
            preserveAspectRatio="none"
          >
            <path fill="#7fa8d6" d={SKYLINE_FAR} />
          </svg>

          {/* Distant mountain / landmark silhouettes — a second far depth layer. */}
          <svg
            className="absolute inset-x-0 bottom-0 w-full"
            style={{ height: groundBase + 96, opacity: b.skyline * 0.55, transition: flow, transform: `translateY(${slide(0.55, 900)}px)` }}
            viewBox="0 0 100 26"
            preserveAspectRatio="none"
          >
            <path fill={theme.landmarkColor} d={MOUNTAINS} />
          </svg>
        </>
      )}

      {/* High-altitude cirrus wisps — thin, biome-tinted streaks that keep the
          upper sky alive between the clouds (below) and deep space. They build
          through the stratosphere/orbit and fade out by the galaxy (the aurora
          takes over). Slower parallax than the low clouds → depth. */}
      {isSky && (
      <div
        className="absolute inset-0"
        style={{ opacity: wisp, transition: flow, transform: `translateY(${slide(0.5, 600)}px)` }}
      >
        <div className="wt-wisp" style={{ top: '16%', width: 280, height: 14, animationDuration: '150s' }} />
        <div className="wt-wisp" style={{ top: '34%', width: 220, height: 11, animationDuration: '190s', animationDelay: '-80s' }} />
        <div className="wt-wisp" style={{ top: '52%', width: 320, height: 16, animationDuration: '230s', animationDelay: '-140s' }} />
      </div>
      )}

      {/* Faint air-current streaks — horizontal speed lines in the upper bands. */}
      {isSky && stars > 0.15 && (
        <div
          className="absolute inset-0"
          style={{ opacity: Math.min(0.35, stars * 0.4), transition: flow }}
        >
          <div className="wt-streak" style={{ top: '28%', width: 180, animationDuration: '5s', animationDelay: '-1s' }} />
          <div className="wt-streak" style={{ top: '44%', width: 240, animationDuration: '7s', animationDelay: '-3s' }} />
          <div className="wt-streak" style={{ top: '62%', width: 160, animationDuration: '6s', animationDelay: '-5s' }} />
          <div className="wt-streak" style={{ top: '78%', width: 200, animationDuration: '8s', animationDelay: '-2s' }} />
        </div>
      )}

      {/* Nebula-specific ambient wisps — drifting gas clouds in the nebula band.
          Adds to the alien/organic feel of the nebula biome. */}
      {isHorizon && biomeId === 'nebula' && (
        <div className="absolute inset-0" style={{ opacity: stars * 0.6, transition: flow }}>
          <div className="wt-nebula-wisp" style={{ width: 320, height: 240, left: '10%', top: '20%', animationDuration: '32s' }} />
          <div className="wt-nebula-wisp" style={{ width: 280, height: 200, right: '15%', top: '45%', animationDuration: '40s', animationDelay: '-16s' }} />
          <div className="wt-nebula-wisp" style={{ width: 240, height: 180, left: '35%', bottom: '15%', animationDuration: '48s', animationDelay: '-24s' }} />
        </div>
      )}

      {/* Galaxy-specific ambient sparkles — distant twinkling objects far away.
          Sells the epic scale of the galaxy band. */}
      {isSky && biomeId === 'galaxy' && (
        <div className="absolute inset-0" style={{ opacity: stars * 0.8, transition: flow }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="wt-galaxy-sparkle"
              style={{
                left: `${(i * 19 + 7) % 100}%`,
                top: `${(i * 23 + 13) % 80}%`,
                animationDuration: `${1.2 + (i % 3) * 0.4}s`,
                animationDelay: `${(i * 0.15) % 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Drifting clouds — fuller, higher-contrast bank that lingers as you
          climb (a gentler slide than before, so they don't shoot off-screen the
          moment you leave the ground). */}
      {isSky && (
      <div
        className="absolute inset-0"
        style={{ opacity: Math.min(1, b.clouds + sun * 0.55), transition: flow, transform: `translateY(${slide(0.85, 700)}px)` }}
      >
        <div className="wt-cloud" style={{ top: '10%', width: 200, height: 56, animationDuration: '64s' }} />
        <div className="wt-cloud" style={{ top: '22%', width: 130, height: 38, animationDuration: '88s', animationDelay: '-20s' }} />
        <div className="wt-cloud" style={{ top: '36%', width: 230, height: 60, animationDuration: '120s', animationDelay: '-70s' }} />
        <div className="wt-cloud" style={{ top: '50%', width: 150, height: 44, animationDuration: '104s', animationDelay: '-50s' }} />
        <div className="wt-cloud" style={{ top: '64%', width: 190, height: 50, animationDuration: '112s', animationDelay: '-90s' }} />
        <div className="wt-cloud" style={{ top: '78%', width: 120, height: 34, animationDuration: '96s', animationDelay: '-40s' }} />
      </div>
      )}

      {isFront && (
        <>
          {/* Near city skyline — darker silhouette in front. Faster parallax. */}
          <svg
            className="absolute inset-x-0 bottom-0 w-full"
            style={{ height: groundBase + 72, opacity: b.skyline, transition: flow, transform: `translateY(${slide(1.35, 1700)}px)` }}
            viewBox="0 0 100 26"
            preserveAspectRatio="none"
          >
            <path fill="#1c2c4a" d={SKYLINE_NEAR} />
            {/* Lit windows — a flat silhouette at this scale is the other half of
                the "cheap" read. A few warm rectangles give the near block real
                occupancy without an extra layer or image. Fade out with the
                skyline itself, so nothing survives into space. */}
            <g fill="#ffd873" opacity={0.55}>
              {WINDOW_CELLS.map(([wx, wy], i) => (
                <rect key={i} x={wx} y={wy} width={1.2} height={0.9} />
              ))}
            </g>
          </svg>

          {/* Ground / horizon fog — city haze thins into space mist. */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: groundBase + 48,
              opacity: theme.groundFog,
              background: 'linear-gradient(180deg, transparent 0%, rgba(214,238,255,0.35) 45%, rgba(20,32,46,0.45) 100%)',
              transition: flow,
            }}
          />

          {/* Edge vignette — stronger in deep biomes for graphic immersion.
              MUST stay screen-locked: a vignette whose centre pans away from the
              screen centre stops being a lens effect and reads as a dark blob
              sliding across the sky. */}
          <div
            className="absolute inset-0"
            style={{
              opacity: theme.vignette,
              background: 'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.55) 100%)',
              transition: flow,
            }}
          />
        </>
      )}

      {isFront && <style>{`
        /* Puffy cloud: a flat-bottomed body with two lobes on top (pseudo-els),
           so it reads as a real cloud silhouette rather than a fuzzy blob. */
        .wt-cloud {
          position: absolute;
          left: 0;
          background: #fdfeff;
          border-radius: 100px 100px 38px 38px;
          opacity: 0.95;
          /* Cool underside shadow + soft contact gives the white cloud contrast
             against the pale daytime sky (otherwise white-on-near-white). */
          filter: drop-shadow(0 8px 0 rgba(96,130,178,0.28)) drop-shadow(0 2px 6px rgba(70,100,150,0.25));
          animation-name: wt-drift;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        /* Thin high cirrus streak — soft blurred edges, gentle drift. */
        .wt-wisp {
          position: absolute;
          left: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.85) 30%, rgba(255,255,255,0.85) 70%, transparent);
          border-radius: 50%;
          filter: blur(3px);
          animation-name: wt-drift;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        /* Horizontal air-current streaks — faint speed lines. */
        .wt-streak {
          position: absolute;
          left: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45) 40%, rgba(255,255,255,0.45) 60%, transparent);
          border-radius: 2px;
          filter: blur(1px);
          animation-name: wt-streak-drift;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .wt-cloud::before,
        .wt-cloud::after {
          content: '';
          position: absolute;
          background: #ffffff;
          border-radius: 50%;
        }
        .wt-cloud::before { width: 52%; height: 150%; left: 9%; top: -62%; }
        .wt-cloud::after  { width: 42%; height: 122%; right: 11%; top: -44%; }
        @keyframes wt-drift { from { transform: translateX(-30%); } to { transform: translateX(130vw); } }
        @keyframes wt-streak-drift { from { transform: translateX(-40vw); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } to { transform: translateX(130vw); opacity: 0; } }
        /* Soft electric aurora that slowly drifts + breathes (no blur — neo). */
        .wt-aurora {
          inset: -25% -15%;
          background:
            radial-gradient(45% 35% at 28% 30%, rgba(0,255,255,0.30), transparent 70%),
            radial-gradient(40% 32% at 72% 58%, rgba(139,92,246,0.30), transparent 70%),
            radial-gradient(38% 28% at 55% 80%, rgba(255,20,147,0.18), transparent 70%);
          animation: wt-aurora 26s ease-in-out infinite alternate;
        }
        @keyframes wt-aurora {
          from { transform: translate(-4%, -3%) scale(1); }
          to   { transform: translate(5%, 5%) scale(1.18); }
        }
        /* Biome-specific ambient elements — nebula wisps + galaxy sparkles */
        .wt-nebula-wisp {
          position: absolute;
          background: radial-gradient(ellipse at center, rgba(255,79,163,0.25), transparent 80%);
          border-radius: 50%;
          opacity: 0.4;
          animation-name: wt-nebula-drift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes wt-nebula-drift {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.2; }
          50%  { transform: translate(8%, 5%) scale(1.1); opacity: 0.5; }
          100% { transform: translate(-12%, 0) scale(0.95); opacity: 0.2; }
        }
        .wt-galaxy-sparkle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: rgba(255,221,63,0.8);
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(255,221,63,0.6);
          animation-name: wt-galaxy-twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes wt-galaxy-twinkle {
          0%   { opacity: 0.2; }
          50%  { opacity: 1; }
          100% { opacity: 0.2; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wt-cloud { animation: none !important; }
          .wt-wisp { animation: none !important; }
          .wt-streak { animation: none !important; }
          .wt-aurora { animation: none !important; }
          .wt-nebula-wisp { animation: none !important; }
          .wt-galaxy-sparkle { animation: none !important; }
        }
      `}</style>}
    </div>
  );
});
