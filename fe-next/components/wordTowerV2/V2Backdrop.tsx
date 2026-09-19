'use client';

import { memo } from 'react';
import { WordTowerBackdrop } from '@/components/wordTower/WordTowerBackdrop';
import { WordTowerParallaxProps } from '@/components/wordTower/WordTowerParallaxProps';
import { WordTowerSighting } from '@/components/wordTower/WordTowerSighting';
import { WordTowerAmbient } from '@/components/wordTower/WordTowerAmbient';
import { BIOME_THEME } from '@/components/wordTower/biomeTheme';
import { biomeBlendAt } from '@/lib/wordTower/biomeBlend';
import { visualAltitudeM } from '@/lib/wordTowerV2/altitude';
import { V2Scenery } from './V2Scenery';

/**
 * v1's whole sky — gradient, skylines, clouds, altitude props, rare sightings,
 * ambient birds — reused as DOM layers BEHIND a transparent Pixi canvas.
 *
 * Every layer reads a *visual* altitude (see altitude.ts), not the physical
 * height, so the 6-biome journey fits inside a real physics run.
 */
export const V2Backdrop = memo(function V2Backdrop({
  heightM,
  groundInsetPx,
  accentHex,
  reducedMotion,
}: {
  heightM: number;
  groundInsetPx: number;
  accentHex: string;
  reducedMotion: boolean;
}) {
  const alt = visualAltitudeM(heightM);
  const { fromId, toId, t } = biomeBlendAt(alt);
  const common = { biomeId: fromId, heightM: alt, reducedMotion, groundInsetPx };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Two stacked gradients cross-faded by progress through the band, so the
          sky shifts continuously instead of snapping at each threshold. */}
      <div className="absolute inset-0" style={{ background: BIOME_THEME[fromId].bg }} />
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ background: BIOME_THEME[toId].bg, opacity: t }}
      />
      <WordTowerBackdrop band="horizon" {...common} />
      <WordTowerBackdrop band="sky" {...common} />
      <WordTowerParallaxProps heightM={alt} reducedMotion={reducedMotion} />
      <WordTowerSighting heightM={alt} reducedMotion={reducedMotion} />
      <WordTowerAmbient biomeId={fromId} heightM={alt} reducedMotion={reducedMotion} enableComplexAnimations={!reducedMotion} />
      <V2Scenery heightM={heightM} groundInsetPx={groundInsetPx} accentHex={accentHex} reducedMotion={reducedMotion} />
      <WordTowerBackdrop band="front" {...common} />
    </div>
  );
});
