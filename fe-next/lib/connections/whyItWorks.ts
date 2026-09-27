import type { ConnectionPuzzle } from './types';

/** The two real compounds a solved bridge unlocks, shown as the "aha" payoff. */
export interface WhyItWorks {
  /** word1 + bridge compound (e.g. "bookworm"). */
  left: string;
  /** bridge + word2 compound (e.g. "wormhole"). */
  right: string;
}

/**
 * Languages whose two-word phrases keep the space. Hebrew was wrongly grouped
 * with the closed-compound languages: a smichut pair is written with a space
 * ("עוגת שוקולד"), so deriving it by concatenation produced "עוגתשוקולד" — a
 * non-word. Reported 2026-08-12: "on vieweing the word in bridge in hebrew
 * there is no space". Only 57 of the 407 Hebrew puzzles ship an examples[]
 * override, so the derived path is what most solves show.
 */
const OPEN_COMPOUND_LANGS = new Set(['he', 'es', 'ru']);

/**
 * After a solve we reveal *why* the bridge works by showing both real
 * compounds. Closed-compound languages (en/sv/ja) concat cleanly, so we derive
 * them; open compounds (Hebrew "עוגת שוקולד", Spanish "juego de mesa") are
 * joined with a space. A stored `examples[0]` still wins when present.
 * This turns every solve into a tiny "did you know?" — the talkable moment
 * that fuels sharing.
 */
export function whyItWorks(p: ConnectionPuzzle, language?: string): WhyItWorks {
  const ex = p.examples?.[0];
  if (ex) return { left: ex.w1, right: ex.w2 };
  const sep = OPEN_COMPOUND_LANGS.has(language ?? '') ? ' ' : '';
  return { left: `${p.word1}${sep}${p.bridge}`, right: `${p.bridge}${sep}${p.word2}` };
}
