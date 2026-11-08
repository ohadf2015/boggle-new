'use client';

import { useCallback, useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { maxPrizeCoins, type DayPrizeClaimResponse, type DayPrizeKind } from '@/lib/daily/dayPrize';
import { DayPrizeReveal } from './DayPrizeReveal';
import { readOpenedPrize } from './dayPrizeStore';

interface DayPrizeHubCardProps {
  kind: DayPrizeKind;
  className?: string;
  /** Show the sign-in line to guests (off where another box already shows it). */
  guestNudge?: boolean;
}

/**
 * The prize box's home on the daily hub: "waiting" with an Open button until
 * the player opens it (here or on a results screen), then a quiet line with
 * what it held. Guests see what signing in would get them.
 */
export function DayPrizeHubCard({ kind, className, guestNudge = true }: DayPrizeHubCardProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [opened, setOpened] = useState<DayPrizeClaimResponse | null>(null);
  const [revealing, setRevealing] = useState(false);

  // Read after mount: the hub SSRs, and storage during render would mismatch hydration.
  useEffect(() => {
    setOpened(readOpenedPrize(kind));
  }, [kind]);

  const close = useCallback(() => {
    setRevealing(false);
    setOpened(readOpenedPrize(kind));
  }, [kind]);

  if (!user) {
    if (!guestNudge) return null;
    return (
      <p data-testid={`day-prize-guest-${kind}`} className={cn('w-full text-center text-xs font-bold text-neo-cream', className)}>
        {t(kind === 'perfect' ? 'daily.allClear.guestNudge' : 'daily.dayPrize.guestNudge', { coins: maxPrizeCoins(kind) })}
      </p>
    );
  }

  if (opened) {
    return (
      <p
        data-testid={`day-prize-opened-${kind}`}
        data-tier={opened.tier}
        className={cn('inline-flex items-center gap-1.5 text-xs font-black text-neo-yellow', className)}
      >
        <Gift className="w-4 h-4 shrink-0" aria-hidden />
        {t(kind === 'perfect' ? 'daily.dayPrize.hubOpenedPerfect' : 'daily.dayPrize.hubOpened', { coins: opened.coins })}
        {opened.tier !== 'common' && <span className="text-neo-cyan">· {t(`daily.dayPrize.tier.${opened.tier}`)}</span>}
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        data-testid={`day-prize-waiting-${kind}`}
        onClick={() => setRevealing(true)}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl border-3 border-neo-black bg-neo-yellow px-3 py-2 shadow-hard-sm text-start',
          'active:translate-y-0.5 active:shadow-none focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cream',
          className,
        )}
      >
        <span
          aria-hidden
          className="shrink-0 w-11 h-11 rounded-lg border-2 border-neo-black bg-cover bg-center animate-zap-wiggle motion-reduce:animate-none"
          style={{ backgroundImage: 'url(/daily/chests/chest-silver.jpg)' }}
        />
        <span className="flex-1 min-w-0 text-sm font-black text-neo-black">
          {t(kind === 'perfect' ? 'daily.dayPrize.hubReadyPerfect' : 'daily.dayPrize.hubReady')}
        </span>
        <span className="shrink-0 rounded-full border-2 border-neo-black bg-neo-black px-3 py-1 text-xs font-black uppercase text-neo-yellow">
          {t('daily.dayPrize.open')}
        </span>
      </button>
      {revealing && <DayPrizeReveal kind={kind} source="hub" onClose={close} />}
    </>
  );
}

export default DayPrizeHubCard;
