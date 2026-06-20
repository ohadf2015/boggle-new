/**
 * Player ability kit — the RPG "moveset".
 *
 * A boss fight isn't a real RPG fight if only the boss has moves. The player
 * gets a 3-slot ability bar charged by combos:
 *  - smite: burst boss damage (offense payoff for a big combo)
 *  - ward:  auto-block the next boss attack (defense without a qualifying word)
 *  - focus: next valid word crits at 2x (tempo / setup)
 *
 * Pure logic only — the hook layer wraps this with React state and cooldowns.
 */

const A = (k: string) => `adventure.boss.combat.ability.${k}`;

export type PlayerAbilityId = 'smite' | 'ward' | 'focus';

export interface PlayerAbilityDef {
  id: PlayerAbilityId;
  nameKey: string;
  descKey: string;
  /** Lucide icon name (resolved in the UI layer). */
  icon: string;
  /** Charge points required to cast. */
  chargeCost: number;
  /** Color token role for the button accent. */
  accent: 'lime' | 'cyan' | 'pink';
}

export const PLAYER_ABILITIES: PlayerAbilityDef[] = [
  { id: 'smite', nameKey: A('smite.name'), descKey: A('smite.desc'), icon: 'Zap', chargeCost: 2, accent: 'lime' },
  { id: 'ward', nameKey: A('ward.name'), descKey: A('ward.desc'), icon: 'Shield', chargeCost: 2, accent: 'cyan' },
  { id: 'focus', nameKey: A('focus.name'), descKey: A('focus.desc'), icon: 'Target', chargeCost: 2, accent: 'pink' },
];

/** Max charge the player can bank (3 casts worth). */
export const MAX_CHARGE = 6;

export interface AbilityState {
  /** Banked charge points. */
  charge: number;
}

export function createAbilityState(): AbilityState {
  return { charge: 0 };
}

/**
 * Cumulative charge earned at a given peak combo. Non-linear: streaks pay off,
 * so a long combo run is a variable, escalating reward (not flat per-word).
 * 3→1, 6→2, 10→3, 15→4, 21→5, 28→6 (triangular thresholds, capped at MAX_CHARGE).
 */
export function chargesFromCombo(maxCombo: number): number {
  let charges = 0;
  let threshold = 3;
  let step = 3;
  while (maxCombo >= threshold && charges < MAX_CHARGE) {
    charges++;
    threshold += step;
    step++;
  }
  return Math.min(charges, MAX_CHARGE);
}

export function getAbilityDef(id: PlayerAbilityId): PlayerAbilityDef {
  return PLAYER_ABILITIES.find(a => a.id === id)!;
}

export function canCast(state: AbilityState, id: PlayerAbilityId): boolean {
  return state.charge >= getAbilityDef(id).chargeCost;
}

/** Smite burst damage, scaling with world depth. */
export function smiteDamage(world: number): number {
  return 12 + Math.round(world * 6);
}

export type AbilityEffect =
  | { kind: 'smite'; damage: number }
  | { kind: 'ward' }
  | { kind: 'focus' };

export interface CastContext {
  world: number;
}

export interface CastResult {
  state: AbilityState;
  effect: AbilityEffect | null;
}

/** Attempt to cast an ability: spends charge and returns the tactical effect. */
export function castAbility(state: AbilityState, id: PlayerAbilityId, ctx: CastContext): CastResult {
  if (!canCast(state, id)) {
    return { state, effect: null };
  }
  const def = getAbilityDef(id);
  const charge = Math.min(MAX_CHARGE, state.charge) - def.chargeCost;
  const next: AbilityState = { ...state, charge };

  let effect: AbilityEffect;
  switch (id) {
    case 'smite':
      effect = { kind: 'smite', damage: smiteDamage(ctx.world) };
      break;
    case 'ward':
      effect = { kind: 'ward' };
      break;
    case 'focus':
      effect = { kind: 'focus' };
      break;
  }
  return { state: next, effect };
}
