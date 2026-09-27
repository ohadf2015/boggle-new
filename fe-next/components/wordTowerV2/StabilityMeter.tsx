'use client';

import { memo } from 'react';
import { Activity, TriangleAlert } from 'lucide-react';
import { type StabilityBand, stabilityBand } from '@/lib/wordTowerV2/stability';

type T = (key: string, params?: Record<string, string | number>) => string;

/** Five chunky segments: readable at a glance from the couch, not a thin gauge. */
const SEGMENTS = 5;

const BAND_FILL: Record<StabilityBand, string> = {
  steady: 'bg-neo-lime',
  wobbly: 'bg-neo-yellow',
  danger: 'bg-neo-pink',
};

const BAND_TEXT: Record<StabilityBand, string> = {
  steady: 'text-neo-lime',
  wobbly: 'text-neo-yellow',
  danger: 'text-neo-pink',
};

/**
 * How close the tower is to going over (lib/wordTowerV2/stability). It FILLS
 * as the risk climbs and changes colour at each band, so the question the
 * player is asking — "can I get away with another sloppy drop?" — reads as a
 * fuel gauge running into the red. Display only: physics ends the run.
 */
export const StabilityMeter = memo(function StabilityMeter({ t, risk, reducedMotion }: { t: T; risk: number; reducedMotion?: boolean }) {
  const band = stabilityBand(risk);
  const pct = Math.round(risk * 100);
  // Even a plumb tower shows one lit segment: an empty meter reads as broken.
  const lit = Math.max(1, Math.ceil(risk * SEGMENTS));
  const Icon = band === 'danger' ? TriangleAlert : Activity;

  return (
    <div
      data-wt2-stability
      data-band={band}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={t('wordTowerV2.stability.a11y', { band: t(`wordTowerV2.stability.${band}`), pct })}
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-navy/90 px-2 shadow-hard lg:h-14 lg:px-3 ${
        band === 'danger' && !reducedMotion ? 'animate-pulse' : ''
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 lg:h-6 lg:w-6 ${BAND_TEXT[band]}`} aria-hidden />
      <div className="flex flex-col gap-0.5" aria-hidden>
        <span className={`font-neo-display text-[10px] font-black uppercase leading-none tracking-wide lg:text-sm ${BAND_TEXT[band]}`}>
          {t(`wordTowerV2.stability.${band}`)}
        </span>
        <div className="flex gap-[3px]">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-3 rounded-[2px] border border-black lg:h-3.5 lg:w-4 ${i < lit ? BAND_FILL[band] : 'bg-neo-cream/15'} ${
                reducedMotion ? '' : 'transition-colors duration-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
