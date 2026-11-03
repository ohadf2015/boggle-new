'use client';

import { memo, type ReactNode, type RefObject } from 'react';
import { m } from 'framer-motion';
import { ArrowLeft, Flag, Menu, Target, Trophy } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { standingFloors } from './dailyRails';
import type { RunState } from '@/lib/wordTowerV2/run';
import { ITEM } from './estate/estateArt';
import { useFloorPop } from './useFloorPop';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { ComboMeter } from './hud/ComboMeter';
import { formatHudCount } from './hud/hudFormat';

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
  /** Daily: metres grown today vs today's goal. */
  dailyTarget?: { growthM: number; targetM: number };
  /** A tower already stands (restored from an earlier day) even if this run built nothing yet. */
  hasTower?: boolean;
  /**
   * Rush widgets (rank meter, next-up queue) in a row under the chip row.
   * `undefined` = no row. Any other value, `null` included, reserves the row's
   * fixed height, so a widget arriving mid-run never moves the measured HUD
   * edge (`--wt2-hud`) and with it the camera.
   */
  rushSlot?: ReactNode;
}

const formatScore = (v: number) => formatHudCount(v);


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
  dailyTarget,
  hasTower,
  rushSlot,
}: Props) {
  const floors = standingFloors(heightM);

  const floorPop = useFloorPop(heightM, reducedMotion);

  return (
    // `pe-12` on BOTH layouts: the global mute FAB is pinned to the same corner
    // at every width, and at 1920x1080 it sat exactly on top of the empire
    // button — the district was unreachable from the game screen.
    <div
      ref={barRef}
      data-wt2-topbar
      className="pointer-events-none absolute start-[calc(var(--wt2-rail,0px)+0.75rem)] end-[calc(var(--wt2-side,0px)+0.75rem)] top-[max(0.5rem,env(safe-area-inset-top))] z-40 flex flex-col gap-1.5"
      aria-live="polite"
    >
      {/* Row 1 — where am I. ONE row, 4 items (5 on daily): exit, height+score, coins, [daily], menu.
          `pe-12` reserves the corner for the global mute FAB.
          NO flex-wrap: width is constrained and items are compact. */}
      <div data-wt2-topbar-row className="@container flex min-w-0 items-start gap-2 pe-[var(--wt2-fab-gap,3rem)]">
        {/* The exit leads the row: an icon AND a word, so it reads as "leave" at a glance.
            Daily: it goes back to the daily hub and the tower is already saved.
            Free tower with floors: it is the cash-out (the run ends, the chest follows). */}
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            data-wt2-exit
            aria-label={
              daily
                ? t('wordTowerV2.dailyTower.exitA11y')
                : run.floors > 0
                  ? t('wordTowerV2.hud.exit')
                  : t('wordTowerV2.results.home')
            }
            className="pointer-events-auto flex h-9 shrink-0 items-center justify-center gap-1 rounded-neo border-neo-thick border-black bg-neo-cream px-2 text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed lg:h-12 lg:px-3"
          >
            {!daily && run.floors > 0 ? (
              <Flag className="h-5 w-5 lg:h-7 lg:w-7" aria-hidden />
            ) : (
              <DirectionalIcon icon={ArrowLeft} className="h-5 w-5 lg:h-7 lg:w-7" />
            )}
            <span className="max-w-[7rem] truncate font-neo-display text-xs font-black uppercase leading-none @max-[22rem]:hidden lg:text-base" aria-hidden>
              {daily
                ? t('wordTowerV2.dailyTower.exitLabel')
                : run.floors > 0
                  ? t('wordTowerV2.dailyTower.finishLabel')
                  : t('wordTowerV2.dailyTower.exitFree')}
            </span>
          </button>
        ) : null}

        {/* Primary: height + score merged. Floor leads — it is an apartment tower. */}
        <div className="flex min-w-0 shrink-0 flex-col gap-0.5">
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
            {floorPop.isActive && floorPop.delta > 0.01 ? (
              <m.span
                key={heightM}
                data-wt2-height-delta
                className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center"
                initial={reducedMotion ? false : { y: 18, opacity: 0, scale: 0.8 }}
                animate={reducedMotion ? undefined : { y: [18, 0, 0], opacity: [0, 1, 0], scale: [0.8, 1.1, 1] }}
                transition={{ duration: 0.6, times: [0, 0.45, 1], ease: 'easeOut' }}
              >
                <span className="whitespace-nowrap rounded-neo border-neo border-black bg-neo-cream px-1 font-neo-display text-xs font-black tabular-nums text-neo-navy shadow-hard-sm lg:text-base">
                  +{floorPop.delta.toFixed(1)}
                  {t('wordTowerV2.unitM')}
                </span>
              </m.span>
            ) : null}
          </div>

          {/* Inline-size containment: this line may run under the coin slot, but never widens the row into the FAB corner. */}
          <div data-wt2-subrow className="flex items-center gap-1 whitespace-nowrap [contain:inline-size]">
            {/* Daily ranks on metres grown, so the goal chip is the number; a second one is clutter. */}
            {!daily ? (
              <div
                data-wt2-score
                className="rounded-neo border-neo border-neo-cream/40 bg-neo-navy/85 px-2 py-0.5 font-neo-display leading-tight tabular-nums"
              >
                <AnimatedCounter value={score} formatValue={formatScore} size="xs" className="font-bold text-neo-cream lg:text-base" />
              </div>
            ) : null}
            {daily && dailyTarget && dailyTarget.targetM > 0 ? (
              <div
                data-wt2-daily-target
                className={`flex items-center gap-0.5 rounded-neo border-neo border-black px-1.5 py-0.5 font-neo-display text-xs font-black leading-tight text-neo-navy shadow-hard-sm lg:text-base ${
                  dailyTarget.growthM >= dailyTarget.targetM ? 'bg-neo-lime' : 'bg-neo-yellow'
                }`}
                aria-label={t('wordTowerV2.dailyTower.targetA11y', { m: dailyTarget.growthM, target: dailyTarget.targetM })}
              >
                <Target className="h-2.5 w-2.5 lg:h-3 lg:w-3" aria-hidden />
                <span aria-hidden className="tabular-nums">
                  {Math.min(dailyTarget.growthM, dailyTarget.targetM)}/{dailyTarget.targetM}
                  {t('wordTowerV2.unitM')}
                </span>
              </div>
            ) : null}
            {!daily && bestM > 0.5 ? (
              <div
                data-wt2-best={heightM > bestM ? 'beaten' : 'chasing'}
                className={`flex items-center gap-0.5 rounded-neo border-neo border-black px-1 font-neo-display text-[9px] font-bold leading-tight tabular-nums text-neo-navy shadow-hard-sm lg:text-xs ${
                  heightM > bestM ? 'bg-neo-lime ring-2 ring-neo-pink' : 'bg-neo-yellow'
                }`}
                aria-label={t('wordTower.hud.best', { m: bestM.toFixed(1) })}
              >
                <Trophy className="h-2.5 w-2.5 lg:h-3 lg:w-3" aria-hidden />
                <span aria-hidden>{bestM.toFixed(1)}</span>
              </div>
            ) : null}
            <ComboMeter combo={run.combo} reducedMotion={reducedMotion} />
          </div>
        </div>

        {/* ONE coin number: the bank plus what this run has banked into it. */}
        <div
          ref={coinsRef}
          className="ms-auto flex shrink-0 items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-yellow px-2 py-1 text-neo-navy shadow-hard lg:px-3"
          aria-label={t('wordTowerV2.coins.run', { n: coins })}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ITEM.coin} alt="" aria-hidden className="h-4 w-4 lg:h-6 lg:w-6" />
          <span className="font-neo-display text-base font-black tabular-nums lg:text-2xl" aria-hidden>
            {formatHudCount(coins)}
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
      {rushSlot !== undefined ? (
        <div data-wt2-rush-slot className="flex h-10 min-w-0 items-center gap-2 lg:h-12">
          {rushSlot}
        </div>
      ) : null}
    </div>
  );
});
