import type { ConnectionPuzzle } from './types';

/** The two real compounds a solved bridge unlocks, shown as the "aha" payoff. */
export interface WhyItWorks {
  /** word1 + bridge compound (e.g. "bookworm"). */
  left: string;
  /** bridge + word2 compound (e.g. "wormhole"). */
  right: string;
}

/**
 * After a solve we reveal *why* the bridge works by showing both real
 * compounds. Closed-compound languages (en/he/sv) concat cleanly, so we derive
 * them; open compounds (Spanish "juego de mesa") need the spelled-out forms, so
 * a stored `examples[0]` wins when present. This turns every solve into a tiny
 * "did you know?" — the talkable moment that fuels sharing.
 */
export function whyItWorks(p: ConnectionPuzzle): WhyItWorks {
  const ex = p.examples?.[0];
  if (ex) return { left: ex.w1, right: ex.w2 };
  return { left: `${p.word1}${p.bridge}`, right: `${p.bridge}${p.word2}` };
}
