'use client';

import type { CSSProperties } from 'react';
import { biomeBackdrop } from '@/lib/wordTower/towerLayout';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/**
 * Construction-site backdrop for the Word Tower scene — pure decoration behind
 * the Pixi tower. Sells the "I'm building this" fantasy: a tower crane whose
 * hook hovers over the build line, scaffold rails framing the stack, a distant
 * skyline, and drifting clouds. Every layer fades by altitude (full rig on the
 * ground, gone in deep space) via {@link biomeBackdrop}.
 *
 * All layers are inert (`aria-hidden`, `pointer-events-none`) and animation is
 * disabled under `prefers-reduced-motion`.
 */
export function WordTowerBackdrop({ biomeId }: { biomeId: WordTowerBiomeId }) {
  const b = biomeBackdrop(biomeId);
  const steel = '#54546a';
  const steelDark = '#3a3a4e';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Drifting clouds (atmospheric, low altitude) */}
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: b.clouds }}>
        <div className="wt-cloud" style={{ top: '16%', width: 160, height: 44, animationDuration: '64s' }} />
        <div className="wt-cloud" style={{ top: '34%', width: 110, height: 32, animationDuration: '92s', animationDelay: '-30s' }} />
        <div className="wt-cloud" style={{ top: '52%', width: 200, height: 52, animationDuration: '120s', animationDelay: '-70s' }} />
      </div>

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
        {/* horizontal cross-braces between the rails */}
        <div
          className="absolute inset-y-0 left-3 right-3"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, ${steel} 0 3px, transparent 3px 72px)`,
          }}
        />
        {/* two vertical rails */}
        {(['left', 'right'] as const).map((side) => (
          <div
            key={side}
            className="absolute inset-y-0 w-2.5 border-x-2 border-black"
            style={{ [side]: 0, background: `linear-gradient(90deg, ${steel}, ${steelDark})` } as CSSProperties}
          >
            {/* safety clamps */}
            {[12, 32, 52, 72, 92].map((top) => (
              <div key={top} className="absolute -inset-x-1 h-1.5 bg-neo-yellow" style={{ top: `${top}%` }} />
            ))}
          </div>
        ))}
      </div>

      {/* Tower crane: mast, jib, counterweight, swaying hook over the build line */}
      <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: b.crane }}>
        {/* vertical mast */}
        <div className="absolute right-[11%] top-0 h-[34%] w-2.5 border-x-2 border-black" style={{ background: steel }} />
        {/* horizontal jib reaching over the tower */}
        <div className="absolute right-[8%] top-[7%] left-[34%] h-2.5 border-y-2 border-black" style={{ background: steel }} />
        {/* counterweight */}
        <div className="absolute right-[6%] top-[4%] h-5 w-9 border-2 border-black bg-neo-yellow" />
        {/* operator cab */}
        <div className="absolute right-[10%] top-[7%] h-4 w-4 border-2 border-black" style={{ background: steelDark }} />
        {/* hook + cable group, anchored over the build line (~22%) */}
        <div className="wt-hook absolute left-[46%] top-[7%]">
          <div className="mx-auto w-[3px] bg-black" style={{ height: '88px' }} />
          <div className="mx-auto h-3 w-4 rounded-b-full border-2 border-t-0 border-black bg-neo-yellow" />
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
