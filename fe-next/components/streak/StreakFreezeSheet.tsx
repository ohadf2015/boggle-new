'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CoinArt } from '@/components/ui/CoinArt';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { buyStreakFreezeRequest } from '@/lib/daily/streakClient';
import { FREEZE_PRICE, MAX_HELD_FREEZES } from '@/lib/daily/streakRewards';

interface StreakFreezeSheetProps {
  open: boolean;
  freezes: number;
  isGuest: boolean;
  onSignIn: () => void;
  onClose: () => void;
  onBought: (freezes: number) => void;
}

type Problem = 'insufficient_coins' | 'max_held' | 'failed' | null;

/** Small sheet: what a freeze does, how many are held, and one buy button. */
export function StreakFreezeSheet({ open, freezes, isGuest, onSignIn, onClose, onBought }: StreakFreezeSheetProps) {
  const { t } = useLanguage();
  const [buying, setBuying] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  useEffect(() => {
    if (!open) return undefined;
    setProblem(null);
    trackGrowthEvent('streak_freeze_sheet_opened', { freezes, guest: isGuest });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Only on open: the count changing after a purchase is not a new open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const full = freezes >= MAX_HELD_FREEZES;
  const buy = async () => {
    setBuying(true);
    setProblem(null);
    const outcome = await buyStreakFreezeRequest();
    setBuying(false);
    trackGrowthEvent('streak_freeze_bought', { result: outcome.ok ? 'ok' : outcome.reason, price: FREEZE_PRICE });
    if (outcome.ok) onBought(outcome.freezes);
    else setProblem(outcome.reason);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-freeze-title"
      data-testid="streak-freeze-sheet"
      className="fixed inset-0 z-80 flex items-end justify-center bg-neo-navy/90 px-3 pb-3 sm:items-center sm:pb-0"
      onClick={(event) => {
        if (event.target === event.currentTarget && !buying) onClose();
      }}
    >
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border-[3px] border-neo-cyan bg-neo-navy-light p-5 shadow-hard-lg">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm">
            <Snowflake className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="streak-freeze-title" className="font-neo-display text-2xl font-black text-neo-cream">
              {t('dailyStreak.flame.freezeTitle')}
            </h2>
            <p className="font-neo-body text-sm text-neo-white/75">{t('dailyStreak.flame.freezeBody')}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2" aria-label={t('dailyStreak.flame.freezesLabel', { n: freezes, max: MAX_HELD_FREEZES })}>
          {Array.from({ length: MAX_HELD_FREEZES }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-neo border-2',
                i < freezes ? 'border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm' : 'border-dashed border-neo-cream/40 text-neo-cream/40',
              )}
            >
              <Snowflake className="h-6 w-6" strokeWidth={2.5} />
            </span>
          ))}
        </div>

        {problem && (
          <p role="alert" className="text-center text-sm font-bold text-neo-orange">
            {problem === 'insufficient_coins'
              ? t('dailyStreak.flame.needCoins', { price: FREEZE_PRICE })
              : problem === 'max_held'
                ? t('dailyStreak.flame.freezeFull')
                : t('dailyStreak.flame.buyFailed')}
          </p>
        )}

        {isGuest ? (
          <button
            type="button"
            data-testid="streak-freeze-signin"
            onClick={onSignIn}
            className="flex h-12 w-full items-center justify-center rounded-xl border-[3px] border-neo-black bg-neo-lime font-neo-display font-black uppercase text-neo-black shadow-hard-sm"
          >
            {t('dailyStreak.flame.signInForFreezes')}
          </button>
        ) : full ? (
          <p data-testid="streak-freeze-full" className="text-center font-neo-display text-sm font-bold text-neo-cyan">
            {t('dailyStreak.flame.freezeFull')}
          </p>
        ) : (
          <button
            type="button"
            data-testid="streak-freeze-buy"
            onClick={buy}
            disabled={buying}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-neo-black bg-neo-cyan font-neo-display text-base font-black uppercase text-neo-black shadow-hard active:translate-y-0.5 active:shadow-none disabled:opacity-80"
          >
            <CoinArt size={20} />
            {buying ? t('dailyStreak.flame.buying') : t('dailyStreak.flame.buy', { price: FREEZE_PRICE })}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          disabled={buying}
          className="min-h-11 text-xs font-bold text-neo-white/70 underline-offset-4 hover:underline"
        >
          {t('common.close')}
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default StreakFreezeSheet;
