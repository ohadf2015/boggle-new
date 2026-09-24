'use client';

import { useEffect, useState } from 'react';
import { Coins, SpellCheck, Wrench, X } from 'lucide-react';
import { RESCUE_MS, type useBrace, rescueMinLen, MAX_RESCUES } from './useBrace';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  api: ReturnType<typeof useBrace>;
  reducedMotion: boolean;
}

/**
 * The brace offer, pinned above the dock beside DROP. Only
 * there while the tower wobbles; one tap opens the two ways to pay for it.
 * While a rescue word is running it becomes the countdown instead.
 */
export function BraceControl({ t, api, reducedMotion }: Props) {
  const [open, setOpen] = useState(false);
  const { offered, rescue } = api;
  useEffect(() => {
    if (!offered) setOpen(false);
  }, [offered]);

  if (rescue) {
    return (
      <div
        role="status"
        className="absolute inset-x-4 top-[calc(var(--wt2-hud,7rem)+0.5rem)] z-30 mx-auto max-w-sm overflow-hidden rounded-neo border-neo-thick border-black bg-neo-cyan shadow-hard"
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <SpellCheck className="h-5 w-5 shrink-0 text-neo-navy" aria-hidden />
          <p className="flex-1 font-neo-display text-sm font-black leading-tight text-neo-navy lg:text-base">
            {t('wordTowerV2.brace.rescueNow', { n: rescue.minLen })}
          </p>
          <button
            type="button"
            onClick={api.cancelRescue}
            aria-label={t('wordTowerV2.brace.cancel')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-cream text-neo-navy"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {/* Keyed on the deadline so a second rescue restarts the bar. */}
        <div
          key={rescue.until}
          className="h-2 origin-left bg-neo-navy rtl:origin-right"
          style={reducedMotion ? undefined : { animation: `wt2-rescue-clock ${RESCUE_MS}ms linear forwards` }}
        />
        <style>{'@keyframes wt2-rescue-clock{from{transform:scaleX(1)}to{transform:scaleX(0)}}'}</style>
      </div>
    );
  }

  if (!offered) return null;

  const priceLabel = api.price === 0 ? t('wordTowerV2.brace.freeTag') : api.price.toLocaleString();
  return (
    // By the dock, not under the HUD: up there it sat in the crane's swing lane
    // and covered the slab being aimed. The menu opens upward (column-reverse).
    <div className="absolute bottom-[calc(var(--wt2-dock,17rem)+0.75rem)] end-3 z-30 flex flex-col-reverse items-end gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-yellow px-3 py-1.5 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed lg:text-lg ${
          reducedMotion ? '' : 'animate-neo-pop'
        }`}
      >
        <Wrench className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden />
        {t('wordTowerV2.brace.button')}
        <span className="rounded-sm border-2 border-black bg-neo-cream px-1 text-xs tabular-nums lg:text-sm">{priceLabel}</span>
      </button>
      {open ? (
        <div className="w-64 rounded-neo border-neo-thick border-black bg-neo-navy p-2 shadow-hard">
          <p className="mb-2 font-neo-display text-xs font-bold leading-snug text-neo-cream/85">{t('wordTowerV2.brace.explain')}</p>
          <button
            type="button"
            disabled={!api.affordable}
            onClick={() => {
              api.buy();
              setOpen(false);
            }}
            className="mb-1.5 flex w-full items-center gap-2 rounded-neo border-neo border-black bg-neo-lime px-2 py-1.5 text-start font-neo-display text-sm font-black text-neo-navy shadow-hard-sm disabled:bg-neo-navy-light disabled:text-neo-cream/60"
          >
            <Coins className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">
              {api.price === 0 ? t('wordTowerV2.brace.useFree') : t('wordTowerV2.brace.buy', { n: api.price })}
              {!api.affordable ? <span className="block text-[11px] font-bold">{t('wordTowerV2.brace.poor')}</span> : null}
            </span>
          </button>
          <button
            type="button"
            disabled={api.rescuesLeft <= 0}
            onClick={() => {
              api.startRescue();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-neo border-neo border-black bg-neo-cyan px-2 py-1.5 text-start font-neo-display text-sm font-black text-neo-navy shadow-hard-sm disabled:bg-neo-navy-light disabled:text-neo-cream/60"
          >
            <SpellCheck className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">
              {t('wordTowerV2.brace.rescue', { n: rescueMinLen(MAX_RESCUES - api.rescuesLeft) })}
              <span className="block text-[11px] font-bold">{t('wordTowerV2.brace.rescueLeft', { n: api.rescuesLeft })}</span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
