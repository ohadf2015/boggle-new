'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COIN_TICKS, type RevealBeat, coinTickRate } from '@/lib/wordTowerV2/rewards';

export type ItemBeat = Extract<RevealBeat, { kind: 'item' }>;
export type CoinsBeat = Extract<RevealBeat, { kind: 'coins' }>;

export interface ChestSequence {
  /** The lid has been popped (the tap happened). */
  opened: boolean;
  /** Still rattling — light seeping, nothing spilled yet. */
  rattling: boolean;
  /** The burst beat has started: flood, sparks, shake. */
  popped: boolean;
  coinsShowing: boolean;
  /** Every beat has played; the haul is whole. */
  finished: boolean;
  shownCoins: number;
  totalCoins: number;
  items: ItemBeat[];
  shownItems: ItemBeat[];
  /** The item that just landed — it gets the hit. */
  latestItem: ItemBeat | null;
  open: () => void;
  skip: () => void;
}

interface Args {
  beats: RevealBeat[];
  /** 'open' fires on the tap, then one per beat as it starts. */
  onBeat?: (beat: RevealBeat | 'open') => void;
  /** One call per count-up tick, with a rate that climbs. */
  onCoinTick?: (rate: number) => void;
  reducedMotion?: boolean;
}

/**
 * The reveal's clock: one beat at a time, each announcing itself so the caller
 * can play its sound, and a tap that collapses the rest.
 *
 * Under reduced motion there is nothing to shorten — the rattle, the pop and
 * the count-up ARE the motion — so the tap lands the whole haul at once and the
 * screen goes straight to its final frame.
 */
export function useChestSequence({ beats, onBeat, onCoinTick, reducedMotion }: Args): ChestSequence {
  // `step` = beats started, 0..beats.length; one past the end is finished.
  const [step, setStep] = useState(0);
  const [shownCoins, setShownCoins] = useState(0);

  const coinsBeat = useMemo(() => beats.find((b): b is CoinsBeat => b.kind === 'coins') ?? null, [beats]);
  const totalCoins = coinsBeat?.coins ?? 0;
  const burstAt = useMemo(() => beats.findIndex((b) => b.kind === 'burst'), [beats]);
  const coinsAt = useMemo(() => beats.findIndex((b) => b.kind === 'coins'), [beats]);
  const items = useMemo(() => beats.filter((b): b is ItemBeat => b.kind === 'item'), [beats]);
  const firstItemAt = coinsAt + 1;

  const opened = step > 0;
  const finished = step > beats.length;
  const popped = burstAt >= 0 && step > burstAt;
  const coinsShowing = coinsAt >= 0 && step > coinsAt;
  const rattling = opened && !popped;
  const shownItems = items.filter((_, i) => step > firstItemAt + i);

  // Read inside callbacks, so neither `open` nor `skip` needs `step` in its deps.
  const stepRef = useRef(step);
  stepRef.current = step;
  const beatRef = useRef(onBeat);
  beatRef.current = onBeat;
  const tickRef = useRef(onCoinTick);
  tickRef.current = onCoinTick;

  const open = useCallback(() => {
    if (stepRef.current > 0) return;
    beatRef.current?.('open');
    if (reducedMotion) {
      // No sequence to watch: pay it all now, but still sound the payout — the
      // burst included, because that is where the rarity is HEARD.
      const burst = beats.find((b) => b.kind === 'burst');
      const coins = beats.find((b) => b.kind === 'coins');
      if (burst) beatRef.current?.(burst);
      if (coins) beatRef.current?.(coins);
      setShownCoins(coins?.kind === 'coins' ? coins.coins : 0);
      setStep(beats.length + 1);
      return;
    }
    if (beats[0]) beatRef.current?.(beats[0]);
    setStep(1);
  }, [beats, reducedMotion]);

  const skip = useCallback(() => {
    if (stepRef.current === 0) {
      open();
      return;
    }
    setStep(beats.length + 1);
    setShownCoins(totalCoins);
  }, [beats.length, open, totalCoins]);

  // One beat at a time; each announces itself as it starts.
  useEffect(() => {
    if (step < 1 || step > beats.length) return;
    const beat = beats[step - 1];
    const id = window.setTimeout(() => {
      setStep(step + 1);
      if (beats[step]) beatRef.current?.(beats[step]);
    }, beat.ms);
    return () => window.clearTimeout(id);
  }, [step, beats]);

  // Coins count up the moment their beat starts, with a rising tick ladder.
  useEffect(() => {
    if (!coinsShowing || !coinsBeat) return;
    // `finished` belongs here, not just in the deps: a tap that lands BEFORE
    // the coins beat flips `coinsShowing` on at the same moment, and without
    // this the skip would start the count from zero — slower than not tapping.
    if (reducedMotion || finished) {
      setShownCoins(coinsBeat.coins);
      return;
    }
    const start = performance.now();
    let raf = 0;
    let ticked = 0;
    const tick = () => {
      const k = Math.min(1, (performance.now() - start) / Math.max(1, coinsBeat.countMs));
      setShownCoins(Math.round(coinsBeat.coins * (1 - (1 - k) ** 3)));
      while (ticked < COIN_TICKS && k >= (ticked + 1) / COIN_TICKS) {
        tickRef.current?.(coinTickRate(ticked));
        ticked += 1;
      }
      if (k < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [coinsShowing, coinsBeat, finished, reducedMotion]);

  return {
    opened,
    rattling,
    popped,
    coinsShowing,
    finished,
    shownCoins,
    totalCoins,
    items,
    shownItems,
    latestItem: shownItems.length ? shownItems[shownItems.length - 1] : null,
    open,
    skip,
  };
}
