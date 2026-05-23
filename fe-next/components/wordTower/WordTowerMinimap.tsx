'use client';

import { miniTowerScaleMax, altToFraction, miniTowerZones } from '@/lib/wordTower/miniTower';
import { BIOME_THEME } from './biomeTheme';

interface WordTowerMinimapProps {
  /** Committed climber height (m). */
  heightM: number;
  /** Currently-viewed altitude (m) — differs from heightM only while panned. */
  viewM: number;
  personalBestM: number;
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
export function WordTowerMinimap({ heightM, viewM, personalBestM, onScrollTop, t }: WordTowerMinimapProps) {
  const scaleMax = miniTowerScaleMax(heightM, personalBestM);
  const zones = miniTowerZones(scaleMax);
  const climberFrac = altToFraction(heightM, scaleMax);
  const viewFrac = altToFraction(viewM, scaleMax);
  const pbFrac = altToFraction(personalBestM, scaleMax);
  const showPb = personalBestM > heightM + 1;
  const panned = Math.abs(viewM - heightM) > 2;

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
              backgroundColor: hex(BIOME_THEME[z.id].block),
              opacity: 0.85,
            }}
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
