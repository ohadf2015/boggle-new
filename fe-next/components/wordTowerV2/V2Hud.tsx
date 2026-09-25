'use client';

import { useCallback, useState, type RefObject } from 'react';
import type { Estate } from '@/lib/wordTowerV2/estate';
import type { RunState } from '@/lib/wordTowerV2/run';
import { V2TopBar } from './V2TopBar';
import { V2HudMenu } from './V2HudMenu';

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
  /** 0..1 — how close the standing tower is to going over (StabilityMeter). */
  risk?: number;
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
  risk,
  onExit,
  barRef,
  wide,
  reducedMotion,
  daily,
  dailyDateKey,
  dailyDateFormatted,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const coins = estate.coins + runCoins;

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
        risk={risk}
        onExit={onExit}
        onMenuOpen={handleMenuOpen}
        barRef={barRef}
        wide={wide}
        reducedMotion={reducedMotion}
        daily={daily}
        dailyDateKey={dailyDateKey}
        dailyDateFormatted={dailyDateFormatted}
      />
      <V2HudMenu
        t={t}
        open={menuOpen}
        onClose={handleMenuClose}
        run={run}
        tenants={tenants}
        estate={estate}
        raids={raids}
        onOpenEstate={onOpenEstate}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
