'use client';

import { useState, useCallback, useRef } from 'react';
import { getCoins } from '@/utils/coinManager';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useTowerUpgradeStore } from '@/lib/wordTower/useTowerUpgradeStore';
import { UPGRADE_DEFS, upgradeCost, levelOf, isMaxed, type UpgradeId } from '@/lib/wordTower/upgrades';
import { UPGRADE_CATEGORIES, effectDelta, recommendedUpgrade, type UpgradeCategoryId } from '@/lib/wordTower/upgradeCatalog';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir?: 'ltr' | 'rtl';
}

/** Category accents — crane owns the skill colour, stability the calm one,
 *  boost the celebration gold (coin/reward semantics). */
const CATEGORY_ACCENT: Record<UpgradeCategoryId, { text: string; border: string }> = {
  crane: { text: 'text-neo-lime', border: 'border-neo-lime/60' },
  stability: { text: 'text-neo-cyan', border: 'border-neo-cyan/60' },
  boost: { text: 'text-neo-yellow', border: 'border-neo-yellow/60' },
};

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
 * Word Tower — persistent upgrade shop. Categorized (crane / stability / boost)
 * with a current→next effect preview per row, a "best pick" chip on the smartest
 * affordable buy, and a purchase pop. Coins are spent through the store's `buy()`
 * (which goes via coinManager). RTL-safe; buy CTA carries black-on-lime for AA.
 */
export function WordTowerUpgradePanel({ onClose, t, dir = 'ltr' }: Props) {
  const levels = useTowerUpgradeStore((s) => s.levels);
  const buy = useTowerUpgradeStore((s) => s.buy);
  const [coins, setCoins] = useState(() => getCoins());
  // Bumps on each successful purchase — re-arms the bought row's pop animation.
  const [boughtFx, setBoughtFx] = useState<{ id: UpgradeId; key: number } | null>(null);

  // WCAG 2.1.2: trap keyboard focus inside the modal + Escape-to-close.
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);

  const handleBuy = useCallback(
    (id: UpgradeId) => {
      if (buy(id)) {
        setCoins(getCoins());
        setBoughtFx((prev) => ({ id, key: (prev?.key ?? 0) + 1 }));
      }
    },
    [buy],
  );

  const recommended = recommendedUpgrade(levels, coins);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neo-navy/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('wordTower.upgrade.title')}
      dir={dir}
    >
      <div className="flex max-h-[88vh] w-full max-w-md flex-col animate-neo-pop rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard-lg">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b-neo border-black p-4">
          <div>
            <h2 className="font-neo-display text-xl font-black uppercase tracking-wide text-neo-cyan">
              {t('wordTower.upgrade.title')}
            </h2>
            <p className="text-xs text-neo-cream/80">{t('wordTower.upgrade.subtitle')}</p>
          </div>
          <span className="shrink-0 rounded-neo border-neo border-black bg-neo-yellow px-3 py-1 font-neo-display text-sm font-black text-black shadow-hard-sm">
            {t('wordTower.upgrade.balance', { n: coins })}
          </span>
        </div>

        {/* Categorized upgrade rows */}
        <div className="flex flex-col gap-3 overflow-y-auto p-3">
          {UPGRADE_CATEGORIES.map((cat) => (
            <section key={cat.id} aria-label={t(`wordTower.upgrade.categories.${cat.id}`)}>
              <h3
                className={cn(
                  'mb-1.5 border-b px-1 pb-1 font-neo-display text-xs font-black uppercase tracking-widest',
                  CATEGORY_ACCENT[cat.id].text,
                  CATEGORY_ACCENT[cat.id].border,
                )}
              >
                {t(`wordTower.upgrade.categories.${cat.id}`)}
              </h3>
              <div className="flex flex-col gap-2">
                {cat.upgrades.map((id) => {
                  const lvl = levelOf(levels, id);
                  const maxed = isMaxed(id, lvl);
                  const cost = upgradeCost(id, lvl);
                  const affordable = !maxed && coins >= cost;
                  const delta = effectDelta(id, lvl);
                  const isBestPick = id === recommended;
                  const justBought = boughtFx?.id === id;
                  return (
                    <div
                      key={justBought ? `${id}-${boughtFx.key}` : id}
                      data-testid={`row-${id}`}
                      className={cn(
                        'flex items-center gap-3 rounded-neo border-neo border-black bg-neo-navy p-3',
                        affordable ? 'shadow-hard border-neo-lime/70' : 'shadow-hard-sm',
                        justBought && 'animate-neo-pop',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-neo-display text-sm font-black text-neo-white">
                            {t(`wordTower.upgrade.${id}.name`)}
                          </span>
                          <Pips level={lvl} max={UPGRADE_DEFS[id].maxLevel} />
                          {isBestPick && (
                            <span className="rounded-full border border-black bg-neo-lime px-1.5 py-px font-neo-display text-[9px] font-black uppercase text-black shadow-hard-sm">
                              {t('wordTower.upgrade.recommended')}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-neo-cream/75">{t(`wordTower.upgrade.${id}.desc`)}</p>
                        {delta && (
                          <p data-testid={`delta-${id}`} className="mt-0.5 font-neo-display text-[11px] font-bold text-neo-cream/90">
                            <span className="opacity-70">{delta.current}</span>
                            <span className="mx-1 opacity-50" aria-hidden>→</span>
                            <span className={CATEGORY_ACCENT[cat.id].text}>{delta.next}</span>
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        data-testid={`buy-${id}`}
                        onClick={() => handleBuy(id)}
                        disabled={!affordable}
                        aria-label={`${t(`wordTower.upgrade.${id}.name`)} — ${
                          maxed ? t('wordTower.upgrade.max') : t('wordTower.upgrade.balance', { n: cost })
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
                          t('wordTower.upgrade.max')
                        ) : (
                          <span className="flex flex-col items-center leading-tight">
                            <span>{t('wordTower.upgrade.buy')}</span>
                            <span className="text-[10px] opacity-90">🪙 {cost}</span>
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t-neo border-black p-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full rounded-neo border-neo border-black bg-neo-cyan py-2 font-neo-display text-sm font-black uppercase text-black shadow-hard active:translate-y-px"
          >
            {t('wordTower.upgrade.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
