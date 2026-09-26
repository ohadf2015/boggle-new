'use client';

import { memo } from 'react';
import { Activity, SpellCheck, TriangleAlert, Wrench } from 'lucide-react';
import { type StabilityBand, stabilityBand } from '@/lib/wordTowerV2/stability';
import { type useBrace } from './useBrace';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  risk: number;
  api: ReturnType<typeof useBrace>;
  reducedMotion: boolean;
}

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
 * Merged stability meter + brace action in ONE compact control.
 * Lives in the dock row next to the letter wheel (thumb zone).
 *
 * Steady: pips only (no text, no button).
 * Wobbly/danger: danger label + brace cost when affordable, or rescue option.
 * No rescue countdown — that lives in BraceControl, rendered separately.
 */
export const StabilityBrace = memo(function StabilityBrace({
  t,
  risk,
  api,
  reducedMotion,
}: Props) {
  const band = stabilityBand(risk);
  const pct = Math.round(risk * 100);
  const lit = Math.max(1, Math.ceil(risk * SEGMENTS));
  const Icon = band === 'danger' ? TriangleAlert : Activity;

  // Only show action buttons when offered and no countdown running.
  // BraceControl handles the countdown display.
  const showBraceButton = api.offered && !api.rescue && api.affordable;
  const showRescueButton = api.offered && !api.rescue && !api.affordable;

  const priceLabel =
    api.price === 0
      ? t('wordTowerV2.brace.freeTag')
      : api.price.toLocaleString();

  return (
    <div
      data-wt2-stability-brace
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={t('wordTowerV2.stability.a11y', {
        band: t(`wordTowerV2.stability.${band}`),
        pct,
      })}
      className={`flex shrink-0 items-center gap-1.5 rounded-neo border-neo border-neo-cream/80 bg-neo-navy/85 px-2 py-1 transition-all duration-200 lg:px-2.5 lg:py-1.5 ${
        showBraceButton || showRescueButton ? 'pointer-events-auto' : ''
      }`}
    >
      {/* Steady state: pips only, no text. */}
      {band === 'steady' ? (
        <div className="flex gap-[3px]">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-3 rounded-[2px] lg:h-3 lg:w-4 ${
                i < lit ? `${BAND_FILL[band]} border border-neo-cream/80` : 'bg-neo-cream/15'
              } ${reducedMotion ? '' : 'transition-colors duration-200'}`}
            />
          ))}
        </div>
      ) : (
        <>
          {/* Icon */}
          <Icon
            className={`h-4 w-4 shrink-0 lg:h-5 lg:w-5 ${BAND_TEXT[band]}`}
            aria-hidden
          />

          {/* When offered: show the actionable danger label + action button (brace or rescue) */}
          {api.offered && (
            <>
              <span
                className={`font-neo-display text-[10px] font-black uppercase leading-none tracking-wide lg:text-xs ${BAND_TEXT.danger}`}
              >
                {t('wordTowerV2.stability.danger')}
              </span>

              {showBraceButton && (
                <button
                  type="button"
                  data-wt2-stability-brace-action
                  onClick={api.buy}
                  className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black uppercase text-neo-navy shadow-hard-sm transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed lg:text-sm"
                >
                  <Wrench className="h-3 w-3 shrink-0 lg:h-4 lg:w-4" aria-hidden />
                  <span className="rounded-sm border border-black bg-neo-cream px-1 text-[10px] font-bold tabular-nums lg:text-xs">
                    {priceLabel}
                  </span>
                </button>
              )}

              {showRescueButton && (
                <button
                  type="button"
                  data-wt2-stability-rescue-action
                  onClick={api.startRescue}
                  disabled={api.rescuesLeft <= 0}
                  aria-label={t('wordTowerV2.brace.rescue', { n: 5 + (2 - api.rescuesLeft) })}
                  className="pointer-events-auto flex shrink-0 items-center rounded-neo border-neo border-black bg-neo-cyan px-1.5 py-0.5 font-neo-display text-[10px] font-black uppercase text-neo-navy shadow-hard-sm transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed disabled:opacity-40 disabled:shadow-none lg:text-xs"
                  title={t('wordTowerV2.brace.rescueLeft', { n: api.rescuesLeft })}
                >
                  <SpellCheck className="h-3 w-3 shrink-0 lg:h-4 lg:w-4" aria-hidden />
                </button>
              )}
            </>
          )}

          {/* Stability pips: always present when not steady */}
          <div className="flex gap-[3px]" aria-hidden>
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-[1px] lg:h-2.5 lg:w-2.5 ${
                  i < lit ? `${BAND_FILL[band]} border border-neo-cream/80` : 'bg-neo-cream/15'
                } ${reducedMotion ? '' : 'transition-colors duration-200'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});
