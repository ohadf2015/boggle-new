/**
 * Word Tower — feature flags (pure config + resolver).
 *
 * Every new mechanic ships behind a PostHog flag so it can be rolled out (or
 * killed) without a deploy. Behaviour-changing mechanics default OFF until vetted;
 * harmless polish defaults ON. A `?wt-*` query override always wins, so the
 * founder can live-verify any combination on a real device before rollout.
 */

export interface WordTowerFlags {
  /** Environmental hazards (bomb/hurricane) that topple floors. Risky → default OFF. */
  hazards: boolean;
  /** Next-zone "tease" anticipation chip. Harmless polish → default ON. */
  zoneTease: boolean;
  /** Daily Seed Tower mode. Not GA yet → default OFF. */
  dailyTower: boolean;
}

export type WordTowerFlagName = keyof WordTowerFlags;

interface FlagConfig {
  /** PostHog flag key. */
  key: string;
  /** `?<query>=1|0` URL override for live-verify. */
  query: string;
  /** Value when PostHog is unavailable / no override. */
  default: boolean;
}

export const WORD_TOWER_FLAGS: Record<WordTowerFlagName, FlagConfig> = {
  hazards: { key: 'word-tower-hazards', query: 'wt-hazards', default: false },
  zoneTease: { key: 'word-tower-zone-tease', query: 'wt-tease', default: true },
  dailyTower: { key: 'word-tower-daily', query: 'wt-daily', default: false },
};

/** A boolean override from the URL query string, or undefined when not present. */
export function flagFromQuery(search: string, param: string): boolean | undefined {
  const v = new URLSearchParams(search).get(param);
  if (v === null) return undefined;
  return v === '1' || v === 'true' || v === 'on';
}

/** Resolve a flag: a URL override wins, else the (PostHog-sourced) value. */
export function resolveWordTowerFlag(name: WordTowerFlagName, posthogValue: boolean, search: string): boolean {
  return flagFromQuery(search, WORD_TOWER_FLAGS[name].query) ?? posthogValue;
}
