'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomEconomy } from './useClassroomEconomy';
import PowerUpShop from './PowerUpShop';
import ShopGoalLine from './ShopGoalLine';
import { canBuyBetweenRounds } from './shopGoal';
import { cn } from '@/lib/utils';

/**
 * Between-round shop. The results card always shows the shell and a big spend
 * button; the power-up grid opens as a full-screen step so it cannot be missed
 * and is dismissed back to results. Cash figures come only from the server.
 */
export default function RoundShop({ gameCode }: { gameCode: string }) {
  const { t } = useLanguage();
  const econ = useClassroomEconomy(gameCode);
  const [open, setOpen] = useState(false);
  const snapshot = econ.snapshot;
  const shop = snapshot?.config.powerUps ? snapshot : null;
  const canBuy = shop ? canBuyBetweenRounds(shop) : false;

  return (
    <>
      <section
        data-testid="round-shop"
        className="flex w-full flex-col gap-3 rounded-2xl border-4 border-neo-lime bg-neo-navy p-3 text-white shadow-hard-xl"
      >
        <h2 className="text-xl font-black text-neo-lime">{t('economy.shop.round')}</h2>
        {!snapshot && !econ.error && <p className="text-sm font-bold">{t('economy.hud.loading')}</p>}
        {snapshot && !shop && <p className="text-sm">{t('economy.shop.off')}</p>}
        {shop && <ShopGoalLine cash={shop.cash} />}
        {shop && (
          <button
            type="button"
            data-testid="round-shop-open"
            onClick={() => setOpen(true)}
            disabled={!canBuy}
            className={cn(
              'min-h-14 w-full rounded-xl border-4 px-3 text-lg font-black transition-transform duration-150 ease-out',
              canBuy
                ? 'border-black bg-neo-lime text-neo-navy shadow-hard-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan active:scale-[0.97]'
                : 'cursor-not-allowed border-white/20 bg-white/5 text-white/50'
            )}
          >
            {t('economy.shop.open', { cash: shop.cash })}
          </button>
        )}
        {econ.error && (
          <p role="alert" className="text-sm text-neo-pink">{t(`economy.error.${econ.error}`)}</p>
        )}
      </section>

      {open && shop && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="round-shop-dialog-title"
          className="fixed inset-0 z-[90] flex flex-col gap-4 overflow-y-auto bg-neo-navy p-4 pb-8 text-white"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="round-shop-dialog-title" className="text-xl font-black text-neo-lime">{t('economy.shop.round')}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-11 rounded-lg border-2 border-black bg-neo-cream px-3 font-bold text-neo-navy"
            >
              {t('economy.shop.close')}
            </button>
          </div>
          <ShopGoalLine cash={shop.cash} />
          <PowerUpShop snapshot={shop} onBuy={econ.buy} between />
          {econ.error && (
            <p role="alert" className="text-sm text-neo-pink">{t(`economy.error.${econ.error}`)}</p>
          )}
        </div>
      )}
    </>
  );
}
