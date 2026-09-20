'use client';

import { useRef } from 'react';
import { CoinRail } from './CoinRail';
import { ImpactBurst } from './ImpactBurst';
import { MilestoneBurst } from './MilestoneBurst';
import { StreakBar } from './StreakBar';
import type { LandingFx } from './useLandingFx';
import type { RunRewards } from './useRunRewards';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  rewards: RunRewards;
  /** Perfect streak right now. */
  combo: number;
  /** Best streak this run (the meter's ghost fill). */
  bestCombo: number;
  fx: LandingFx;
  /** Points the latest landing scored — the number the burst puts on the block. */
  points: number;
  /** TowerCanvas's own className — the impact overlay must share its box. */
  canvasClass: string;
  /** Desktop/TV side-panel layout. */
  wide?: boolean;
  reducedMotion?: boolean;
}

/**
 * Everything the run pays out while it is being played: the live streak meter
 * at the top of the play area, the impact burst on each landing, the coin
 * counter it feeds, and the milestone bursts. One layer so the play area stays
 * clear — nothing here sits over the tower top.
 */
export function RewardsLayer({ t, rewards, combo, bestCombo, fx, points, canvasClass, wide, reducedMotion }: Props) {
  const counterRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <StreakBar t={t} combo={combo} bestCombo={bestCombo} canvasClass={canvasClass} wide={wide} reducedMotion={reducedMotion} />
      <CoinRail t={t} coins={rewards.coins} counterRef={counterRef} wide={wide} reducedMotion={reducedMotion} />
      <ImpactBurst t={t} fx={fx} points={points} counterRef={counterRef} canvasClass={canvasClass} reducedMotion={reducedMotion} />
      <MilestoneBurst t={t} milestone={rewards.milestone} onDone={rewards.clearMilestone} wide={wide} reducedMotion={reducedMotion} />
    </>
  );
}
