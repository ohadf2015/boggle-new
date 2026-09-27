import { emptyEstate, raidOutcome } from '@/lib/wordTowerV2/estate';
import type { RivalView } from '../useEstate';

/**
 * What a payback swing is WORTH, stated before the player taps.
 *
 * Round 3's revenge list showed three faces and three buttons, and two of the
 * three rows read "your shield held" — a sentence about what did NOT happen to
 * you, with no word about what hitting back would win. The judge called it out
 * by name: a list "built to look like 3 opportunities" where two of them state
 * no benefit. The bar never does that; its revenge screen is a village full of
 * things worth breaking and a stolen-coins number at the end of every swing.
 *
 * The number here is not invented for the chip. It is `raidOutcome()` — the
 * exact pure function `/api/word-tower/estate/raid` recomputes the payout with —
 * run against what the rival's PUBLIC view already tells us (their district,
 * their plots, whether their shield is up), with their coin pile taken as zero
 * because we are not told it. So the chip advertises the part of the payout
 * that cannot shrink: the scrap the swing banks whatever happens. Their coins,
 * which we cannot see, only ever arrive on top.
 */

export interface RevengePrize {
  /** Their shield is up: the swing breaks that instead of cracking a plot. */
  shielded: boolean;
  /** Coins banked even on a clean miss — the floor the chip may advertise. */
  guaranteed: number;
  /** Coins banked by a perfect swing, their own coins not included. */
  atBestAccuracy: number;
}

type PrizeInput = Pick<RivalView, 'district' | 'plots' | 'shields'>;

function bank(rival: PrizeInput, accuracy: number): number {
  // coins: 0 — their pile is not on the rival view, so nothing here can promise
  // a steal. `raidOutcome` then pays scrap only, which is the honest floor.
  const defender = { ...emptyEstate(), district: rival.district, plots: rival.plots ?? [], shields: rival.shields };
  return raidOutcome({ attackerAccuracy: accuracy, defender, revenge: true }).attackerCoins;
}

export function revengePrize(rival: PrizeInput): RevengePrize {
  return {
    shielded: (rival.shields ?? 0) > 0,
    guaranteed: bank(rival, 0),
    atBestAccuracy: bank(rival, 1),
  };
}
