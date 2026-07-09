'use client';

import type { CSSProperties } from 'react';
import { biomeBackdrop } from '@/lib/wordTower/towerLayout';
import { dollyScaleFor } from '@/lib/wordTower/dollyZoom';
import { BIOME_THEME } from './biomeTheme';
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

const SKYLINE = 'M0 26 L0 14 L6 14 L6 8 L12 8 L12 16 L18 16 L18 5 L23 5 L23 16 L30 16 L30 11 L36 11 L36 18 L44 18 L44 7 L49 7 L49 18 L56 18 L56 13 L63 13 L63 4 L68 4 L68 15 L75 15 L75 9 L81 9 L81 17 L88 17 L88 6 L93 6 L93 16 L100 16 L100 26 Z';

/** Repeating star-field gradient — `seed` shifts the pattern so layers differ. */
function starSheet(size: number, dot: number, seed: number): CSSProperties {
  const p = (n: number) => `${(n * 37 + seed * 13) % 100}% ${(n * 53 + seed * 29) % 100}%`;
  const g = (i: number) => `radial-gradient(${dot}px ${dot}px at ${p(i)}, #fff, transparent)`;
  return {
    backgroundImage: [g(1), g(2), g(3), g(4), g(5), g(6)].join(', '),
    backgroundSize: `${size}px ${size}px`,
  };
}

export function WordTowerBackdrop({
  biomeId,
  heightM = 0,
  reducedMotion = false,
}: {
  biomeId: WordTowerBiomeId;
  heightM?: number;
  reducedMotion?: boolean;
}) {
  const b = biomeBackdrop(biomeId);
  const theme = BIOME_THEME[biomeId];
  const stars = theme.stars;
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

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      data-biome-backdrop={biomeId}
      style={{ transform: `scale(${dolly})`, transformOrigin: '50% 100%', transition: reducedMotion ? 'none' : `transform 1000ms ${EASE}` }}
    >
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

      {/* Three parallax star sheets (far→near). Widely separated depths so the
          near field streaks past while the far field barely creeps — the depth
          cue that sells real distance. Fade in with altitude. */}
      <div className="absolute inset-0" style={{ transition: FLOW, opacity: Math.min(1, stars + 0.04), backgroundPosition: starPos(0.2), ...starSheet(340, 1, 1) }} />
      <div className="absolute inset-0" style={{ transition: FLOW, opacity: stars * 0.85, backgroundPosition: starPos(0.55), ...starSheet(260, 1.5, 4) }} />
      <div className="absolute inset-0" style={{ transition: FLOW, opacity: stars * 0.72, backgroundPosition: starPos(1.05), ...starSheet(200, 2.4, 7) }} />

      {/* Distant celestial bodies — the "and beyond". Fade in deep, drift slow. */}
      <div className="absolute inset-0" style={{ transition: FLOW, opacity: stars }}>
        <div className="absolute h-28 w-28 rounded-full" style={{ left: '14%', top: '22%', transition: FLOW, transform: `translateY(${-slide(0.18, 700)}px)`, background: 'radial-gradient(circle at 35% 30%, #ffe7a8, #d98a3a 55%, #7a3f12 100%)', boxShadow: '0 0 48px rgba(255,200,120,0.35)' }} />
        <div className="absolute h-16 w-16 rounded-full" style={{ right: '16%', top: '40%', transition: FLOW, transform: `translateY(${-slide(0.1, 700)}px)`, background: 'radial-gradient(circle at 40% 35%, #cfe8ff, #6f8fc0 60%, #2a3a66 100%)', boxShadow: '0 0 30px rgba(150,190,255,0.3)' }} />
      </div>

      {/* Far city skyline — light, atmospheric (recedes into the haze). Slow
          parallax. Raised to peek above the control deck at low altitude. */}
      <svg
        className="absolute inset-x-0 bottom-[20%] h-[20%] w-full"
        style={{ opacity: b.skyline * 0.7, transition: FLOW, transform: `translateY(${slide(0.85, 1400)}px)` }}
        viewBox="0 0 100 26"
        preserveAspectRatio="none"
      >
        <path fill="#7fa8d6" d={SKYLINE} />
      </svg>

      {/* High-altitude cirrus wisps — thin, biome-tinted streaks that keep the
          upper sky alive between the clouds (below) and deep space. They build
          through the stratosphere/orbit and fade out by the galaxy (the aurora
          takes over). Slower parallax than the low clouds → depth. */}
      <div
        className="absolute inset-0"
        style={{ opacity: wisp, transition: FLOW, transform: `translateY(${slide(0.5, 600)}px)` }}
      >
        <div className="wt-wisp" style={{ top: '16%', width: 280, height: 14, animationDuration: '150s' }} />
        <div className="wt-wisp" style={{ top: '34%', width: 220, height: 11, animationDuration: '190s', animationDelay: '-80s' }} />
        <div className="wt-wisp" style={{ top: '52%', width: 320, height: 16, animationDuration: '230s', animationDelay: '-140s' }} />
      </div>

      {/* Nebula-specific ambient wisps — drifting gas clouds in the nebula band.
          Adds to the alien/organic feel of the nebula biome. */}
      {biomeId === 'nebula' && (
        <div className="absolute inset-0" style={{ opacity: stars * 0.6, transition: FLOW }}>
          <div className="wt-nebula-wisp" style={{ width: 320, height: 240, left: '10%', top: '20%', animationDuration: '32s' }} />
          <div className="wt-nebula-wisp" style={{ width: 280, height: 200, right: '15%', top: '45%', animationDuration: '40s', animationDelay: '-16s' }} />
          <div className="wt-nebula-wisp" style={{ width: 240, height: 180, left: '35%', bottom: '15%', animationDuration: '48s', animationDelay: '-24s' }} />
        </div>
      )}

      {/* Galaxy-specific ambient sparkles — distant twinkling objects far away.
          Sells the epic scale of the galaxy band. */}
      {biomeId === 'galaxy' && (
        <div className="absolute inset-0" style={{ opacity: stars * 0.8, transition: FLOW }}>
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
      <div
        className="absolute inset-0"
        style={{ opacity: Math.min(1, b.clouds + sun * 0.55), transition: FLOW, transform: `translateY(${slide(0.85, 700)}px)` }}
      >
        <div className="wt-cloud" style={{ top: '10%', width: 200, height: 56, animationDuration: '64s' }} />
        <div className="wt-cloud" style={{ top: '22%', width: 130, height: 38, animationDuration: '88s', animationDelay: '-20s' }} />
        <div className="wt-cloud" style={{ top: '36%', width: 230, height: 60, animationDuration: '120s', animationDelay: '-70s' }} />
        <div className="wt-cloud" style={{ top: '50%', width: 150, height: 44, animationDuration: '104s', animationDelay: '-50s' }} />
        <div className="wt-cloud" style={{ top: '64%', width: 190, height: 50, animationDuration: '112s', animationDelay: '-90s' }} />
        <div className="wt-cloud" style={{ top: '78%', width: 120, height: 34, animationDuration: '96s', animationDelay: '-40s' }} />
      </div>

      {/* Near city skyline — darker silhouette in front. Faster parallax. */}
      <svg
        className="absolute inset-x-0 bottom-[17%] h-[26%] w-full"
        style={{ opacity: b.skyline, transition: FLOW, transform: `translateY(${slide(1.35, 1700)}px)` }}
        viewBox="0 0 100 26"
        preserveAspectRatio="none"
      >
        <path fill="#1c2c4a" d={SKYLINE} />
      </svg>

      {/* Ground / horizon fog — city haze thins into space mist. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          opacity: theme.groundFog,
          background: 'linear-gradient(180deg, transparent 0%, rgba(214,238,255,0.35) 45%, rgba(20,32,46,0.45) 100%)',
          transition: FLOW,
        }}
      />

      {/* Edge vignette — stronger in deep biomes for graphic immersion. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: theme.vignette,
          background: 'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.55) 100%)',
          transition: FLOW,
        }}
      />

      <style>{`
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
          .wt-aurora { animation: none !important; }
          .wt-nebula-wisp { animation: none !important; }
          .wt-galaxy-sparkle { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
