'use client';

import { memo } from 'react';
import { WordTowerBackdrop } from '@/components/wordTower/WordTowerBackdrop';
import { WordTowerParallaxProps } from '@/components/wordTower/WordTowerParallaxProps';
import { WordTowerSighting } from '@/components/wordTower/WordTowerSighting';
import { BIOME_THEME } from '@/components/wordTower/biomeTheme';
import { biomeBlendAt } from '@/lib/wordTower/biomeBlend';
import { visualAltitudeM } from '@/lib/wordTowerV2/altitude';
import { GROUND_STRIP_PX } from '@/lib/wordTowerV2/camera';
import { V2Scenery } from './V2Scenery';

/**
 * v1's sky — gradient, clouds, one altitude prop, rare sightings — reused as DOM layers BEHIND a transparent Pixi canvas. The city and
 * ground are NOT here: Pixi draws them on the tower's own camera.
 *
 * Every layer reads a *visual* altitude (see altitude.ts), not the physical
 * height, so the 6-biome journey fits inside a real physics run. `heightM` must
 * arrive quantized (publishHeightM): these layers ease over ~1s, and a value
 * that moves every poll restarts every ease forever.
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
  const common = { biomeId: fromId, heightM: alt, reducedMotion, groundInsetPx: groundInsetPx + GROUND_STRIP_PX, city: false, calm: true };

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
      <V2Scenery bottomPx={groundInsetPx + GROUND_STRIP_PX} accentHex={accentHex} reducedMotion={reducedMotion} />
      {/* One prop at a time: four stickers used to crowd the tower top. Ambient
          drifters (leaves, streaks) are gone for the same reason. */}
      <WordTowerParallaxProps heightM={alt} reducedMotion={reducedMotion} themed={false} maxProps={1} />
      <WordTowerSighting heightM={alt} reducedMotion={reducedMotion} />
      <WordTowerBackdrop band="front" {...common} />
    </div>
  );
});
