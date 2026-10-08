'use client';

import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Lightbulb, ShieldCheck, Zap, type LucideIcon } from 'lucide-react';
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
  /** Between rounds: double cash has no live round to run in. */
  between?: boolean;
}

const ICONS: Record<PowerUpId, LucideIcon> = {
  doubleCash: Zap,
  streakShield: ShieldCheck,
  hintReveal: Lightbulb,
};

/**
 * Self-only power-ups. There is no target picker and no way to aim one at
 * another student, by design. Hidden entirely when the teacher turns them off.
 */
export default function PowerUpShop({ snapshot, onBuy, between = false }: PowerUpShopProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const [bought, setBought] = useState<PowerUpId | null>(null);
  if (!snapshot.config.powerUps) return null;

  const handleBuy = (id: PowerUpId) => {
    setBought(id);
    onBuy(id);
  };

  return (
    <section aria-labelledby="economy-shop-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="economy-shop-title" className="text-xl font-black">{t('economy.shop.title')}</h2>
        <span className="rounded-full border-2 border-black bg-neo-lime px-3 py-1 text-base font-black text-neo-navy" data-testid="shop-cash">
          {t('economy.shop.cash', { cash: snapshot.cash })}
        </span>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {POWER_UP_IDS.map((id) => {
          const { cost } = POWER_UPS[id];
          const Icon = ICONS[id];
          const owned = id === 'streakShield' ? snapshot.shieldHeld : id === 'doubleCash' && snapshot.doubleCashMsLeft > 0;
          const roundOnly = id === 'doubleCash' && between;
          const disabled = owned || roundOnly || snapshot.cash < cost;
          return (
            <li key={id} className="min-w-0">
              <m.button
                type="button"
                data-testid={`shop-item-${id}`}
                disabled={disabled}
                onClick={() => handleBuy(id)}
                whileTap={reduced || disabled ? undefined : { scale: 0.92 }}
                animate={bought === id && !reduced ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                onAnimationComplete={() => setBought((cur) => (cur === id ? null : cur))}
                className="relative flex min-h-36 w-full flex-col items-center gap-1 rounded-2xl border-4 border-black bg-neo-cream p-2 text-center text-neo-navy shadow-[4px_4px_0_0_#000] disabled:opacity-60"
              >
                <Icon aria-hidden="true" className="h-8 w-8" />
                <span className="text-sm font-black leading-tight">{t(`economy.shop.${id}.name`)}</span>
                <span className="text-[11px] leading-tight">{t(`economy.shop.${id}.desc`)}</span>
                <span className="mt-auto rounded-full border-2 border-black bg-neo-pink px-2 py-0.5 text-sm font-black text-white">
                  {owned ? t('economy.shop.owned') : roundOnly ? t('economy.shop.roundOnly') : t('economy.shop.cost', { cost })}
                </span>
              </m.button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
