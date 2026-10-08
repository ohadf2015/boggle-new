'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  POWER_UPS,
  POWER_UP_IDS,
  type ClassroomEconomySnapshot,
  type PowerUpId,
} from '@/shared/constants/classroomEconomy';

interface PowerUpShopProps {
  snapshot: ClassroomEconomySnapshot;
  onBuy: (id: PowerUpId) => void;
}

/**
 * Self-only power-ups. There is no target picker and no way to aim one at
 * another student, by design. Hidden entirely when the teacher turns them off.
 */
export default function PowerUpShop({ snapshot, onBuy }: PowerUpShopProps) {
  const { t } = useLanguage();
  if (!snapshot.config.powerUps) return null;

  return (
    <section aria-labelledby="economy-shop-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="economy-shop-title" className="text-lg font-bold">{t('economy.shop.title')}</h2>
        <span className="text-sm font-bold" data-testid="shop-cash">
          {t('economy.shop.cash', { cash: snapshot.cash })}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {POWER_UP_IDS.map((id) => {
          const { cost } = POWER_UPS[id];
          const affordable = snapshot.cash >= cost;
          return (
            <li key={id}>
              <button
                type="button"
                disabled={!affordable}
                onClick={() => onBuy(id)}
                className="flex min-h-14 w-full flex-col items-start rounded-lg border-2 border-black bg-neo-cream px-3 py-2 text-start text-neo-navy shadow-[4px_4px_0_0_#000] disabled:opacity-50"
              >
                <span className="font-bold">{t(`economy.shop.${id}.name`)}</span>
                <span className="text-xs">{t(`economy.shop.${id}.desc`)}</span>
                <span className="text-xs font-bold">{t('economy.shop.cost', { cost })}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
