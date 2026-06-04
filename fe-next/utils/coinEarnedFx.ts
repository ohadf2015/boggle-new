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

export interface CoinEarnedDetail {
  amount: number;
  source?: { x: number; y: number };
}

export function emitCoinEarned(amount: number, source?: { x: number; y: number }): void {
  if (!(amount > 0)) return;
  if (typeof window === 'undefined') return;
  const detail: CoinEarnedDetail = source ? { amount, source } : { amount };
  window.dispatchEvent(new CustomEvent<CoinEarnedDetail>(COIN_EARNED_EVENT, { detail }));
}

export type CoinFxMode = 'none' | 'webgl' | 'dom';

/**
 * Pick the coin-burst treatment:
 * - reduced motion → 'none' (sound still plays elsewhere)
 * - WebGL FX layer active → 'webgl' (the rich PixiJS stream)
 * - native (where the fullscreen WebGL canvas is disabled to avoid the
 *   Android WebView compositor hole) → 'dom' (lightweight DOM fallback)
 * - otherwise (e.g. low-end web with no FX) → 'none', so we never add cost
 */
export function selectCoinFxMode(opts: {
  reduced: boolean;
  fxActive: boolean;
  native: boolean;
}): CoinFxMode {
  if (opts.reduced) return 'none';
  if (opts.fxActive) return 'webgl';
  if (opts.native) return 'dom';
  return 'none';
}
