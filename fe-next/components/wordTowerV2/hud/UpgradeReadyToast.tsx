'use client';

import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Hammer } from 'lucide-react';
import { type Estate, upgradeCost } from '@/lib/wordTowerV2/estate';
import { MAX_PLOT_LEVEL } from '@/lib/wordTowerV2/estateCatalog';
import { styleProgress } from '@/lib/wordTowerV2/towerStyle';

type T = (key: string, params?: Record<string, string | number>) => string;

export const UPGRADE_TOAST_MS = 3800;

/** How many workshop plots `coins` could each pay for on their own (blueprints count as one). */
export function affordableCount(estate: Estate, coins: number): number {
  let n = 0;
  for (const p of estate.plots ?? []) {
    if (p.level >= MAX_PLOT_LEVEL || p.damaged) continue;
    if (estate.blueprints > 0 || coins >= upgradeCost(estate.district || 1, p.slot, p.level)) n += 1;
  }
  return n;
}

/**
 * Fires when THIS run's coins push the player over the price of an upgrade
 * they could not afford when the run started. The run's coins bank when it
 * ends, so the toast says to build it then (player ask, Nov 2026: "when user
 * accumulates score it should show him he got upgrade or enough money").
 */
export function useUpgradeReady(estate: Estate, runCoins: number): number {
  const bank = estate.coins ?? 0;
  const count = affordableCount(estate, bank + Math.max(0, runCoins));
  const last = useRef<{ count: number; bank: number; plots: string } | null>(null);
  const plots = (estate.plots ?? []).map((p) => `${p.level}${p.damaged ? 'd' : ''}`).join(',');
  const [key, setKey] = useState(0);
  useEffect(() => {
    const prev = last.current;
    last.current = { count, bank, plots };
    // Only THIS run's coins may fire it: a late estate load, a purchase or a
    // banked run moves the baseline silently.
    if (!prev || prev.bank !== bank || prev.plots !== plots) return;
    if (count > prev.count) setKey((k) => k + 1);
  }, [count, bank, plots]);
  return key;
}

interface Props {
  t: T;
  estate: Estate;
  runCoins: number;
  reducedMotion?: boolean;
}

export function UpgradeReadyToast({ t, estate, runCoins, reducedMotion }: Props) {
  const key = useUpgradeReady(estate, runCoins);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (key === 0) return;
    setShown(key);
    const id = window.setTimeout(() => setShown(0), UPGRADE_TOAST_MS);
    return () => window.clearTimeout(id);
  }, [key]);
  if (!shown) return null;

  const { next, toNext } = styleProgress(estate);
  return (
    <m.button
      type="button"
      key={shown}
      data-wt2-upgrade-ready
      onClick={() => setShown(0)}
      role="status"
      initial={reducedMotion ? false : { y: -24, scale: 0.8, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      className="pointer-events-auto absolute inset-x-4 top-[calc(var(--wt2-hud,7rem)+0.5rem)] z-40 mx-auto flex max-w-sm items-center gap-3 rounded-neo border-neo-thick border-black bg-neo-lime p-2.5 text-start text-neo-navy shadow-hard"
    >
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-yellow">
        <Hammer className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-neo-display text-base font-black uppercase leading-tight">{t('wordTowerV2.style.readyTitle')}</span>
        <span className="block text-xs font-bold leading-snug">
          {next && toNext === 1
            ? t('wordTowerV2.style.readyNewLook', { name: t(`wordTowerV2.style.name.${next.id}`) })
            : t('wordTowerV2.style.readyLine')}
        </span>
      </span>
    </m.button>
  );
}
