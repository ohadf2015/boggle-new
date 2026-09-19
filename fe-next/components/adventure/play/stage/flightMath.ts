/**
 * Pure helpers for the attack that LEAVES the enemy's body: where it flies,
 * when it is released (so it lands on the reducer's beat), which sprite it is,
 * and the one-line consequence stamped under the hit banner. No React.
 */
import type { AttackEffect, CombatState } from '@/lib/adventure/play/combat';
import type { StatusId } from './combatView';

/** Flight time of a released attack; it lands exactly when the reducer lands it. */
export const TRAVEL_MS = 650;

export type FlightTarget = 'hearts' | 'board';

export function flightTarget(effect: AttackEffect): FlightTarget | null {
  if (effect === 'projectile') return null; // the shots themselves fly (BoardHazards)
  return effect === 'hit' || effect === 'drain' ? 'hearts' : 'board';
}

const FX = '/images/adventure/fx';
export function missileArt(effect: AttackEffect): string {
  if (effect === 'freeze') return `${FX}/ice-shard.webp`;
  if (effect === 'curse' || effect === 'shuffle') return `${FX}/curse-glyph.webp`;
  return `${FX}/fireball.webp`;
}

/** ms from `now` until the missile must leave the enemy, or null when nothing is winding up. */
export function releaseDelay(s: CombatState): number | null {
  if (!s.telegraph) return null;
  return Math.max(0, s.telegraph.endsAt - s.now - TRAVEL_MS);
}

export interface Consequence { key: string; count: number }

/** The sentence under a player-side hit banner ("3 tiles frozen. Tap to thaw!"). */
export function consequence(status: StatusId, s: CombatState, heartsLost = 1): Consequence | null {
  const k = (id: string, count: number) => ({ key: `adventurePlay.combat.consequence.${id}`, count });
  switch (status) {
    case 'freeze':
    case 'curse':
      return k(status, s.tiles.filter((t) => t.kind === status).length);
    case 'hit': return k('hit', heartsLost);
    case 'drain': return k('drain', heartsLost);
    case 'shuffle': return k('shuffle', 0);
    case 'blocked': return k('blocked', 0);
    default: return null;
  }
}

interface Pt { x: number; y: number }

/** Keyframes for a lobbed shot: start → a peak above the midpoint → end. */
export function arcPoints(from: Pt, to: Pt, steps = 8): { xs: number[]; ys: number[] } {
  const lift = Math.max(110, Math.abs(to.x - from.x) * 0.5 + 60);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    xs.push(Math.round(from.x + (to.x - from.x) * p));
    ys.push(Math.round(from.y + (to.y - from.y) * p - lift * 4 * p * (1 - p)));
  }
  return { xs, ys };
}
