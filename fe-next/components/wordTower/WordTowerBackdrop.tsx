'use client';

import type { CSSProperties } from 'react';
import { biomeBackdrop } from '@/lib/wordTower/towerLayout';
import { BIOME_THEME } from './biomeTheme';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/**
 * Parallax ascent backdrop for the Word Tower scene — pure decoration behind
 * the Pixi tower that sells one continuous climb from the ground into deep
 * space. Every layer is driven by altitude (`heightM`): the construction rig
 * (crane, scaffold, skyline) slides off the bottom as you leave land, three
 * star sheets scroll at parallax depths (far = slow), clouds fall away, and
 * distant planets fade in for the "and beyond". The biome sky gradient
 * (rendered by the parent) cross-fades the colour underneath.
 *
 * All layers are inert (`aria-hidden`, `pointer-events-none`); under
 * `reducedMotion` every parallax offset collapses to zero (opacities only).
 */

const PX_PER_M = 2.4; // screen px of parallax travel per metre climbed

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
  const stars = BIOME_THEME[biomeId].stars;
  const steel = '#54546a';
  const steelDark = '#3a3a4e';

  const climb = reducedMotion ? 0 : heightM * PX_PER_M;
  // Seamless infinite scroll for repeating star sheets.
  const starPos = (depth: number) => `0px ${climb * depth}px`;
  // One-shot layers slide down out of view (capped — they've faded by then).
  const slide = (depth: number, cap: number) => (reducedMotion ? 0 : Math.min(climb * depth, cap));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Three parallax star sheets (far→near). Fade in with altitude. */}
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: Math.min(1, stars + 0.05), backgroundPosition: starPos(0.12), ...starSheet(340, 1, 1) }} />
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: stars * 0.85, backgroundPosition: starPos(0.32), ...starSheet(260, 1.5, 4) }} />
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: stars * 0.7, backgroundPosition: starPos(0.62), ...starSheet(200, 2, 7) }} />

      {/* Distant celestial bodies — the "and beyond". Fade in deep, drift slow. */}
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: stars }}>
        <div
          className="absolute h-28 w-28 rounded-full"
          style={{
            left: '14%',
            top: '22%',
            transform: `translateY(${-slide(0.08, 600)}px)`,
            background: 'radial-gradient(circle at 35% 30%, #ffe7a8, #d98a3a 55%, #7a3f12 100%)',
            boxShadow: '0 0 48px rgba(255,200,120,0.35)',
          }}
        />
        <div
          className="absolute h-16 w-16 rounded-full"
          style={{
            right: '16%',
            top: '40%',
            transform: `translateY(${-slide(0.05, 600)}px)`,
            background: 'radial-gradient(circle at 40% 35%, #cfe8ff, #6f8fc0 60%, #2a3a66 100%)',
            boxShadow: '0 0 30px rgba(150,190,255,0.3)',
          }}
        />
      </div>

      {/* Drifting clouds (low altitude) — fall away as you climb. */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: b.clouds, transform: `translateY(${slide(0.8, 1400)}px)` }}
      >
        <div className="wt-cloud" style={{ top: '16%', width: 160, height: 44, animationDuration: '64s' }} />
        <div className="wt-cloud" style={{ top: '34%', width: 110, height: 32, animationDuration: '92s', animationDelay: '-30s' }} />
        <div className="wt-cloud" style={{ top: '52%', width: 200, height: 52, animationDuration: '120s', animationDelay: '-70s' }} />
      </div>

      {/* Construction rig (ground): skyline + scaffold + crane slide off the bottom. */}
      <div
        className="absolute inset-0"
        style={{ transform: `translateY(${slide(1.2, 1800)}px)` }}
      >
        {/* Distant city skyline at the horizon */}
        <svg
          className="absolute inset-x-0 bottom-0 h-[26%] w-full transition-opacity duration-1000"
          style={{ opacity: b.skyline }}
          viewBox="0 0 100 26"
          preserveAspectRatio="none"
        >
          <path
            fill="#10101e"
            d="M0 26 L0 14 L6 14 L6 8 L12 8 L12 16 L18 16 L18 5 L23 5 L23 16 L30 16 L30 11 L36 11 L36 18 L44 18 L44 7 L49 7 L49 18 L56 18 L56 13 L63 13 L63 4 L68 4 L68 15 L75 15 L75 9 L81 9 L81 17 L88 17 L88 6 L93 6 L93 16 L100 16 L100 26 Z"
          />
        </svg>

        {/* Scaffold rails framing the tower column */}
        <div
          className="absolute inset-y-0 left-1/2 h-full w-full max-w-[480px] -translate-x-1/2 transition-opacity duration-1000"
          style={{ opacity: b.scaffold }}
        >
          <div
            className="absolute inset-y-0 left-3 right-3"
            style={{ backgroundImage: `repeating-linear-gradient(0deg, ${steel} 0 3px, transparent 3px 72px)` }}
          />
          {(['left', 'right'] as const).map((side) => (
            <div
              key={side}
              className="absolute inset-y-0 w-2.5 border-x-2 border-black"
              style={{ [side]: 0, background: `linear-gradient(90deg, ${steel}, ${steelDark})` } as CSSProperties}
            >
              {[12, 32, 52, 72, 92].map((top) => (
                <div key={top} className="absolute -inset-x-1 h-1.5 bg-neo-yellow" style={{ top: `${top}%` }} />
              ))}
            </div>
          ))}
        </div>

        {/* Tower crane: mast, jib, counterweight, swaying hook over the build line */}
        <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: b.crane }}>
          <div className="absolute right-[11%] top-0 h-[34%] w-2.5 border-x-2 border-black" style={{ background: steel }} />
          <div className="absolute right-[8%] top-[7%] left-[34%] h-2.5 border-y-2 border-black" style={{ background: steel }} />
          <div className="absolute right-[6%] top-[4%] h-5 w-9 border-2 border-black bg-neo-yellow" />
          <div className="absolute right-[10%] top-[7%] h-4 w-4 border-2 border-black" style={{ background: steelDark }} />
          <div className="wt-hook absolute left-[46%] top-[7%]">
            <div className="mx-auto w-[3px] bg-black" style={{ height: '88px' }} />
            <div className="mx-auto h-3 w-4 rounded-b-full border-2 border-t-0 border-black bg-neo-yellow" />
          </div>
        </div>
      </div>

      <style>{`
        .wt-cloud {
          position: absolute;
          left: 0;
          border-radius: 9999px;
          background: radial-gradient(closest-side, rgba(255,255,255,0.55), rgba(255,255,255,0.12));
          filter: blur(1px);
          animation-name: wt-drift;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes wt-drift { from { transform: translateX(-30%); } to { transform: translateX(130vw); } }
        @keyframes wt-sway { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(5px) rotate(1deg); } }
        .wt-hook { transform-origin: top center; animation: wt-sway 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .wt-cloud, .wt-hook { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
