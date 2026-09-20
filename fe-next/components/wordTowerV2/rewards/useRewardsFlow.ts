'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChestRoll, RunSummary } from '@/lib/wordTowerV2/estate';
import { type ChestTease, type RevealBeat, chestTease } from '@/lib/wordTowerV2/rewards';
import type { SOUND_EFFECTS } from '@/lib/audio/soundEffectsConfig';
import type { RunState } from '@/lib/wordTowerV2/run';
import type { Phase, useTowerRun } from '../useTowerRun';
import type { UseEstate } from '../useEstate';
import { type LandingFx, useLandingFx } from './useLandingFx';
import { type RunRewards, useRunRewards } from './useRunRewards';
import { towerBlocksFrom, useRunPayout } from './useRunPayout';

type PlaySound = (id: keyof typeof SOUND_EFFECTS, opts?: { volume?: number; rate?: number }) => void;

interface Args {
  game: ReturnType<typeof useTowerRun>;
  estateApi: UseEstate;
  run: RunState;
  heightM: number;
  phase: Phase;
  playSound: PlaySound;
  /** For the guest sign-in nudge. */
  language: string;
}

export interface ChestState {
  coins: number;
  chest: ChestRoll;
  tease: ChestTease | null;
  guest: boolean;
}

export interface RewardsFlow {
  rewards: RunRewards;
  /** Landing bursts — `fx.report` is TowerCanvas's `onLandPoint`. */
  fx: LandingFx;
  /** The chest to reveal, or null (guest offline / report failed / still opening). */
  chest: ChestState | null;
  /** The results screen may take over. */
  resultsReady: boolean;
  onBeat: (beat: RevealBeat | 'open') => void;
  onSignIn: () => void;
  onDone: () => void;
}

/**
 * One hook for the whole reward loop, so the game screen only has to mount it:
 * the in-run coins and streak, the single server report at the end of the run,
 * and the chest reveal that hands over to the results.
 */
export function useRewardsFlow({ game, estateApi, run, heightM, phase, playSound, language }: Args): RewardsFlow {
  const fx = useLandingFx();
  // Arm the burst with the coins this landing paid; TowerCanvas reports WHERE
  // it paid them on its next frame and the two are drawn as one beat.
  const { arm } = fx;
  const onPayout = useCallback(
    (amount: number, crate: boolean, combo: number) => {
      arm(amount, crate, combo);
      playSound(crate ? 'coinCascade' : 'coinCollect', { volume: crate ? 0.55 : 0.35, rate: crate ? 1 : 1.15 });
    },
    [arm, playSound],
  );
  const onMilestone = useCallback(() => playSound('levelUp', { volume: 0.5 }), [playSound]);
  const rewards = useRunRewards({
    run,
    heightM,
    coinMult: estateApi.perks.coinMult,
    district: estateApi.estate.district,
    onPayout,
    onMilestone,
  });

  const { worldRef, labelsRef, peakM } = game;
  // Read during render, spent inside the report effect: the peak is set in the
  // same commit as the collapse.
  const peakRef = useRef(peakM);
  peakRef.current = peakM;
  const readSummary = rewards.getSummary;
  const getSummary = useCallback(
    (): RunSummary => ({ ...readSummary(peakRef.current), tower: towerBlocksFrom(worldRef.current, labelsRef.current) }),
    [readSummary, worldRef, labelsRef],
  );
  const { payout, waiting } = useRunPayout({
    over: phase === 'over',
    ready: estateApi.status !== 'loading',
    getSummary,
    reportRun: estateApi.reportRun,
  });

  const [done, setDone] = useState(false);
  useEffect(() => {
    if (phase !== 'over') setDone(false);
  }, [phase]);

  const onBeat = useCallback(
    (beat: RevealBeat | 'open') => {
      if (beat === 'open') playSound('vaultUnlock');
      else if (beat.kind === 'coins') playSound('coinCascade');
      else if (beat.kind === 'item') playSound('giftReceived');
    },
    [playSound],
  );

  const onSignIn = useCallback(() => {
    window.location.href = `/${language}/login`;
  }, [language]);

  return {
    rewards,
    fx,
    chest:
      payout && !done
        ? { coins: payout.coins, chest: payout.chest, tease: chestTease(payout.summary), guest: !estateApi.authed }
        : null,
    // Nothing banked and nothing in flight: skip the reveal rather than stall the run.
    resultsReady: done || (!payout && !waiting),
    onBeat,
    onSignIn,
    onDone: () => setDone(true),
  };
}
