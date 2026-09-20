'use client';

import { ChestReveal } from './ChestReveal';
import { RewardsLayer } from './RewardsLayer';
import type { RewardsFlow } from './useRewardsFlow';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  flow: RewardsFlow;
  /** Perfect streak right now. */
  combo: number;
  /** Best streak this run (the meter's ghost fill). */
  bestCombo: number;
  /** Points the latest landing scored (`game.callout`), shown ON the block. */
  points: number;
  /** Another full-screen surface is up (smash round, district): stay out of it. */
  hideInRun?: boolean;
  /** The run is over and the tower has finished falling: reveal the chest. */
  showChest?: boolean;
  /** TowerCanvas's own className — the impact overlay shares its box. */
  canvasClass: string;
  /** Desktop/TV: the wheel is in a side panel. */
  wide?: boolean;
  reducedMotion?: boolean;
}

/** The whole reward loop on screen: the in-run rail and the end-of-run chest. */
export function RunRewards({ t, flow, combo, bestCombo, points, canvasClass, hideInRun, showChest, wide, reducedMotion }: Props) {
  return (
    <>
      {hideInRun ? null : (
        <RewardsLayer
          t={t}
          rewards={flow.rewards}
          combo={combo}
          bestCombo={bestCombo}
          fx={flow.fx}
          points={points}
          canvasClass={canvasClass}
          wide={wide}
          reducedMotion={reducedMotion}
        />
      )}
      {showChest && flow.chest ? (
        <ChestReveal
          t={t}
          coins={flow.chest.coins}
          chest={flow.chest.chest}
          tease={flow.chest.tease}
          guest={flow.chest.guest}
          onSignIn={flow.onSignIn}
          onBeat={flow.onBeat}
          onDone={flow.onDone}
          reducedMotion={reducedMotion}
        />
      ) : null}
    </>
  );
}
