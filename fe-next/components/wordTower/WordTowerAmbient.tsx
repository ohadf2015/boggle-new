'use client';

import { memo } from 'react';
import { BIOME_THEME } from './biomeTheme';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/**
 * Light ambient sprites that give the sky life without stealing focus from the
 * tower: drifting leaves near the ground, distant birds in the city/sky band,
 * and faint ice crystals in the upper atmosphere. Pure CSS animation, disabled
 * under reduced motion or on low-end devices.
 */

interface WordTowerAmbientProps {
  biomeId: WordTowerBiomeId;
  heightM?: number;
  reducedMotion?: boolean;
  enableComplexAnimations?: boolean;
}

function seeded(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function Leaf({ i, tint }: { i: number; tint: string }) {
  const left = (seeded(i * 7.3) * 100).toFixed(1);
  const delay = (-seeded(i * 5.1) * 18).toFixed(1);
  const duration = (14 + seeded(i * 3.2) * 14).toFixed(1);
  const size = (10 + seeded(i * 11.4) * 8).toFixed(0);
  const hue = 60 + seeded(i * 2.7) * 80; // warm autumn greens/oranges
  return (
    <div
      className="pointer-events-none absolute wt-leaf"
      style={{
        left: `${left}%`,
        top: '-8%',
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: `hsl(${hue} 70% 55%)`,
        borderRadius: '2px 12px 2px 12px',
        opacity: 0.7,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        boxShadow: `0 0 4px ${tint}`,
      }}
    />
  );
}

function Bird({ i }: { i: number }) {
  const top = (8 + seeded(i * 4.5) * 55).toFixed(1);
  const delay = (-seeded(i * 6.7) * 24).toFixed(1);
  const duration = (22 + seeded(i * 2.1) * 18).toFixed(1);
  const scale = (0.5 + seeded(i * 9.3) * 0.6).toFixed(2);
  return (
    <div
      className="pointer-events-none absolute wt-bird"
      style={{
        top: `${top}%`,
        left: '-6%',
        transform: `scale(${scale})`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      }}
    >
      <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
        <path d="M2 8 Q6 2 10 6 Q14 2 18 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function IceCrystal({ i, tint }: { i: number; tint: string }) {
  const left = (seeded(i * 8.4) * 100).toFixed(1);
  const delay = (-seeded(i * 4.2) * 12).toFixed(1);
  const duration = (7 + seeded(i * 3.9) * 8).toFixed(1);
  const size = (4 + seeded(i * 10.1) * 5).toFixed(0);
  return (
    <div
      className="pointer-events-none absolute wt-ice"
      style={{
        left: `${left}%`,
        top: '-4%',
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: tint,
        opacity: 0.55,
        transform: 'rotate(45deg)',
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        boxShadow: `0 0 6px ${tint}`,
      }}
    />
  );
}

export const WordTowerAmbient = memo(function WordTowerAmbient({
  biomeId,
  reducedMotion = false,
  enableComplexAnimations = true,
}: WordTowerAmbientProps) {
  if (reducedMotion || !enableComplexAnimations) return null;

  const stars = BIOME_THEME[biomeId].stars;
  const airTint = BIOME_THEME[biomeId].airTint;

  const showLeaves = biomeId === 'city' || biomeId === 'sky';
  const showBirds = biomeId === 'city' || biomeId === 'sky' || biomeId === 'stratosphere';
  const showIce = stars > 0.4;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {showLeaves && Array.from({ length: 8 }).map((_, i) => <Leaf key={`leaf-${i}`} i={i} tint={airTint} />)}
      {showBirds && Array.from({ length: 5 }).map((_, i) => <Bird key={`bird-${i}`} i={i} />)}
      {showIce && Array.from({ length: 10 }).map((_, i) => <IceCrystal key={`ice-${i}`} i={i} tint={airTint} />)}

      <style>{`
        .wt-leaf {
          animation-name: wt-leaf-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .wt-bird {
          color: rgba(30,40,60,0.55);
          animation-name: wt-bird-fly;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .wt-ice {
          animation-name: wt-ice-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes wt-leaf-fall {
          0%   { transform: translateY(-10vh) translateX(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.8; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(110vh) translateX(6vw) rotate(360deg); opacity: 0; }
        }
        @keyframes wt-bird-fly {
          0%   { transform: translateX(-10vw) scale(var(--tw-scale-x, 1)); opacity: 0; }
          8%   { opacity: 0.6; }
          92%  { opacity: 0.5; }
          100% { transform: translateX(110vw) scale(var(--tw-scale-x, 1)); opacity: 0; }
        }
        @keyframes wt-ice-fall {
          0%   { transform: translateY(-10vh) translateX(0) rotate(45deg); opacity: 0; }
          12%  { opacity: 0.7; }
          88%  { opacity: 0.5; }
          100% { transform: translateY(110vh) translateX(-4vw) rotate(135deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wt-leaf, .wt-bird, .wt-ice { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </div>
  );
});
