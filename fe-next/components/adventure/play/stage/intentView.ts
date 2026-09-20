/**
 * What the enemy is about to do to you, priced in the units the player pays in.
 * Pure — no React, no Pixi.
 *
 * Slay the Spire's whole combat reads because the intent icon carries the EXACT
 * incoming number. The dial used to show a move name and a countdown only, so a
 * word was never a response to a known threat — it was scoring against a health
 * bar. This module is the number.
 *
 * `Attack.damage` alone is NOT that number: `combat.ts` re-prices two effects at
 * landing time, and both are boss-rule driven.
 *   - a projectile is pushed `rules.volley` times, each for `attack.damage`
 *   - a curse ignores `attack.damage` and bites for `rules.curseBite ?? 1`
 * Reading the raw field would have under-reported world 8's volley of three by
 * two thirds. Everything here mirrors `land()` / `tick()`, and the tests pin it.
 */
import type { Attack, AttackEffect, BossRules, CombatState } from '@/lib/adventure/play/combat';

export interface Threat {
  /** The attack id — also the `adventurePlay.combat.move.*` key. */
  id: string;
  effect: AttackEffect;
  /** Hearts this costs if it lands unblocked. 0 = it only touches the board. */
  damage: number;
  /** Tiles a freeze / curse takes. 0 for everything else. */
  tiles: number;
  /** Shots in the volley (1 unless a boss says otherwise). */
  volley: number;
  heavy: boolean;
}

/** Price one attack the way `land()` will actually resolve it. */
export function threatOf(attack: Attack, rules: BossRules | undefined): Threat {
  const volley = attack.effect === 'projectile' ? Math.max(1, rules?.volley ?? 1) : 1;
  const tiles = attack.effect === 'freeze' || attack.effect === 'curse'
    ? (attack.tiles ?? 2) + (rules?.extraTiles ?? 0)
    : 0;
  // A curse never deals its own damage; it bites on expiry for the rule amount.
  const damage = attack.effect === 'curse'
    ? (rules?.curseBite ?? 1)
    : attack.damage * volley;
  return { id: attack.id, effect: attack.effect, damage, tiles, volley, heavy: attack.id.endsWith('-heavy') };
}

/** Every move this phase can throw, once each, in script order. */
export function phaseThreats(combat: CombatState): Threat[] {
  const moves = combat.script.phases[combat.phase] ?? [];
  const seen = new Set<string>();
  const out: Threat[] = [];
  for (const m of moves) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(threatOf(m, combat.script.rules));
  }
  return out;
}

/** The blow currently winding up, priced — or null when nothing is incoming. */
export function incomingThreat(combat: CombatState): Threat | null {
  return combat.telegraph ? threatOf(combat.telegraph.attack, combat.script.rules) : null;
}

/** Would a raised shield eat this one? Only hits that cost hearts can be blocked. */
export function willBlock(combat: CombatState, threat: Threat | null): boolean {
  return !!threat && threat.damage > 0 && combat.guard;
}

export interface StandingThreat {
  /** The worst move this phase can open with. */
  threat: Threat;
  /** True when every damaging move in the phase costs exactly this much. */
  exact: boolean;
}

/**
 * The threat that stands between wind-ups — the 13 seconds of every 15 in which
 * the player is actually tracing a word.
 *
 * Slay the Spire can name the exact next move because it picks it a turn ahead.
 * `combat.ts` picks at telegraph time, from `rng`, so naming one here would mean
 * re-rolling a die this module does not own and being wrong half the time.
 * Instead: the worst thing the phase can do. When every damaging move costs the
 * same — the common case — that worst case IS the exact number, and `exact`
 * says so, so the UI can drop the "up to" hedge and read like STS.
 */
export function standingThreat(combat: CombatState): StandingThreat | null {
  const damaging = phaseThreats(combat).filter((t) => t.damage > 0);
  if (!damaging.length) return null;
  const threat = damaging.reduce((worst, t) => (t.damage > worst.damage ? t : worst));
  return { threat, exact: damaging.every((t) => t.damage === threat.damage) };
}
