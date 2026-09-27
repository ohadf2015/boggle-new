/**
 * Word Tower — environmental hazards (pure, renderer-agnostic).
 *
 * Founder: "ruin part of the building — maybe a bomb, and higher up a hurricane —
 * and show the player his tower was partially ruined." Hazards strike at FIXED
 * altitudes (deterministic, learnable, fair) above the tutorial zone: a falling
 * bomb low down, escalating to hurricanes up high (orbit/space). Each fires once
 * per climb; crossing one removes the top few floors (see `damageTower`). The loss
 * is always shown — never silent.
 */

// 'wobble' is not an altitude hazard — it's the recoverable Crane Stack topple
// (a bad-drop streak), reusing the same banner/FX path with its own label.
// 'sabotage' is the cross-player wrecking-ball — sent by a rival's perfect
// streak, lands as a single-floor topple with a warning siren beat. Same
// pipeline so the recovery UX is consistent.
export type HazardKind = 'bomb' | 'hurricane' | 'wobble' | 'sabotage';

/** A hazard strike outcome — drives the "your tower was ruined" banner + FX. */
export interface HazardEvent {
  kind: HazardKind;
  /** Floors toppled. */
  removed: number;
  /** Altitude (m) lost. */
  metersLost: number;
}

export interface TowerHazard {
  id: string;
  /** Altitude (m) at which the hazard strikes. */
  atM: number;
  kind: HazardKind;
  /** Floors toppled off the top when it strikes. */
  floors: number;
}

// Spaced so a hazard is a rare spike of drama, not constant punishment. Damage
// grows with altitude (more to lose up high), but stays modest (free re-climb).
export const WORD_TOWER_HAZARDS: TowerHazard[] = [
  { id: 'bomb-160', atM: 160, kind: 'bomb', floors: 1 },
  { id: 'bomb-320', atM: 320, kind: 'bomb', floors: 2 },
  { id: 'storm-520', atM: 520, kind: 'hurricane', floors: 2 },
  { id: 'storm-780', atM: 780, kind: 'hurricane', floors: 3 },
  { id: 'storm-1120', atM: 1120, kind: 'hurricane', floors: 3 },
  { id: 'storm-1550', atM: 1550, kind: 'hurricane', floors: 4 },
  { id: 'storm-2100', atM: 2100, kind: 'hurricane', floors: 4 },
];

/**
 * Hazards struck while the climb rose from `prevM` to `curM` and not already
 * fired this run. Exclusive lower / inclusive upper bound (matches `rivalsPassed`),
 * and `fired` guards against an infinite ruin loop when a damaged tower re-climbs
 * past the same altitude.
 */
export function hazardsCrossed(prevM: number, curM: number, fired: ReadonlySet<string>): TowerHazard[] {
  if (curM <= prevM) return [];
  return WORD_TOWER_HAZARDS.filter((h) => !fired.has(h.id) && h.atM > prevM && h.atM <= curM);
}
