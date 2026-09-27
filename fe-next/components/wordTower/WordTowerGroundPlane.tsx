'use client';

import { memo } from 'react';
import { BIOME_THEME } from './biomeTheme';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

interface WordTowerGroundPlaneProps {
  /** Distance from viewport bottom to the top of the control deck (px). The
   *  ground plane rises this far plus a small visible overhang so the tower base
   *  reads as anchored on real ground, not levitating above it. */
  groundInsetPx: number;
  biomeId: WordTowerBiomeId;
}

/** Visible ground/cityscape plane — the lowest parallax layer. It sits just
 *  above the control deck and visually connects the tower base to the world. */
export const WordTowerGroundPlane = memo(function WordTowerGroundPlane({
  groundInsetPx,
  biomeId,
}: WordTowerGroundPlaneProps) {
  const theme = BIOME_THEME[biomeId];
  const overhang = 28;
  const totalH = groundInsetPx + overhang;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0"
      style={{
        height: totalH,
        background: `
          linear-gradient(180deg,
            transparent 0%,
            ${theme.landmarkColor}40 ${overhang}px,
            ${theme.landmarkColor}70 ${overhang + 12}px,
            ${theme.landmarkColor} 100%
          )
        `,
        boxShadow: `inset 0 3px 0 ${theme.celestial.glow}66`,
      }}
    >
      {/* Pixel-notched top edge — sells the "built on a solid ledge" read. */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `repeating-linear-gradient(90deg, ${theme.celestial.glow} 0 6px, transparent 6px 12px)`,
          opacity: 0.55,
        }}
      />
      {/* Subtle city silhouette at the horizon line. */}
      <svg
        className="absolute inset-x-0 top-0 w-full opacity-40"
        style={{ height: overhang + 8, color: '#05060a' }}
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0 12 L0 8 L5 8 L5 5 L10 5 L10 9 L15 9 L15 4 L20 4 L20 9 L25 9 L25 6 L30 6 L30 10 L35 10 L35 3 L40 3 L40 10 L45 10 L45 7 L50 7 L50 11 L55 11 L55 5 L60 5 L60 10 L65 10 L65 4 L70 4 L70 9 L75 9 L75 6 L80 6 L80 10 L85 10 L85 5 L90 5 L90 9 L95 9 L95 7 L100 7 L100 12 Z"
        />
      </svg>
    </div>
  );
});
