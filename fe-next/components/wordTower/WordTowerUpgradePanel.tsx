'use client';

import { useState, useCallback, useRef } from 'react';
import { getCoins } from '@/utils/coinManager';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useTowerUpgradeStore } from '@/lib/wordTower/useTowerUpgradeStore';
import { LIVE_UPGRADE_IDS, UPGRADE_DEFS, upgradeCost, levelOf, isMaxed, type UpgradeId } from '@/lib/wordTower/upgrades';

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
 * Word Tower — persistent upgrade shop. A neo-brutalist modal (matches the perk
 * draft) listing the LIVE permanent tower upgrades; coins are spent through the
 * store's `buy()` (which goes via coinManager). Opened between climbs from the
 * HUD. RTL-safe (hard shadows auto-flip); the buy CTA carries black ink on lime
 * for AA contrast.
 */
export function WordTowerUpgradePanel({ onClose, t, dir = 'ltr' }: Props) {
  const levels = useTowerUpgradeStore((s) => s.levels);
  const buy = useTowerUpgradeStore((s) => s.buy);
  const [coins, setCoins] = useState(() => getCoins());

  // WCAG 2.1.2: trap keyboard focus inside the modal + Escape-to-close. The panel
  // only mounts while open, so the trap is always active here.
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);

  const handleBuy = useCallback(
    (id: UpgradeId) => {
      if (buy(id)) setCoins(getCoins());
    },
    [buy],
  );

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

        {/* Upgrade rows */}
        <div className="flex flex-col gap-2 overflow-y-auto p-3">
          {LIVE_UPGRADE_IDS.map((id) => {
            const lvl = levelOf(levels, id);
            const maxed = isMaxed(id, lvl);
            const cost = upgradeCost(id, lvl);
            const affordable = !maxed && coins >= cost;
            return (
              <div
                key={id}
                className="flex items-center gap-3 rounded-neo border-neo border-black bg-neo-navy p-3 shadow-hard-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-neo-display text-sm font-black text-neo-white">
                      {t(`wordTower.upgrade.${id}.name`)}
                    </span>
                    <Pips level={lvl} max={UPGRADE_DEFS[id].maxLevel} />
                  </div>
                  <p className="mt-0.5 text-xs text-neo-cream/75">{t(`wordTower.upgrade.${id}.desc`)}</p>
                </div>
                <button
                  type="button"
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
