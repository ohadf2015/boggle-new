'use client';

import { ChevronLeft, ChevronRight, Hammer } from 'lucide-react';
import { type Estate, upgradeCost } from '@/lib/wordTowerV2/estate';
import { MAX_PLOT_LEVEL } from '@/lib/wordTowerV2/estateCatalog';
import { ITEM, whatsNew } from '../estate/estateArt';
import { formatHudCount } from './hudFormat';

type T = (key: string, params?: Record<string, string | number>) => string;

/** Cheapest upgrade still open (not maxed, not waiting on a repair), or null. */
export function cheapestUpgrade(estate: Estate): number | null {
  let best: number | null = null;
  for (const p of estate.plots ?? []) {
    if (p.level >= MAX_PLOT_LEVEL || p.damaged) continue;
    const cost = upgradeCost(estate.district || 1, p.slot, p.level);
    if (best === null || cost < best) best = cost;
  }
  return best;
}

/** The one line the workshop card says, most urgent first. */
export function workshopLine(t: T, estate: Estate, raids: number): { text: string; ready: number; tone: 'ready' | 'repair' | 'saving' | 'done' } {
  const news = whatsNew(estate, raids);
  const ready = news.affordable.length;
  if (ready > 0) {
    return {
      text: ready === 1 ? t('wordTowerV2.hud.sheet.workshopReadyOne') : t('wordTowerV2.hud.sheet.workshopReady', { n: ready }),
      ready,
      tone: 'ready',
    };
  }
  if (news.damaged.length > 0) return { text: t('wordTowerV2.hud.sheet.workshopRepair'), ready: 0, tone: 'repair' };
  const next = cheapestUpgrade(estate);
  if (next === null) return { text: t('wordTowerV2.hud.sheet.workshopDone'), ready: 0, tone: 'done' };
  return { text: t('wordTowerV2.hud.sheet.workshopNext', { n: formatHudCount(next) }), ready: 0, tone: 'saving' };
}

const Chevron = ({ className }: { className: string }) => (
  <>
    <ChevronRight className={`${className} rtl:hidden`} aria-hidden />
    <ChevronLeft className={`${className} hidden rtl:block`} aria-hidden />
  </>
);

interface WorkshopProps {
  t: T;
  estate: Estate;
  raids: number;
  onOpen: () => void;
}

/**
 * Upgrades are the long game, so the workshop is a card that says what is
 * waiting there ("2 upgrades ready to build", "next upgrade: 900 coins")
 * instead of a plain row with an unexplained number badge.
 */
export function WorkshopCard({ t, estate, raids, onOpen }: WorkshopProps) {
  const line = workshopLine(t, estate, raids);
  const hot = line.tone === 'ready' || line.tone === 'repair';
  return (
    <button
      type="button"
      data-wt2-workshop-card={line.tone}
      onClick={onOpen}
      aria-label={t('wordTowerV2.estate.open')}
      className={`flex w-full items-center gap-3 rounded-neo border-neo-thick border-black p-3 text-start text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed ${
        hot ? 'bg-neo-lime' : 'bg-neo-cream'
      }`}
    >
      <span
        aria-hidden
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-yellow shadow-hard-sm"
      >
        <Hammer className="h-6 w-6" />
        {line.ready > 0 ? (
          <span className="absolute -end-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-black bg-neo-pink px-1 font-neo-display text-xs font-black tabular-nums">
            {line.ready}
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-neo-display text-base font-black uppercase">{t('wordTowerV2.estate.title')}</span>
          <span className="ms-auto flex shrink-0 items-center gap-1 font-neo-display text-xs font-black tabular-nums">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ITEM.coin} alt="" aria-hidden className="h-4 w-4" />
            {formatHudCount(estate.coins ?? 0)}
          </span>
        </span>
        <span data-wt2-workshop-line className="mt-0.5 block text-sm font-bold leading-snug">
          {line.text}
        </span>
      </span>
      <Chevron className="h-5 w-5 shrink-0" />
    </button>
  );
}

interface RivalsProps {
  t: T;
  balls: number;
  onOpen: () => void;
}

/** Rivals: what you can do there, and how many wrecking balls you hold to do it. */
export function RivalsCard({ t, balls, onOpen }: RivalsProps) {
  const line =
    balls > 1
      ? t('wordTowerV2.hud.sheet.rivalsBalls', { n: balls })
      : balls === 1
        ? t('wordTowerV2.hud.sheet.rivalsBallsOne')
        : t('wordTowerV2.hud.sheet.rivalsNone');
  return (
    <button
      type="button"
      data-wt2-open-rivals
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-neo border-neo-thick border-black bg-neo-pink p-3 text-start text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
    >
      <span
        aria-hidden
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-navy text-2xl shadow-hard-sm"
      >
        ⚒️
        {balls > 0 ? (
          <span className="absolute -end-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-black bg-neo-yellow px-1 font-neo-display text-xs font-black tabular-nums text-neo-navy">
            {balls}
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-neo-display text-base font-black uppercase">{t('wordTowerV2.dailyTower.openRivals')}</span>
        <span
          className="mt-0.5 block text-sm font-bold leading-snug"
          aria-label={balls > 0 ? t('wordTowerV2.wreck.balls', { n: balls }) : undefined}
        >
          {line}
        </span>
      </span>
      <Chevron className="h-5 w-5 shrink-0" />
    </button>
  );
}
