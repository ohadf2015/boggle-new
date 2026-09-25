'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { braceCost, nextBracePrice } from '@/lib/wordTowerV2/estate';
import { trackGrowthEvent } from '@/utils/growthTracking';

/**
 * The emergency brace: when the tower starts to wobble the player can steel
 * everything but the top floor in place — for a price. Two ways to pay:
 *
 *  - COINS off this run's earnings (doubling each time: 40, 80, 160 …), with
 *    the first few free if the Steel Braces upgrade is built. Paid braces
 *    travel in the RunSummary and the SERVER charges them (runCoins).
 *  - A RESCUE WORD: spell a long word before the clock runs out. Free, but a
 *    real skill check under pressure — the tower keeps rocking while you spell,
 *    and each rescue asks for a longer word.
 */

export const RESCUE_MS = 12_000;
export const MAX_RESCUES = 2;
/** The stability meter's "wobbly" band: below it there is nothing to rescue. */
const OFFER_RISK = 0.35;

/** Coins `paid` braces have cost this run. */
export function bracesSpent(paid: number, district: number): number {
  let total = 0;
  for (let n = 1; n <= paid; n += 1) total += braceCost(n, district);
  return total;
}

/** Letters the next rescue word needs. */
export const rescueMinLen = (rescuesUsed: number) => 5 + rescuesUsed;

export type RescueReject = 'rescue_short' | 'not_in_dictionary';

interface Args {
  /** useTowerRun.brace — false when there was nothing to brace. */
  brace: (paid: boolean) => boolean;
  freeBraces: number;
  district: number;
  /** Coins this run has earned so far (the in-run preview). */
  runCoins: number;
  floors: number;
  risk: number;
  over: boolean;
  onReject: (reason: RescueReject) => void;
}

export interface Rescue {
  minLen: number;
  until: number;
}

export function useBrace({ brace, freeBraces, district, runCoins, floors, risk, over, onReject }: Args) {
  const [used, setUsed] = useState(0);
  const [paid, setPaid] = useState(0);
  const [rescuesUsed, setRescuesUsed] = useState(0);
  const [rescue, setRescue] = useState<Rescue | null>(null);
  const timer = useRef(0);

  // A new run (floors back to 0) starts with a clean slate.
  useEffect(() => {
    if (floors !== 0) return;
    setUsed(0);
    setPaid(0);
    setRescuesUsed(0);
  }, [floors]);

  const endRescue = useCallback(() => {
    window.clearTimeout(timer.current);
    setRescue(null);
  }, []);
  useEffect(() => {
    if (over) endRescue();
  }, [over, endRescue]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const price = nextBracePrice(used, freeBraces, district);
  const spent = bracesSpent(paid, district);
  const affordable = price === 0 || runCoins - spent >= price;

  const buy = useCallback(() => {
    if (!affordable || over) return;
    const charged = price > 0;
    if (!brace(charged)) return;
    setUsed((u) => u + 1);
    if (charged) {
      setPaid((p) => p + 1);
      trackGrowthEvent('wt2_continue_used', { cost: price });
    }
  }, [affordable, over, price, brace]);

  const startRescue = useCallback(() => {
    if (rescue || over || rescuesUsed >= MAX_RESCUES) return;
    setRescue({ minLen: rescueMinLen(rescuesUsed), until: Date.now() + RESCUE_MS });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRescue(null), RESCUE_MS);
  }, [rescue, over, rescuesUsed]);

  /** True when the rescue took this submit (the caller must not hoist the word). */
  const submitRescue = useCallback(
    (word: string, valid: boolean): boolean => {
      if (!rescue) return false;
      if (!valid) onReject('not_in_dictionary');
      else if (word.length < rescue.minLen) onReject('rescue_short');
      else {
        brace(false);
        setRescuesUsed((n) => n + 1);
        endRescue();
      }
      return true;
    },
    [rescue, onReject, brace, endRescue],
  );

  return {
    offered: !over && floors >= 2 && risk >= OFFER_RISK,
    price,
    affordable,
    spent,
    buy,
    rescue,
    rescuesLeft: MAX_RESCUES - rescuesUsed,
    startRescue,
    submitRescue,
    cancelRescue: endRescue,
  };
}
