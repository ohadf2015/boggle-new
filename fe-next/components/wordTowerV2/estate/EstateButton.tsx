'use client';

import { Building2 } from 'lucide-react';
import type { Estate } from '@/lib/wordTowerV2/estate';
import { ITEM, whatsNew } from './estateArt';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  estate: Estate;
  raids: number;
  /** `hud` floats over the tower, `panel` sits inside the results card. */
  variant?: 'hud' | 'panel';
  onOpen: () => void;
}

/**
 * One tap from the tower to the empire. The badge counts what is waiting —
 * raids, repairs and upgrades you can already afford — so a returning player
 * sees a reason before they open anything.
 */
export function EstateButton({ t, estate, raids, variant = 'hud', onOpen }: Props) {
  const news = whatsNew(estate, raids);
  const waiting = news.raids + news.damaged.length + news.affordable.length;

  if (variant === 'panel') {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-yellow px-6 py-2.5 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
      >
        <Building2 className="h-5 w-5" aria-hidden />
        {t('wordTowerV2.estate.open')}
        <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-cream px-2 py-0.5 text-sm tabular-nums">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ITEM.coin} alt="" aria-hidden className="h-4 w-4" />
          {estate.coins.toLocaleString()}
        </span>
        {waiting > 0 ? (
          <span className="absolute -end-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-neo border-black bg-neo-pink px-1 font-neo-display text-xs font-black shadow-hard-sm animate-neo-pop">
            {waiting}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('wordTowerV2.estate.open')}
      className="pointer-events-auto absolute end-3 top-3 z-40 flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-yellow px-2.5 py-1.5 font-neo-display text-base font-black tabular-nums text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ITEM.coin} alt="" aria-hidden className="h-5 w-5" />
      {estate.coins.toLocaleString()}
      <Building2 className="h-5 w-5" aria-hidden />
      {waiting > 0 ? (
        <span className="absolute -end-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-neo border-black bg-neo-pink px-1 text-[11px] shadow-hard-sm animate-neo-pop">
          {waiting}
        </span>
      ) : null}
    </button>
  );
}
