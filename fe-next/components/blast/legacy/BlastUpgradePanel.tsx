'use client';

import { useState, useCallback, useRef } from 'react';
import { Coins, Gem } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBlastUpgradeStore, BLAST_UPGRADES } from '@/lib/blast/useBlastUpgradeStore';
import { upgradeCost, type BlastUpgradeId } from '@/lib/blast/blastUpgradeCatalog';
import { useBlastGems } from '@/lib/blast/useBlastGems';
import { useCoinContext } from '@/contexts/CoinContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir?: 'ltr' | 'rtl';
}

/** Level pips: maxLevel dots, the owned ones filled. */
function Pips({ level, max }: { level: number; max: number }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full border border-black ${i < level ? 'bg-neo-lime' : 'bg-neo-navy'}`}
        />
      ))}
    </span>
  );
}

/**
 * Blast — upgrade store. Mirrors Word Tower's UX: coin/gem balance chips,
 * scrollable upgrade list with level pips, cost, and BUY button (maxed/unaffordable disabled).
 * Purchase pops with animation. RTL-safe; dark neo-brutalist brand.
 */
export function BlastUpgradePanel({ onClose, t, dir = 'ltr' }: Props) {
  // Subscribe to the reactive levels map so pips/costs re-render after a purchase.
  const levels = useBlastUpgradeStore((s) => s.levels);
  const buy = useBlastUpgradeStore((s) => s.buy);

  const coins = useCoinContext().coins;
  const gems = useBlastGems((s) => s.gems);

  const [boughtFx, setBoughtFx] = useState<{ id: BlastUpgradeId; key: number } | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);

  const handleBuy = useCallback(
    (id: BlastUpgradeId) => {
      if (buy(id)) {
        setBoughtFx((prev) => ({ id, key: (prev?.key ?? 0) + 1 }));
      }
    },
    [buy],
  );

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neo-navy/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('blast.store.title')}
      dir={dir}
    >
      <AdaptiveMotion.div className="flex max-h-[88vh] w-full max-w-md flex-col animate-neo-pop rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard-lg">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b-neo border-black p-4">
          <h2 className="font-neo-display text-xl font-black uppercase tracking-wide text-neo-cyan">
            {t('blast.store.title')}
          </h2>
          <div className="flex shrink-0 gap-2">
            {/* Coins chip */}
            <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-yellow px-3 py-1 font-neo-display text-sm font-black text-black shadow-hard-sm">
              <Coins size={16} className="shrink-0" />
              {coins}
            </span>
            {/* Gems chip */}
            <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-purple px-3 py-1 font-neo-display text-sm font-black text-neo-white shadow-hard-sm">
              <Gem size={16} className="shrink-0" />
              {gems}
            </span>
          </div>
        </div>

        {/* Upgrade rows */}
        <div className="flex flex-col gap-3 overflow-y-auto p-3">
          {BLAST_UPGRADES.map((def) => {
            const lvl = Math.min(def.maxLevel, Math.max(0, levels[def.id] ?? 0));
            const maxed = lvl >= def.maxLevel;
            const cost = upgradeCost(def, lvl);
            const canAfford = def.currency === 'coins' ? coins >= cost : gems >= cost;
            const affordable = !maxed && canAfford;
            const justBought = boughtFx?.id === def.id;

            return (
              <AdaptiveMotion.div
                key={justBought ? `${def.id}-${boughtFx.key}` : def.id}
                data-testid={`row-${def.id}`}
                className={cn(
                  'flex items-center gap-3 rounded-neo border-neo border-black bg-neo-navy p-3',
                  affordable ? 'shadow-hard border-neo-lime/70' : 'shadow-hard-sm',
                  justBought && 'animate-neo-pop',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-neo-display text-sm font-black text-neo-white">
                      {t(`blast.store.${def.id}.name`)}
                    </span>
                    <Pips level={lvl} max={def.maxLevel} />
                  </div>
                  <p className="mt-0.5 text-xs text-neo-cream/75">
                    {t(`blast.store.${def.id}.desc`)}
                  </p>
                </div>

                <button
                  type="button"
                  data-testid={`buy-${def.id}`}
                  onClick={() => handleBuy(def.id)}
                  disabled={!affordable}
                  aria-label={`${t(`blast.store.${def.id}.name`)} — ${
                    maxed ? t('blast.store.max') : t('blast.store.buy')
                  }`}
                  className={`min-h-[44px] shrink-0 rounded-neo border-neo border-black px-3 py-2 font-neo-display text-xs font-black uppercase shadow-hard-sm transition active:translate-y-px ${
                    maxed
                      ? 'bg-neo-navy-light text-neo-cream/50'
                      : affordable
                        ? 'bg-neo-lime text-black hover:brightness-105'
                        : 'cursor-not-allowed bg-neo-navy-light text-neo-cream/40'
                  }`}
                >
                  {maxed ? (
                    t('blast.store.max')
                  ) : (
                    <span className="flex flex-col items-center leading-tight">
                      <span>{t('blast.store.buy')}</span>
                      <span className="text-[10px] opacity-90">
                        {def.currency === 'coins' ? '🪙' : '💎'} {cost}
                      </span>
                    </span>
                  )}
                </button>
              </AdaptiveMotion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t-neo border-black p-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full rounded-neo border-neo border-black bg-neo-cyan py-2 font-neo-display text-sm font-black uppercase text-black shadow-hard active:translate-y-px"
          >
            {t('blast.store.close')}
          </button>
        </div>
      </AdaptiveMotion.div>
    </div>
  );
}

export default BlastUpgradePanel;
