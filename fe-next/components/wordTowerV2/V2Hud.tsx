'use client';

import { useCallback, useState, type ReactNode, type RefObject } from 'react';
import type { Estate } from '@/lib/wordTowerV2/estate';
import type { RunState } from '@/lib/wordTowerV2/run';
import { V2TopBar } from './V2TopBar';
import { V2HudMenu } from './V2HudMenu';
import { UpgradeReadyToast } from './hud/UpgradeReadyToast';
import { RivalNudgeToast, rivalAhead } from './hud/RivalNudgeToast';
import type { GhostRival } from '@/lib/wordTowerV2/rush/types';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  heightM: number;
  score: number;
  bestM: number;
  run: RunState;
  /** Tenants who have visibly arrived (the HUD never runs ahead of the art). */
  tenants: number;
  estate: Estate;
  /** Coins banked THIS run — added to the bank for display, never stored twice. */
  runCoins: number;
  /** Raids waiting, for the empire badge. */
  raids: number;
  /** ImpactBurst flies its coins into this exact rect. */
  coinsRef: RefObject<HTMLDivElement | null>;
  onOpenEstate: () => void;
  onOpenRivals?: () => void;
  /** Leave the game mid-run. The caller banks the run before navigating. */
  onExit?: () => void;
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
  dailyTarget?: { growthM: number; targetM: number };
  hasTower?: boolean;
  /** Rush widgets; see V2TopBar: `null` reserves the row, `undefined` omits it. */
  rushSlot?: ReactNode;
  /** Progress that is not a decision (the rank card): shown first in the menu, not the bar. */
  menuSlot?: ReactNode;
  /** Shown last in the menu (what each block does). */
  menuFootSlot?: ReactNode;
  /** The rival tower marked in the sky (the next one above you), for wreck suggestions. */
  rival?: GhostRival | null;
  /** Raids on you not answered yet, newest first — the revenge suggestion. */
  raiders?: string[];
}

/**
 * Wrapper for the HUD components: the top bar and the secondary items menu.
 * Owns the menu state and wires up the menu button to open/close the drawer.
 */
export function V2Hud({
  t,
  heightM,
  score,
  bestM,
  run,
  tenants,
  estate,
  runCoins,
  raids,
  coinsRef,
  onOpenEstate,
  onOpenRivals,
  onExit,
  barRef,
  wide,
  reducedMotion,
  daily,
  dailyDateKey,
  dailyDateFormatted,
  dailyTarget,
  hasTower,
  rushSlot,
  menuSlot,
  menuFootSlot,
  rival,
  raiders,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const coins = estate.coins + runCoins;
  const target = rivalAhead(rival, heightM);

  const handleMenuOpen = useCallback(() => {
    setMenuOpen(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <>
      <V2TopBar
        t={t}
        heightM={heightM}
        score={score}
        bestM={bestM}
        run={run}
        coins={coins}
        coinsRef={coinsRef}
        onExit={onExit}
        onMenuOpen={handleMenuOpen}
        barRef={barRef}
        wide={wide}
        reducedMotion={reducedMotion}
        daily={daily}
        dailyDateKey={dailyDateKey}
        dailyDateFormatted={dailyDateFormatted}
        dailyTarget={dailyTarget}
        hasTower={hasTower}
        rushSlot={rushSlot}
      />
      {/* Toasts stack under the bar, so an upgrade and a wrecking ball earned on the same drop never overlap. */}
      <div data-wt2-toasts className="pointer-events-none absolute inset-x-4 top-[calc(var(--wt2-hud,7rem)+0.5rem)] z-40 mx-auto flex max-w-sm flex-col gap-2">
        <UpgradeReadyToast t={t} estate={estate} runCoins={runCoins} reducedMotion={reducedMotion} />
        <RivalNudgeToast t={t} balls={run.balls} target={target} onWreck={onOpenRivals} reducedMotion={reducedMotion} />
      </div>
      <V2HudMenu
        t={t}
        open={menuOpen}
        onClose={handleMenuClose}
        run={run}
        tenants={tenants}
        estate={estate}
        raids={raids}
        onOpenEstate={onOpenEstate}
        onOpenRivals={onOpenRivals}
        reducedMotion={reducedMotion}
        topSlot={menuSlot}
        footSlot={menuFootSlot}
        rivalTarget={target}
        raider={raiders?.[0] ?? null}
      />
    </>
  );
}
