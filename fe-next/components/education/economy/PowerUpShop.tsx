'use client';

import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Lightbulb, ShieldCheck, Zap, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CoinArt } from '@/components/ui/CoinArt';
import {
  POWER_UPS,
  POWER_UP_IDS,
  type ClassroomEconomySnapshot,
  type PowerUpId,
} from '@/shared/constants/classroomEconomy';
import { powerUpStatus, type PowerUpStatus } from './shopGoal';

interface PowerUpShopProps {
  snapshot: ClassroomEconomySnapshot;
  onBuy: (id: PowerUpId) => void;
  /** Between rounds: double cash has no live round to run in. */
  between?: boolean;
}

const ICONS: Record<PowerUpId, { Icon: LucideIcon; tile: string }> = {
  doubleCash: { Icon: Zap, tile: 'bg-neo-yellow' },
  streakShield: { Icon: ShieldCheck, tile: 'bg-neo-cyan' },
  hintReveal: { Icon: Lightbulb, tile: 'bg-neo-pink' },
};

const PILL: Record<PowerUpStatus['kind'], string> = {
  ready: 'bg-neo-lime text-neo-navy',
  short: 'bg-neo-navy-light text-neo-cream',
  owned: 'bg-neo-cyan text-neo-navy',
  roundOnly: 'bg-neo-navy-light text-neo-cream',
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
        <h2 id="economy-shop-title" className="font-neo-display text-xl font-black uppercase">{t('economy.shop.title')}</h2>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-base font-black text-neo-navy shadow-hard-sm"
          data-testid="shop-cash"
          aria-label={t('economy.shop.cash', { cash: snapshot.cash })}
        >
          <CoinArt size={20} />
          <span aria-hidden="true">{snapshot.cash}</span>
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {POWER_UP_IDS.map((id) => {
          const { cost } = POWER_UPS[id];
          const { Icon, tile } = ICONS[id];
          const status = powerUpStatus(snapshot, id, between);
          const disabled = status.kind !== 'ready';
          const pill =
            status.kind === 'owned' ? t('economy.shop.owned')
              : status.kind === 'roundOnly' ? t('economy.shop.roundOnly')
                : status.kind === 'short' ? t('economy.shop.need', { missing: status.missing })
                  : t('economy.shop.cost', { cost });
          return (
            <li key={id} className="min-w-0">
              <m.button
                type="button"
                data-testid={`shop-item-${id}`}
                disabled={disabled}
                onClick={() => handleBuy(id)}
                whileTap={reduced || disabled ? undefined : { scale: 0.96 }}
                animate={bought === id && !reduced ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                onAnimationComplete={() => setBought((cur) => (cur === id ? null : cur))}
                className={`flex min-h-16 w-full items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-cream p-2 text-start text-neo-navy transition-transform ${disabled ? 'opacity-70' : 'shadow-hard-lg hover:-translate-y-px'}`}
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-neo border-2 border-neo-black ${tile}`}>
                  <Icon aria-hidden="true" className="size-6" strokeWidth={2.5} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-neo-display text-sm font-black uppercase leading-tight">{t(`economy.shop.${id}.name`)}</span>
                  <span className="text-xs leading-snug text-neo-navy/75">{t(`economy.shop.${id}.desc`)}</span>
                </span>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-neo-black px-2 py-1 text-xs font-black ${PILL[status.kind]}`}>
                  {status.kind === 'ready' && <CoinArt size={14} />}
                  {pill}
                </span>
              </m.button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
