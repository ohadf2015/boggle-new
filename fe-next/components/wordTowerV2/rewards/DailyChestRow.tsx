'use client';

import { useMemo } from 'react';
import { m } from 'framer-motion';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { revealBeats } from '@/lib/wordTowerV2/rewards';
import { ITEM } from '../estate/estateArt';
import type { PayoutStatus } from './useRunPayout';
import { CHEST_ART, ITEM_ART, ITEM_CLASS, TIER_CLASS } from './ChestReveal';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  payoutStatus?: PayoutStatus;
  reducedMotion?: boolean;
}

const ROW = 'flex min-h-[5.5rem] items-center py-2 gap-3 rounded-neo border-neo-thick border-neo-black px-3 shadow-hard';

/**
 * The daily's chest, inline on the results sheet: the results never wait for
 * the server, so the chest lands into its reserved slot instead of a modal.
 */
export function DailyChestRow({ t, payoutStatus, reducedMotion }: Props) {
  const status = payoutStatus?.status;
  const chest = status === 'paid' ? payoutStatus?.chest : undefined;
  const items = useMemo(
    () => (chest ? revealBeats(chest, 0).flatMap((b) => (b.kind === 'item' ? [b] : [])) : []),
    [chest],
  );

  if (status === 'idle' || status === 'pending') {
    return (
      <div data-testid="wt2-daily-chest" data-state="pending" className={`${ROW} bg-neo-navy-light`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CHEST_ART('common', false)} alt="" aria-hidden className="h-16 w-16 shrink-0 object-contain opacity-50 grayscale" />
        <span aria-live="polite" className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-cream/70">
          {t('wordTowerV2.dailyResults.chestIncoming')}
        </span>
      </div>
    );
  }
  if (!chest) return null;

  const tierName = t(`wordTowerV2.chest.tier.${chest.tier}`);
  return (
    <m.div
      key="paid"
      data-testid="wt2-daily-chest"
      data-state="paid"
      data-tier={chest.tier}
      className={`${ROW} bg-neo-navy-light`}
      initial={reducedMotion ? false : { scale: 0.7, rotate: -4 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={SPRING_PRESETS.bouncy}
    >
      <m.div
        className={`flex h-16 w-16 shrink-0 items-end justify-center rounded-neo border-neo border-neo-black ${TIER_CLASS[chest.tier]}`}
        initial={reducedMotion ? false : { scale: 0.4, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ ...SPRING_PRESETS.bouncy, delay: reducedMotion ? 0 : 0.08 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CHEST_ART(chest.tier, true)} alt={tierName} className="h-[3.75rem] w-[3.75rem] object-contain" />
      </m.div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={`w-fit rounded-neo border-neo border-neo-black px-2 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy ${TIER_CLASS[chest.tier]}`}>
          {tierName}
        </span>
        <ul className="flex flex-wrap items-center gap-1.5">
          <ChestChip className="bg-neo-yellow" art={ITEM.coin} index={0} reducedMotion={reducedMotion}>
            {/* dir=ltr: Hebrew bidi would render `+180` as `180+`. */}
            <span dir="ltr" className="tabular-nums">{`+${chest.coins.toLocaleString()}`}</span>
          </ChestChip>
          {items.map((it, i) => (
            <ChestChip key={it.item} className={ITEM_CLASS[it.item]} art={ITEM_ART[it.item]} index={i + 1} reducedMotion={reducedMotion}>
              {t(`wordTowerV2.chest.item.${it.item}`, { n: it.n })}
            </ChestChip>
          ))}
        </ul>
      </div>
    </m.div>
  );
}

function ChestChip({
  className,
  art,
  index,
  reducedMotion,
  children,
}: {
  className: string;
  art: string;
  index: number;
  reducedMotion?: boolean;
  children: React.ReactNode;
}) {
  return (
    <m.li
      className={`flex items-center gap-1 rounded-neo border-2 border-neo-black px-1.5 py-0.5 font-neo-display text-xs font-black uppercase text-neo-navy shadow-hard-sm ${className}`}
      initial={reducedMotion ? false : { scale: 0.3 }}
      animate={{ scale: 1 }}
      transition={{ ...SPRING_PRESETS.bouncy, delay: reducedMotion ? 0 : 0.16 + index * 0.07 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art} alt="" aria-hidden className="h-4 w-4 object-contain" />
      {children}
    </m.li>
  );
}
