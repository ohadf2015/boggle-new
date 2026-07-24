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
 * Pocket mini-tower on the side: richer zone bands, self / PB / rival / view
 * markers that read at a glance, and a back-to-top affordance.
 */
export function WordTowerMinimap({ heightM, viewM, personalBestM, rivals, onScrollTop, t }: WordTowerMinimapProps) {
  const scaleMax = miniTowerScaleMax(heightM, personalBestM);
  const zones = miniTowerZones(scaleMax);
  const climberFrac = altToFraction(heightM, scaleMax);
  const viewFrac = altToFraction(viewM, scaleMax);
  const pbFrac = altToFraction(personalBestM, scaleMax);
  const showPb = personalBestM > heightM + 1;
  const panned = Math.abs(viewM - heightM) > 2;
  const rivalTicks = (rivals ?? [])
    .filter((r) => r.heightM > 0 && r.heightM <= scaleMax)
    .map((r) => ({
      id: r.id,
      frac: altToFraction(r.heightM, scaleMax),
      mat: hex(blockMaterial(r.highestBiome ?? 'city')),
    }));

  return (
    <button
      type="button"
      onClick={onScrollTop}
      aria-label={t('wordTower.minimap.label', { m: Math.round(heightM) })}
      className="pointer-events-auto absolute end-2 top-[18%] z-[8] flex h-[52%] w-11 flex-col items-center justify-end"
    >
      {/* Enriched rail: wider bands, zone separators, stronger self/PB/rival hierarchy. */}
      <div
        data-minimap-rail
        data-enriched="true"
        className="relative w-7 flex-1 overflow-hidden rounded-neo border-neo-thick border-black bg-neo-navy/80 shadow-hard"
      >
        {zones.map((z, i) => (
          <div
            key={z.id}
            data-zone={z.id}
            className="absolute inset-x-0"
            style={{
              bottom: `${z.fromFrac * 100}%`,
              height: `${(z.toFrac - z.fromFrac) * 100}%`,
              background: `linear-gradient(90deg, ${hex(blockMaterial(z.id))}cc 0%, ${hex(blockMaterial(z.id))} 55%, ${hex(blockMaterial(z.id))}ee 100%)`,
              boxShadow: i > 0 ? 'inset 0 1px 0 rgba(0,0,0,0.35)' : undefined,
            }}
          >
            {/* Thin zone hairline so bands read as distinct biomes, not one smear. */}
            <div className="absolute inset-x-0 top-0 h-px bg-black/40" aria-hidden />
          </div>
        ))}

        {rivalTicks.map((r) => (
          <div
            key={r.id}
            data-marker="rival"
            className="absolute end-0 flex items-center"
            style={{ bottom: `calc(${r.frac * 100}% - 3px)` }}
            aria-hidden
          >
            <span
              className="h-1.5 w-3 rounded-sm border border-black/80"
              style={{ backgroundColor: r.mat }}
            />
            <span
              className="h-2 w-2 rounded-full border border-black shadow-hard-sm"
              style={{ backgroundColor: r.mat, marginInlineStart: -2 }}
            />
          </div>
        ))}

        {showPb && (
          <div
            data-marker="pb"
            className="absolute inset-x-0 h-0.5 bg-neo-yellow shadow-[0_0_6px_rgba(255,225,53,0.8)]"
            style={{ bottom: `${pbFrac * 100}%` }}
            aria-hidden
          />
        )}

        {panned && (
          <div
            data-marker="view"
            className="absolute inset-x-[-3px] h-0.5 bg-white/80"
            style={{ bottom: `${viewFrac * 100}%`, transition: 'bottom 80ms linear' }}
            aria-hidden
          />
        )}

        <div
          data-marker="self"
          className="absolute inset-x-[-4px] flex justify-center"
          style={{ bottom: `calc(${climberFrac * 100}% - 6px)` }}
          aria-hidden
        >
          <span className="h-3 w-3 rounded-[3px] border-neo border-black bg-neo-lime shadow-hard-sm ring-2 ring-neo-lime/40" />
        </div>
      </div>
      <span className="mt-0.5 rounded-sm bg-neo-navy/70 px-0.5 font-neo-display text-[9px] font-bold leading-none text-neo-white tabular-nums">
        {Math.round(heightM)}m
      </span>
    </button>
  );
}
