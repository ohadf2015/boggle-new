'use client';

import type { Ref } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCountUp } from '@/lib/quickPlay/useCountUp';
import { CoinIcon, COIN_FLIGHT_LAND_MS } from './QuickResultsFx';

interface QuickResultsWalletProps {
  from: number;
  to: number;
  animate: boolean;
  /** Signed out: the coins are held, not banked — drawn muted. */
  held: boolean;
  iconRef?: Ref<HTMLSpanElement>;
}

export function QuickResultsWallet({ from, to, animate, held, iconRef }: QuickResultsWalletProps) {
  const { t } = useLanguage();
  const gained = useCountUp(to - from, { delay: COIN_FLIGHT_LAND_MS, duration: 600, enabled: animate && to > from });
  const shown = from + gained;
  return (
    <div
      className={`inline-flex h-10 items-center gap-1.5 rounded-full border-[3px] border-black px-2.5 pe-3 font-neo-display text-base font-bold tabular-nums shadow-hard bg-neo-navy-elevated ${
        held ? 'text-neo-yellow/80' : 'text-neo-yellow'
      }`}
      role="img"
      data-testid="quick-wallet"
      data-from={from}
      data-to={to}
      aria-label={t('quickPlay.solo.walletAria', '{coins} coins', { coins: String(to) })}
    >
      <span
        ref={iconRef}
        className={`block h-6 w-6 ${animate && to > from ? 'animate-[qp-wallet-bump_0.5s_ease-out_both]' : ''}`}
        style={animate ? { animationDelay: `${COIN_FLIGHT_LAND_MS}ms` } : undefined}
      >
        <CoinIcon className="h-full w-full" />
      </span>
      <span aria-hidden="true">{shown.toLocaleString('en-US')}</span>
    </div>
  );
}
