'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomEconomy } from './useClassroomEconomy';
import PowerUpShop from './PowerUpShop';
import ShopGoalLine from './ShopGoalLine';

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

  return (
    <>
      <section
        data-testid="round-shop"
        className="flex w-full flex-col gap-3 rounded-2xl border-4 border-neo-lime bg-neo-navy p-3 text-white shadow-[6px_6px_0_0_#000]"
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
            className="min-h-14 w-full rounded-xl border-4 border-black bg-neo-lime px-3 text-lg font-black text-neo-navy shadow-[4px_4px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5"
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
