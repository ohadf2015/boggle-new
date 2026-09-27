'use client';

import type { RefObject } from 'react';
import { ImpactBurst } from './ImpactBurst';
import { MilestoneBurst } from './MilestoneBurst';
import type { LandingFx } from './useLandingFx';
import type { RunRewards } from './useRunRewards';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  rewards: RunRewards;
  fx: LandingFx;
  /** Points the latest landing scored — the number the burst puts on the block. */
  points: number;
  /** TowerCanvas's own className — the impact overlay must share its box. */
  canvasClass: string;
  /** The coin chip in the top bar: ImpactBurst flies its coins into it. */
  counterRef: RefObject<HTMLDivElement | null>;
  /** Desktop/TV side-panel layout. */
  wide?: boolean;
  reducedMotion?: boolean;
}

/**
 * Everything the run pays out while it is being played: the impact burst on
 * each landing and the milestone bursts. The streak meter and the coin counter
 * they feed now live in V2TopBar — one HUD row, not four floating layers.
 */
export function RewardsLayer({ t, rewards, fx, points, canvasClass, counterRef, wide, reducedMotion }: Props) {
  return (
    <>
      <ImpactBurst t={t} fx={fx} points={points} counterRef={counterRef} canvasClass={canvasClass} reducedMotion={reducedMotion} />
      <MilestoneBurst t={t} milestone={rewards.milestone} onDone={rewards.clearMilestone} wide={wide} reducedMotion={reducedMotion} />
    </>
  );
}
