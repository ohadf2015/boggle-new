'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ChestRoll, RunSummary } from '@/lib/wordTowerV2/estate';
import { type ChestTease, type RevealBeat, chestTease, tierFx } from '@/lib/wordTowerV2/rewards';
import type { SOUND_EFFECTS } from '@/lib/audio/soundEffectsConfig';
import type { RunState } from '@/lib/wordTowerV2/run';
import type { Phase, useTowerRun } from '../useTowerRun';
import type { UseEstate } from '../useEstate';
import { type LandingFx, useLandingFx } from './useLandingFx';
import { type RunRewards, useRunRewards } from './useRunRewards';
import { PX_PER_M } from '@/lib/wordTowerV2/engine';
import { towerBlocksFrom, useRunPayout } from './useRunPayout';

type PlaySound = (id: keyof typeof SOUND_EFFECTS, opts?: { volume?: number; rate?: number }) => void;

interface Args {
  game: ReturnType<typeof useTowerRun>;
  estateApi: UseEstate;
  run: RunState;
  heightM: number;
  phase: Phase;
  playSound: PlaySound;
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
  onCoinTick: (rate: number) => void;
  onDone: () => void;
  /** Bank a run that is still standing (the player is leaving). Once per run. */
  bank: (keepalive?: boolean) => Promise<void>;
}

/**
 * One hook for the whole reward loop, so the game screen only has to mount it:
 * the in-run coins and streak, the single server report at the end of the run,
 * and the chest reveal that hands over to the results.
 */
export function useRewardsFlow({ game, estateApi, run, heightM, phase, playSound }: Args): RewardsFlow {
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

  const { worldRef, labelsRef } = game;
  // The live world's peak — the number endRun publishes as peakM. Read from the
  // world, not from `peakM`: that is only set at collapse, so a run banked on
  // the way OUT (bank) would have reported the previous run's height.
  const readSummary = rewards.getSummary;
  const getSummary = useCallback(
    (): RunSummary => ({
      ...readSummary(worldRef.current.peakHeightPx / PX_PER_M),
      tower: towerBlocksFrom(worldRef.current, labelsRef.current),
    }),
    [readSummary, worldRef, labelsRef],
  );
  const { payout, waiting, bank } = useRunPayout({
    over: phase === 'over',
    ready: estateApi.status !== 'loading',
    getSummary,
    reportRun: estateApi.reportRun,
  });

  const [done, setDone] = useState(false);
  useEffect(() => {
    if (phase !== 'over') setDone(false);
  }, [phase]);

  /**
   * The reveal's soundtrack. Every beat has a voice — a beat that emitted
   * nothing would be a silent no-op the moment a new kind is added.
   */
  const onBeat = useCallback(
    (beat: RevealBeat | 'open') => {
      if (beat === 'open') {
        playSound('vaultUnlock', { volume: 0.45 });
        return;
      }
      switch (beat.kind) {
        case 'anticipation':
          // The rattle is the unlock already ringing out; a second cue muddies it.
          break;
        case 'burst': {
          const fx = tierFx(beat.tier);
          playSound('chestOpen', { volume: fx.volume });
          // Rarity is heard as well as seen: the top tiers get a second layer.
          if (beat.tier === 'epic') playSound('epicVictory', { volume: fx.volume * 0.7 });
          else if (beat.tier === 'rare') playSound('crownSparkle', { volume: fx.volume * 0.7 });
          break;
        }
        // The coins and the cards are payout sounds too, so they ride the same
        // tier volume as the pop — an epic haul that counted up as quietly as a
        // common would hand half the rarity signal back.
        case 'coins':
          playSound('coinCascade', { volume: tierFx(beat.tier).volume });
          break;
        case 'item':
          playSound('giftReceived', { volume: 0.45 + tierFx(beat.tier).volume * 0.4 });
          break;
      }
    },
    [playSound],
  );

  /** The counter climbing, heard climbing. */
  const onCoinTick = useCallback((rate: number) => playSound('coinCollect', { volume: 0.22, rate }), [playSound]);

  /*
   * No `onSignIn` here on purpose. It used to be
   * `window.location.href = `/${language}/login``, and there IS no
   * `/[locale]/login` route — a guest who took the chest's "sign in for rivals
   * & raids" offer landed on the 404 page having lost the run, the reveal and
   * the guest estate behind it. Signing in belongs in a modal over the reveal
   * (the same `AuthModal` RivalBoard's guest teaser opens), so `RunRewards`
   * owns it and this hook hands out no navigation at all.
   */

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
    onCoinTick,
    onDone: () => setDone(true),
    bank,
  };
}
