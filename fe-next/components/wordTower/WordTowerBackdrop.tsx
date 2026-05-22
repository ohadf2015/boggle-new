'use client';

import type { CSSProperties } from 'react';
import { biomeBackdrop } from '@/lib/wordTower/towerLayout';
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

const PX_PER_M = 2.4; // screen px of parallax travel per metre climbed

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
  const stars = BIOME_THEME[biomeId].stars;
  const sun = Math.max(0, 1 - stars * 2.2); // daytime sun, gone by deep space

  const climb = reducedMotion ? 0 : heightM * PX_PER_M;
  const starPos = (depth: number) => `0px ${climb * depth}px`; // seamless infinite scroll
  const slide = (depth: number, cap: number) => (reducedMotion ? 0 : Math.min(climb * depth, cap));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Warm sun glow (low altitude only) */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: sun, background: 'radial-gradient(120% 70% at 82% 8%, rgba(255,247,214,0.85), rgba(255,236,180,0.25) 28%, transparent 55%)' }}
      />

      {/* Three parallax star sheets (far→near). Fade in with altitude. */}
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: Math.min(1, stars + 0.04), backgroundPosition: starPos(0.12), ...starSheet(340, 1, 1) }} />
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: stars * 0.85, backgroundPosition: starPos(0.32), ...starSheet(260, 1.5, 4) }} />
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: stars * 0.7, backgroundPosition: starPos(0.62), ...starSheet(200, 2, 7) }} />

      {/* Distant celestial bodies — the "and beyond". Fade in deep, drift slow. */}
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: stars }}>
        <div className="absolute h-28 w-28 rounded-full" style={{ left: '14%', top: '22%', transform: `translateY(${-slide(0.08, 600)}px)`, background: 'radial-gradient(circle at 35% 30%, #ffe7a8, #d98a3a 55%, #7a3f12 100%)', boxShadow: '0 0 48px rgba(255,200,120,0.35)' }} />
        <div className="absolute h-16 w-16 rounded-full" style={{ right: '16%', top: '40%', transform: `translateY(${-slide(0.05, 600)}px)`, background: 'radial-gradient(circle at 40% 35%, #cfe8ff, #6f8fc0 60%, #2a3a66 100%)', boxShadow: '0 0 30px rgba(150,190,255,0.3)' }} />
      </div>

      {/* Far city skyline — light, atmospheric (recedes into the haze). Slow parallax. */}
      <svg
        className="absolute inset-x-0 bottom-[8%] h-[22%] w-full transition-opacity duration-1000"
        style={{ opacity: b.skyline * 0.7, transform: `translateY(${slide(0.7, 1400)}px)` }}
        viewBox="0 0 100 26"
        preserveAspectRatio="none"
      >
        <path fill="#7fa8d6" d={SKYLINE} />
      </svg>

      {/* Drifting clouds — fall away as you climb. */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: Math.min(1, b.clouds + sun * 0.5), transform: `translateY(${slide(0.9, 1500)}px)` }}
      >
        <div className="wt-cloud" style={{ top: '12%', width: 180, height: 50, animationDuration: '64s' }} />
        <div className="wt-cloud" style={{ top: '30%', width: 120, height: 36, animationDuration: '92s', animationDelay: '-30s' }} />
        <div className="wt-cloud" style={{ top: '46%', width: 210, height: 56, animationDuration: '120s', animationDelay: '-70s' }} />
        <div className="wt-cloud" style={{ top: '62%', width: 150, height: 42, animationDuration: '104s', animationDelay: '-50s' }} />
      </div>

      {/* Near city skyline — darker silhouette in front. Faster parallax. */}
      <svg
        className="absolute inset-x-0 bottom-[6%] h-[30%] w-full transition-opacity duration-1000"
        style={{ opacity: b.skyline, transform: `translateY(${slide(1.15, 1700)}px)` }}
        viewBox="0 0 100 26"
        preserveAspectRatio="none"
      >
        <path fill="#1c2c4a" d={SKYLINE} />
      </svg>

      {/* Ground / street the tower rises from — slides off as you leave land. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[8%] border-t-2 border-black transition-opacity duration-1000"
        style={{ opacity: b.skyline, background: 'linear-gradient(180deg,#243a2a,#16241a)', transform: `translateY(${slide(1.3, 1800)}px)` }}
      />

      {/* Tower crane: mast, jib, counterweight, swaying hook over the build line */}
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: b.crane }}>
        <div className="absolute right-[11%] top-0 h-[30%] w-2.5 border-x-2 border-black" style={{ background: '#f4b740' }} />
        <div className="absolute right-[8%] top-[6%] left-[34%] h-2.5 border-y-2 border-black" style={{ background: '#f4b740' }} />
        <div className="absolute right-[6%] top-[3%] h-5 w-9 border-2 border-black bg-neo-yellow" />
        <div className="absolute right-[10%] top-[6%] h-4 w-4 border-2 border-black" style={{ background: '#c98a1f' }} />
        <div className="wt-hook absolute left-[46%] top-[6%]">
          <div className="mx-auto w-[3px] bg-black" style={{ height: '92px' }} />
          <div className="mx-auto h-3 w-4 rounded-b-full border-2 border-t-0 border-black bg-neo-yellow" />
        </div>
      </div>

      <style>{`
        .wt-cloud {
          position: absolute;
          left: 0;
          border-radius: 9999px;
          background: radial-gradient(closest-side, rgba(255,255,255,0.85), rgba(255,255,255,0.2));
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
