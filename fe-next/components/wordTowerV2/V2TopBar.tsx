'use client';

import { memo, type RefObject } from 'react';
import { ArrowLeft, Flag, Menu, Trophy } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { floorsAt } from '@/lib/wordTowerV2/biomes';
import type { RunState } from '@/lib/wordTowerV2/run';
import { ITEM } from './estate/estateArt';
import { useFloorPop } from './useFloorPop';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  heightM: number;
  score: number;
  bestM: number;
  run: RunState;
  /** Total coins (bank + run coins). Passed from parent to avoid estate dependency. */
  coins: number;
  /** ImpactBurst flies its coins into this exact rect. */
  coinsRef: RefObject<HTMLDivElement | null>;
  /** Leave the game mid-run. The caller banks the run before navigating. */
  onExit?: () => void;
  /** Open the HUD menu drawer for secondary items. */
  onMenuOpen?: () => void;
  /** The band's element — the camera frames the hanging slab under its bottom edge. */
  barRef?: (el: HTMLDivElement | null) => void;
  /**
   * Desktop/TV. The bar no longer changes shape for it — the mute FAB owns the
   * same corner at every width — but the game screen still passes it, so the
   * prop stays rather than forcing an edit into a file other builders hold.
   */
  wide?: boolean;
  reducedMotion?: boolean;
  /** Daily mode: show the daily badge with this date key (YYYY-MM-DD format). */
  daily?: boolean;
  dailyDateKey?: string;
  /** Formatted date string to display in daily badge (e.g., "25 Sep" or "25 9月"). */
  dailyDateFormatted?: string;
}


/**
 * Word Tower v2's whole top band, in ONE row.
 *
 * It replaces five independently-positioned layers (the HUD column, the empire
 * button, the coin rail, the streak bar, each with its own hand-tuned `top-*`)
 * with a single flex row, so nothing can overlap and the play area keeps its
 * height. `pe-12` reserves the corner the global mute FAB is pinned to.
 *
 * Coins are ONE number — bank plus this run — because two visually identical
 * yellow coin pills two rows apart was the single worst thing in the old HUD.
 */
export const V2TopBar = memo(function V2TopBar({
  t,
  heightM,
  score,
  bestM,
  run,
  coins,
  coinsRef,
  onExit,
  onMenuOpen,
  barRef,
  reducedMotion,
  daily = false,
  dailyDateKey,
  dailyDateFormatted,
}: Props) {
  const floors = Math.floor(floorsAt(heightM) + 0.05);

  const floorPop = useFloorPop(heightM, reducedMotion);

  return (
    // `pe-12` on BOTH layouts: the global mute FAB is pinned to the same corner
    // at every width, and at 1920x1080 it sat exactly on top of the empire
    // button — the district was unreachable from the game screen.
    <div
      ref={barRef}
      data-wt2-topbar
      className="pointer-events-none absolute inset-x-3 top-[max(0.5rem,env(safe-area-inset-top))] z-40 flex flex-col gap-1.5"
      aria-live="polite"
    >
      {/* Row 1 — where am I. ONE row, 4 items (5 on daily): exit, height+score, coins, [daily], menu.
          `pe-12` reserves the corner for the global mute FAB.
          NO flex-wrap: width is constrained and items are compact. */}
      <div data-wt2-topbar-row className="flex items-center gap-2 pe-12">
        {/* The exit leads the row. */}
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            // A standing tower makes this the cash-out (the run ends, the chest follows).
            aria-label={run.floors > 0 ? t('wordTowerV2.hud.exit') : t('wordTowerV2.results.home')}
            className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed lg:h-12 lg:w-12"
          >
            {run.floors > 0 ? <Flag className="h-5 w-5 lg:h-7 lg:w-7" aria-hidden /> : <DirectionalIcon icon={ArrowLeft} className="h-5 w-5 lg:h-7 lg:w-7" />}
          </button>
        ) : null}

        {/* Primary: height + score merged. Floor leads — it is an apartment tower. */}
        <div className="flex shrink-0 flex-col gap-0.5">
          <div
            className={`relative flex shrink-0 items-baseline gap-1.5 rounded-neo border-neo-thick border-black bg-neo-lime px-2.5 py-1 text-neo-navy shadow-hard lg:px-3.5 lg:py-1.5 ${
              floorPop.shouldAnimate ? 'animate-neo-pop' : ''
            }`}
            data-wt2-height-pop
            aria-label={t('wordTowerV2.hud.floorA11y', { n: floors, m: heightM.toFixed(1) })}
          >
            <span className="font-neo-display text-2xl font-black leading-none tabular-nums lg:text-4xl" aria-hidden>
              {floors}
            </span>
            <span className="font-neo-display text-[11px] font-bold tabular-nums opacity-75 lg:text-base" aria-hidden>
              {heightM.toFixed(1)}
              {t('wordTowerV2.unitM')}
            </span>
            {/* Floor reward delta: +Nm above the height chip. */}
            {floorPop.isActive && floorPop.delta > 0.01 ? (
              <span
                data-wt2-height-delta
                className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-neo-display text-xs font-bold text-neo-lime"
              >
                +{floorPop.delta.toFixed(1)}{t('wordTowerV2.unitM')}
              </span>
            ) : null}
          </div>

          {/* Score only (no daily badge here anymore). Best chip if non-daily. */}
          <div className="flex shrink-0 items-center gap-1">
            <div className="rounded-neo border-neo border-neo-cream/40 bg-neo-navy/85 px-2 py-0.5 font-neo-display text-xs font-bold leading-tight tabular-nums text-neo-cream lg:text-base">
              {score.toLocaleString()}
            </div>
            {!daily && bestM > 0.5 ? (
              <div
                className="flex items-center gap-0.5 rounded-neo border-neo border-black bg-neo-yellow px-1 font-neo-display text-[9px] font-bold leading-tight text-neo-navy shadow-hard-sm lg:text-xs"
                aria-label={t('wordTower.hud.best', { m: bestM.toFixed(1) })}
              >
                <Trophy className="h-2.5 w-2.5 lg:h-3 lg:w-3" aria-hidden />
                <span aria-hidden>{bestM.toFixed(1)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* ONE coin number: the bank plus what this run has banked into it. */}
        <div
          ref={coinsRef}
          className="flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-yellow px-2 py-1 text-neo-navy shadow-hard lg:px-3"
          aria-label={t('wordTowerV2.coins.run', { n: coins })}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ITEM.coin} alt="" aria-hidden className="h-4 w-4 lg:h-6 lg:w-6" />
          <span className="font-neo-display text-base font-black tabular-nums lg:text-2xl" aria-hidden>
            {coins.toLocaleString()}
          </span>
        </div>

        {/* Daily badge (direct child, only on daily runs): replaces the trophy. */}
        {daily && dailyDateKey ? (
          <div
            className="rounded-neo border-neo border-black bg-neo-cyan px-1 py-0.5 font-neo-display text-[9px] font-bold leading-tight text-neo-navy shadow-hard-sm lg:text-xs"
            aria-label={t('wordTowerV2.hud.dailyBadge', { date: dailyDateFormatted || '' })}
          >
            <span className="uppercase">{t('wordTowerV2.hud.daily')}</span>
          </div>
        ) : null}

        {/* Menu button: opens drawer with secondary items (streak, effects, estate). */}
        {onMenuOpen ? (
          <button
            type="button"
            onClick={onMenuOpen}
            aria-label={t('wordTowerV2.hud.menu')}
            className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-purple text-neo-cream shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed lg:h-12 lg:w-12"
          >
            <Menu className="h-5 w-5 lg:h-7 lg:w-7" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
});
