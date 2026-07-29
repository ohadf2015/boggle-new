/**
 * Word Tower — whole-game feature gate (pure config + resolver).
 *
 * The ENTIRE Word Tower mode sits behind one flag (not per-mechanic): flip
 * `word-tower` in PostHog to roll the game out (or kill it) without a deploy. A
 * `?word-tower=1|0` URL override always wins so the founder can live-verify on a
 * real device. Admin access is handled separately at the route (admins always in).
 */

interface GameFlagConfig {
  /** PostHog flag key. */
  key: string;
  /** `?<query>=1|0` URL override for live-verify. */
  query: string;
  /** Value when PostHog is unavailable / no override (off → admins only). */
  default: boolean;
}

export const WORD_TOWER_GAME_FLAG: GameFlagConfig = {
  key: 'word-tower',
  query: 'word-tower',
  default: false,
};

/** A boolean override from the URL query string, or undefined when not present. */
export function flagFromQuery(search: string, param: string): boolean | undefined {
  const v = new URLSearchParams(search).get(param);
  if (v === null) return undefined;
  return v === '1' || v === 'true' || v === 'on';
}

/** Resolve whether the Word Tower game is enabled: a URL override wins, else the
 *  (PostHog-sourced) flag value. */
export function resolveWordTowerEnabled(posthogValue: boolean, search: string): boolean {
  return flagFromQuery(search, WORD_TOWER_GAME_FLAG.query) ?? posthogValue;
}
