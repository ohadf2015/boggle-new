/**
 * Single source of truth for the "coins earned" feedback event + the choice of
 * which visual treatment to play.
 *
 * Any code path that grants coins (client OR a server grant the client learns
 * about) should call `emitCoinEarned` so GlobalCoinEarnFx can play the sound +
 * fly the coins. Server RPC grants (chests, missions, Word-of-the-Day, …) do
 * NOT fire this automatically — the receiving component must emit it.
 */

export const COIN_EARNED_EVENT = 'lexiclash:coin-earned';
export const COIN_SPENT_EVENT = 'lexiclash:coin-spent';

export interface CoinEarnedDetail {
  amount: number;
  source?: { x: number; y: number };
  /** The on-screen counter already shows this amount and rolls it as the coins land. */
  inline?: boolean;
  /** How many coins fly (defaults to the reward plan's count for the amount). */
  coins?: number;
  /** A big word: the flight throws a bigger payoff at the source. */
  big?: boolean;
}

export function emitCoinEarned(
  amount: number,
  source?: { x: number; y: number },
  opts?: { inline?: boolean; coins?: number; big?: boolean },
): void {
  if (!(amount > 0)) return;
  if (typeof window === 'undefined') return;
  const detail: CoinEarnedDetail = source ? { amount, source } : { amount };
  if (opts?.inline) detail.inline = true;
  if (opts?.coins) detail.coins = opts.coins;
  if (opts?.big) detail.big = true;
  window.dispatchEvent(new CustomEvent<CoinEarnedDetail>(COIN_EARNED_EVENT, { detail }));
}

/**
 * The mirror of `emitCoinEarned` for spending: GlobalCoinEarnFx plays it in
 * reverse — coins drain OUT of the counter, the total rolls DOWN, and the HUD
 * shows a red "-amount". `source` is where the spend happened (e.g. the buy
 * button), so coins can fly from the counter toward it.
 */
export function emitCoinSpent(amount: number, source?: { x: number; y: number }): void {
  if (!(amount > 0)) return;
  if (typeof window === 'undefined') return;
  const detail: CoinEarnedDetail = source ? { amount, source } : { amount };
  window.dispatchEvent(new CustomEvent<CoinEarnedDetail>(COIN_SPENT_EVENT, { detail }));
}

export type CoinFxMode = 'none' | 'dom';

/** Coins always visibly fly to the wallet; reduced motion is the only opt-out (sound and counter still play). */
export function selectCoinFxMode(opts: { reduced: boolean }): CoinFxMode {
  return opts.reduced ? 'none' : 'dom';
}

/** The wallet counter coins fly into: the first one actually on screen (headers hide theirs during play). */
export function findCoinCounter(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const all = document.querySelectorAll<HTMLElement>('[data-coin-counter="true"]');
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** On-screen areas flying coins must not cover (marked `data-coin-avoid="true"`, e.g. the praise stamp). */
export function findCoinAvoidRects(): Array<{ left: number; top: number; right: number; bottom: number }> {
  if (typeof document === 'undefined') return [];
  return [...document.querySelectorAll<HTMLElement>('[data-coin-avoid="true"]')]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }));
}

let coinsLandAt = 0;

/** Called when coins take off toward the wallet, so counters can hold their roll until they land. */
export function markCoinsInFlight(msUntilLand: number): void {
  coinsLandAt = Math.max(coinsLandAt, performance.now() + msUntilLand);
}

export function msUntilCoinsLand(): number {
  return Math.max(0, Math.round(coinsLandAt - performance.now()));
}
