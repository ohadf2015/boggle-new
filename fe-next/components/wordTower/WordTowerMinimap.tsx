'use client';

import { miniTowerScaleMax, altToFraction, miniTowerZones } from '@/lib/wordTower/miniTower';
import { blockMaterial } from '@/lib/wordTower/blockGrade';
import type { RivalMarker } from '@/lib/wordTower/rivals';

interface WordTowerMinimapProps {
  /** Committed climber height (m). */
  heightM: number;
  /** Currently-viewed altitude (m) — differs from heightM only while panned. */
  viewM: number;
  personalBestM: number;
  /** Other players' record heights — drawn as ticks so the climber sees who is
   *  still above them on the same pocket scale they read their own height on. */
  rivals?: RivalMarker[];
  /** Tap → glide the camera back to the build line (back-to-top affordance). */
  onScrollTop: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/**
 * A pocket mini-tower pinned to the side: biome-coloured bands stacked
 * bottom→top across the climb's altitude scale, with a cube marker at the
 * climber's height, a yellow tick for the personal best, and a faint line for
 * where the user is currently looking (while panned). Tapping it glides back to
 * the top, so it doubles as a back-to-top control.
 */
export function WordTowerMinimap({ heightM, viewM, personalBestM, rivals, onScrollTop, t }: WordTowerMinimapProps) {
  const scaleMax = miniTowerScaleMax(heightM, personalBestM);
  const zones = miniTowerZones(scaleMax);
  const climberFrac = altToFraction(heightM, scaleMax);
  const viewFrac = altToFraction(viewM, scaleMax);
  const pbFrac = altToFraction(personalBestM, scaleMax);
  const showPb = personalBestM > heightM + 1;
  const panned = Math.abs(viewM - heightM) > 2;
  // Rival record ticks — coloured by the material of THEIR top zone, so the
  // pocket map shows "who is above me" at a glance, mirroring the side rail.
  const rivalTicks = (rivals ?? [])
    .filter((r) => r.heightM > 0 && r.heightM <= scaleMax)
    .map((r) => ({ id: r.id, frac: altToFraction(r.heightM, scaleMax), mat: hex(blockMaterial(r.highestBiome ?? 'city')) }));

  return (
    <button
      type="button"
      onClick={onScrollTop}
      aria-label={t('wordTower.minimap.label', { m: Math.round(heightM) })}
      className="pointer-events-auto absolute end-2 top-[20%] z-[8] flex h-[48%] w-9 flex-col items-center justify-end"
    >
      <div className="relative w-5 flex-1 overflow-hidden rounded-neo border-neo border-black bg-neo-navy/70 shadow-hard-sm">
        {zones.map((z) => (
          <div
            key={z.id}
            data-zone={z.id}
            className="absolute inset-x-0"
            style={{
              bottom: `${z.fromFrac * 100}%`,
              height: `${(z.toFrac - z.fromFrac) * 100}%`,
              backgroundColor: hex(blockMaterial(z.id)),
              opacity: 0.9,
            }}
          />
        ))}
        {/* Rival record ticks — a short coloured dash + dot on the right edge at
            each rival's height. Drawn under the PB/climber marks so your own
            progress still reads first. */}
        {rivalTicks.map((r) => (
          <div
            key={r.id}
            className="absolute end-0 h-0.5 w-2.5 rounded-full border-r-2 border-black/70"
            style={{ bottom: `${r.frac * 100}%`, backgroundColor: r.mat }}
            aria-hidden
          />
        ))}
        {showPb && (
          <div className="absolute inset-x-0 h-0.5 bg-neo-yellow" style={{ bottom: `${pbFrac * 100}%` }} aria-hidden />
        )}
        {panned && (
          <div className="absolute inset-x-[-2px] h-0.5 bg-white/70" style={{ bottom: `${viewFrac * 100}%` }} aria-hidden />
        )}
        <div
          className="absolute inset-x-[-3px] flex justify-center"
          style={{ bottom: `calc(${climberFrac * 100}% - 5px)` }}
          aria-hidden
        >
          <span className="h-2.5 w-2.5 rounded-[3px] border-neo border-black bg-neo-lime shadow-hard-sm" />
        </div>
      </div>
      <span className="mt-0.5 font-neo-display text-[9px] font-bold leading-none text-neo-white tabular-nums">
        {Math.round(heightM)}m
      </span>
    </button>
  );
}
