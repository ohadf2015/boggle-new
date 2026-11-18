'use client';

import { useEffect, useState } from 'react';
import { Hammer, Sparkles, Wrench, Zap } from 'lucide-react';
import { Coins } from '@/components/ui/CoinsIcon';
import { type Estate, type PlotSlot, canUpgrade, repairCost, upgradeCost } from '@/lib/wordTowerV2/estate';
import { MAX_PLOT_LEVEL } from '@/lib/wordTowerV2/estateCatalog';
import { finishDistrictPlan } from '@/lib/wordTowerV2/estateFinish';
import { ITEM, nextPerkLine } from './estateArt';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  estate: Estate;
  slot: PlotSlot;
  name: string;
  districtName: string;
  busy: boolean;
  failed: boolean;
  onUpgrade: () => void;
  onRepair: () => void;
  onFinish: () => void;
}

/** What this plot gives next, and the one button that buys it. */
export function PlotPanel({ t, estate, slot, name, districtName, busy, failed, onUpgrade, onRepair, onFinish }: Props) {
  const plot = estate.plots.find((p) => p.slot === slot) ?? estate.plots[0];
  const maxed = plot.level >= MAX_PLOT_LEVEL;
  const check = canUpgrade(estate, slot);
  const cost = maxed ? 0 : upgradeCost(estate.district, slot, plot.level);
  const fix = repairCost(estate.district, slot, plot.level);
  const perk = nextPerkLine(estate.district, slot, plot.level);
  const useBlueprint = check.ok && check.useBlueprint;
  const useBrick = plot.damaged && estate.bricks > 0;
  const short = Math.max(0, cost - estate.coins);
  const repairShort = useBrick ? 0 : Math.max(0, fix - estate.coins);
  const plan = finishDistrictPlan(estate);
  const finishShort = plan ? Math.max(0, plan.coins - estate.coins) : 0;
  // Spending a whole district takes a second tap: the first one only arms it.
  const [armed, setArmed] = useState(false);
  useEffect(() => setArmed(false), [estate, slot]);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);

  return (
    <div className="mx-auto w-full max-w-md rounded-neo border-neo-thick border-black bg-neo-cream p-3 text-neo-navy shadow-hard md:max-w-3xl">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate font-neo-display text-lg font-black uppercase md:text-2xl">{name}</h3>
        <span className="shrink-0 rounded-neo border-neo border-black bg-neo-navy px-2 py-0.5 font-neo-display text-xs font-black text-neo-lime">
          {maxed ? t('wordTowerV2.estate.maxed') : t('wordTowerV2.estate.level', { n: plot.level })}
        </span>
      </div>
      <p className="mt-1 flex items-center gap-1.5 font-neo-display text-sm font-bold md:text-base">
        {/* A damaged plot's button buys the CURRENT level back, not the next
            one, so it must not advertise the next level's perk. */}
        {plot.damaged ? (
          <>
            <Wrench className="h-4 w-4 shrink-0 text-neo-red" aria-hidden />
            {t('wordTowerV2.estate.damaged')}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 shrink-0 text-neo-purple" aria-hidden />
            {t(perk.key, perk.params)}
          </>
        )}
      </p>

      {/* Every part is visible in the run — say where to look for it. */}
      <p className="mt-1 font-neo-display text-xs font-bold leading-snug opacity-80 md:text-sm">{t(`wordTowerV2.gear.see.${slot}`)}</p>

      {plot.damaged ? (
        <>
        <button
          type="button"
          disabled={busy || (!useBrick && estate.coins < fix)}
          onClick={onRepair}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-red px-4 py-3 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-50 disabled:shadow-none"
        >
          <Wrench className="h-5 w-5" aria-hidden />
          {t('wordTowerV2.estate.repair')}
          <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-cream px-2 py-0.5 text-sm tabular-nums">
            {useBrick ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ITEM.brick} alt="" aria-hidden className="h-4 w-4" />
            ) : (
              <Coins className="h-4 w-4" aria-hidden />
            )}
            {useBrick ? t('wordTowerV2.estate.free') : t('wordTowerV2.coins.chip', { n: fix.toLocaleString() })}
          </span>
        </button>
        {repairShort > 0 ? (
          <p className="mt-1 text-center font-neo-display text-xs font-bold opacity-80">{t('wordTowerV2.estate.need', { n: repairShort.toLocaleString() })}</p>
        ) : null}
        </>
      ) : maxed ? (
        <div className="mt-3 rounded-neo border-neo border-black bg-neo-yellow px-4 py-3 text-center font-neo-display text-base font-black uppercase">
          {t('wordTowerV2.estate.maxed')}
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={busy || !check.ok}
            onClick={onUpgrade}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-4 py-3 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:bg-neo-cream disabled:opacity-60 disabled:shadow-none md:text-xl"
          >
            <Hammer className="h-5 w-5" aria-hidden />
            {t('wordTowerV2.estate.upgrade')}
            <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-cream px-2 py-0.5 text-sm tabular-nums">
              {useBlueprint ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ITEM.blueprint} alt="" aria-hidden className="h-4 w-4" />
              ) : (
                <Coins className="h-4 w-4" aria-hidden />
              )}
              {useBlueprint ? t('wordTowerV2.estate.free') : t('wordTowerV2.coins.chip', { n: cost.toLocaleString() })}
            </span>
          </button>
          {!check.ok && short > 0 ? (
            <div className="mt-2">
              <div className="h-2.5 overflow-hidden rounded-sm border-2 border-black bg-neo-navy-light" role="progressbar" aria-valuemin={0} aria-valuemax={cost} aria-valuenow={Math.min(estate.coins, cost)}>
                <div className="h-full bg-neo-cyan" style={{ width: `${Math.min(100, (estate.coins / Math.max(1, cost)) * 100)}%` }} />
              </div>
              <p className="mt-1 text-center font-neo-display text-xs font-bold opacity-80">{t('wordTowerV2.estate.need', { n: short.toLocaleString() })}</p>
            </div>
          ) : null}
        </>
      )}

      {plan && plan.levels + plan.repairs > 1 ? (
        <>
          <button
            type="button"
            disabled={busy || finishShort > 0}
            onClick={() => {
              if (!armed) return setArmed(true);
              setArmed(false);
              onFinish();
            }}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-neo border-neo border-black px-3 py-2 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:bg-neo-cream disabled:opacity-60 disabled:shadow-none md:text-base ${armed ? 'bg-neo-pink' : 'bg-neo-yellow'}`}
          >
            <Zap className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{armed ? t('wordTowerV2.estate.finishConfirm') : t('wordTowerV2.estate.finishAll', { name: districtName })}</span>
            <span className="flex shrink-0 items-center gap-1 rounded-neo border-neo border-black bg-neo-cream px-2 py-0.5 text-xs tabular-nums">
              <Coins className="h-3.5 w-3.5" aria-hidden />
              {t('wordTowerV2.coins.chip', { n: plan.coins.toLocaleString() })}
            </span>
          </button>
          {finishShort > 0 ? (
            <p className="mt-1 text-center font-neo-display text-xs font-bold opacity-80">{t('wordTowerV2.estate.need', { n: finishShort.toLocaleString() })}</p>
          ) : null}
        </>
      ) : null}

      {failed ? (
        <p role="alert" className="mt-2 text-center font-neo-display text-xs font-black text-neo-red">{t('wordTowerV2.estate.spendFailed')}</p>
      ) : null}
    </div>
  );
}
