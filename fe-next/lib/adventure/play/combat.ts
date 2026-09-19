/**
 * Adventure combat (elite + boss levels) — a pure, seeded reducer. No React.
 *
 * The enemy telegraphs an attack (countdown), then it lands. The player
 * answers with words (damage; 5+ letters = +1 shield, and interrupts a
 * telegraph), SHIELD taps (block the next hit), tile taps (cleanse
 * freeze/curse), projectile swipes, and potions. Boss phases at 66% / 33%
 * enemy HP switch the attack set. `fx` lists what happened in the LAST step
 * so the UI can play juice without diffing state.
 *
 * Damage to the enemy is the relic-modified word score — the same number the
 * server settles — so the fight can never disagree with the verdict.
 */
import { nextRandom, hashSeed } from './rng';
import {
  startShields, effectDurationMult, healsOnLongWord, hasRevive,
  POTION_HEAL, POTION_STUN_MS, type RelicId, type PotionId,
} from './relics';
import { WORLD_SCRIPTS } from './enemyScripts';

export type AttackEffect = 'hit' | 'freeze' | 'curse' | 'projectile' | 'shuffle' | 'drain';

export interface Attack {
  id: string;
  effect: AttackEffect;
  /** HP the player loses (curse: on expiry if left uncleansed). */
  damage: number;
  telegraphMs: number;
  /** freeze / curse: how many tiles. */
  tiles?: number;
}

/** A boss's one-sentence rule twist (Balatro boss-blind style), as knobs on the reducer. */
export interface BossRules {
  /** Projectiles per projectile attack. */
  volley?: number;
  /** HP an uncleansed curse takes when it expires. */
  curseBite?: number;
  /** Extra tiles on every freeze / curse. */
  extraTiles?: number;
  /** Scramble (blind) duration multiplier. */
  blindMult?: number;
  /** Min word length that charges a shield (default 5). */
  shieldLen?: number;
  /** Min word length that interrupts a telegraph (default 5). */
  interruptLen?: number;
}

export interface EnemyScript {
  id: string;
  rules?: BossRules;
  /** Gap between one attack landing and the next telegraph (phase 0). */
  cadenceMs: number;
  /** When the FIRST telegraph starts (defaults to cadenceMs) — short, so every fight teaches the loop. */
  openingMs?: number;
  /** Attack sets for HP > 66%, 66–33%, < 33%. */
  phases: [Attack[], Attack[], Attack[]];
}

export interface TileEffect { kind: 'freeze' | 'curse'; key: string; until: number }
export interface Projectile { id: number; damage: number; landsAt: number }

export type CombatEvent =
  | { type: 'tick'; dt: number }
  | { type: 'word'; word: string; points: number }
  | { type: 'tapShield' }
  | { type: 'tapTile'; key: string }
  | { type: 'swipeProjectile'; id: number }
  | { type: 'potion'; id: PotionId };

export type CombatFx =
  | 'telegraph' | 'hit' | 'blocked' | 'interrupt' | 'phase' | 'freeze' | 'curse' | 'projectile'
  | 'deflect' | 'shuffle' | 'drain' | 'revive' | 'death' | 'defeated' | 'damage' | 'shield'
  | 'cleanse' | 'heal' | 'thaw' | 'guard';

export interface CombatState {
  script: EnemyScript;
  now: number;
  rng: number;
  size: number;
  hp: number;
  maxHp: number;
  shields: number;
  /** A raised shield: absorbs the next damaging attack until `guardUntil`. */
  guard: boolean;
  guardUntil: number;
  enemyHp: number;
  enemyMaxHp: number;
  phase: 0 | 1 | 2;
  telegraph: { attack: Attack; startedAt: number; endsAt: number } | null;
  nextAttackAt: number;
  stunnedUntil: number;
  tiles: TileEffect[];
  projectiles: Projectile[];
  nextProjectileId: number;
  /** Board scrambled (visual only — the server board never changes) until this time. */
  blindUntil: number;
  effectMult: number;
  vampire: boolean;
  canRevive: boolean;
  revived: boolean;
  dead: boolean;
  defeated: boolean;
  /** The finishing blow (set once, on defeat) — drives the kill banner. */
  kill: KillRecord | null;
  /** Attack id (or 'projectile' / 'curse') that took the last heart. */
  killedBy: string | null;
  fx: CombatFx[];
}

export interface KillRecord { word: string; points: number; overkill: number }

export const MAX_SHIELDS = 3;
export const PROJECTILE_MS = 1800;
export const FREEZE_MS = 4000;
export const CURSE_MS = 6000;
export const BLIND_MS = 2500;
export const STAGGER_MS = 1500;
export const PHASE_PAUSE_MS = 1200;
/** How long a raised shield stays up when nothing is incoming — shield is a timing action. */
export const GUARD_MS = 1500;
/** A shield raised mid-telegraph stays up until just after that attack lands. */
const GUARD_GRACE_MS = 250;
const LONG_WORD = 5;
const PHASE_SPEED = [1, 0.85, 0.7] as const;

export function enemyScript(enemyId: string): EnemyScript {
  const m = /^(boss|elite)-w(\d+)$/.exec(enemyId);
  const world = m ? Math.min(10, Math.max(1, Number(m[2]))) : 1;
  const w = WORLD_SCRIPTS[world - 1];
  if (m?.[1] === 'elite') {
    return { id: enemyId, cadenceMs: w.eliteCadenceMs, openingMs: Math.round(w.openingMs * 1.2), phases: [w.elite, w.elite, w.elite] };
  }
  return { id: enemyId, cadenceMs: w.cadenceMs, openingMs: w.openingMs, phases: w.boss, ...(w.rules ? { rules: w.rules } : {}) };
}

export interface InitCombat {
  enemyId: string;
  world: number;
  enemyHp: number;
  hp: number;
  maxHp: number;
  relics: readonly RelicId[];
  size: number;
  seed: string;
  /** Test seam / teacher hook: override the enemy's attack script. */
  script?: EnemyScript;
}

export function initCombat(o: InitCombat): CombatState {
  const script = o.script ?? enemyScript(o.enemyId);
  return {
    script, now: 0, rng: hashSeed(`${o.seed}:combat:${o.enemyId}`), size: o.size,
    hp: o.hp, maxHp: o.maxHp, shields: Math.min(MAX_SHIELDS, startShields(o.relics)), guard: false, guardUntil: 0,
    enemyHp: o.enemyHp, enemyMaxHp: o.enemyHp, phase: 0,
    telegraph: null, nextAttackAt: script.openingMs ?? script.cadenceMs, stunnedUntil: 0,
    tiles: [], projectiles: [], nextProjectileId: 1, blindUntil: 0,
    effectMult: effectDurationMult(o.relics), vampire: healsOnLongWord(o.relics),
    canRevive: hasRevive(o.relics), revived: false, dead: false, defeated: false, kill: null, killedBy: null, fx: [],
  };
}

const cadence = (s: CombatState) => Math.round(s.script.cadenceMs * PHASE_SPEED[s.phase]);
const phaseFor = (hp: number, max: number): 0 | 1 | 2 => (hp / max <= 0.33 ? 2 : hp / max <= 0.66 ? 1 : 0);

function roll(s: CombatState): number {
  const [v, next] = nextRandom(s.rng);
  s.rng = next;
  return v;
}

/** Damage the player (guard absorbs it). Handles phoenix + death. Mutates the draft. */
function hurt(s: CombatState, dmg: number, fx: CombatFx, source: string) {
  if (dmg <= 0) return;
  if (s.guard) {
    s.guard = false;
    s.fx.push('blocked');
    return;
  }
  s.hp = Math.max(0, s.hp - dmg);
  s.fx.push(fx);
  if (s.hp > 0) return;
  if (s.canRevive && !s.revived) {
    s.revived = true;
    s.hp = 1;
    s.fx.push('revive');
  } else {
    s.dead = true;
    s.killedBy = source;
    s.telegraph = null;
    s.fx.push('death');
  }
}

function pickTiles(s: CombatState, n: number): string[] {
  const taken = new Set(s.tiles.map((t) => t.key));
  const free: string[] = [];
  for (let r = 0; r < s.size; r++) for (let c = 0; c < s.size; c++) if (!taken.has(`${r}-${c}`)) free.push(`${r}-${c}`);
  const out: string[] = [];
  while (out.length < n && free.length) out.push(free.splice(Math.floor(roll(s) * free.length), 1)[0]);
  return out;
}

function land(s: CombatState, a: Attack) {
  switch (a.effect) {
    case 'hit': hurt(s, a.damage, 'hit', a.id); break;
    case 'drain':
      if (!s.guard) s.shields = Math.max(0, s.shields - 1);
      hurt(s, a.damage, 'drain', a.id);
      break;
    case 'projectile': {
      const n = Math.max(1, s.script.rules?.volley ?? 1);
      // Volleys stagger so each shot is its own tap.
      for (let i = 0; i < n; i++) s.projectiles.push({ id: s.nextProjectileId++, damage: a.damage, landsAt: s.now + PROJECTILE_MS + i * 350 });
      s.fx.push('projectile');
      break;
    }
    case 'freeze':
    case 'curse': {
      const ms = (a.effect === 'freeze' ? FREEZE_MS : CURSE_MS) * s.effectMult;
      for (const key of pickTiles(s, (a.tiles ?? 2) + (s.script.rules?.extraTiles ?? 0))) s.tiles.push({ kind: a.effect, key, until: s.now + ms });
      s.fx.push(a.effect);
      break;
    }
    case 'shuffle':
      s.blindUntil = s.now + BLIND_MS * s.effectMult * (s.script.rules?.blindMult ?? 1);
      s.fx.push('shuffle');
      break;
  }
}

function tick(s: CombatState, dt: number) {
  s.now += Math.max(0, dt);
  if (s.guard && s.now > s.guardUntil) s.guard = false;
  // Tiles expire; an uncleansed curse bites once.
  const expired = s.tiles.filter((t) => t.until <= s.now);
  if (expired.length) {
    s.tiles = s.tiles.filter((t) => t.until > s.now);
    s.fx.push('thaw');
    if (expired.some((t) => t.kind === 'curse')) hurt(s, s.script.rules?.curseBite ?? 1, 'curse', 'curse');
  }
  // Projectiles land.
  for (const p of s.projectiles.filter((x) => x.landsAt <= s.now)) {
    if (s.dead) break;
    hurt(s, p.damage, 'hit', 'projectile');
  }
  s.projectiles = s.projectiles.filter((x) => x.landsAt > s.now);
  if (s.dead) return;

  if (s.telegraph && s.now >= s.telegraph.endsAt) {
    const a = s.telegraph.attack;
    s.telegraph = null;
    land(s, a);
    s.nextAttackAt = s.now + cadence(s);
  } else if (!s.telegraph && s.now >= s.nextAttackAt && s.now >= s.stunnedUntil) {
    const set = s.script.phases[s.phase];
    const attack = set[Math.floor(roll(s) * set.length)];
    s.telegraph = { attack, startedAt: s.now, endsAt: s.now + attack.telegraphMs };
    s.fx.push('telegraph');
  }
}

function word(s: CombatState, w: string, points: number) {
  const len = Array.from(w).length;
  const before = s.enemyHp;
  s.enemyHp = Math.max(0, s.enemyHp - Math.max(0, points));
  s.fx.push('damage');
  const rules = s.script.rules;
  if (len >= (rules?.shieldLen ?? LONG_WORD) && s.shields < MAX_SHIELDS) { s.shields += 1; s.fx.push('shield'); }
  if (len >= (rules?.interruptLen ?? LONG_WORD)) {
    if (s.telegraph) {
      s.telegraph = null;
      s.stunnedUntil = s.now + STAGGER_MS;
      s.nextAttackAt = s.now + STAGGER_MS + cadence(s);
      s.fx.push('interrupt');
    }
  }
  if (s.vampire && len >= 6 && s.hp < s.maxHp) { s.hp += 1; s.fx.push('heal'); }
  if (s.enemyHp <= 0) {
    s.defeated = true;
    s.kill = { word: w, points, overkill: Math.max(0, points - before) };
    s.telegraph = null;
    s.projectiles = [];
    s.tiles = [];
    s.fx.push('defeated');
    return;
  }
  const phase = phaseFor(s.enemyHp, s.enemyMaxHp);
  if (phase > s.phase) {
    s.phase = phase;
    s.telegraph = null;
    s.nextAttackAt = s.now + PHASE_PAUSE_MS;
    s.fx.push('phase');
  }
}

export function step(state: CombatState, event: CombatEvent): CombatState {
  const s: CombatState = { ...state, fx: [], tiles: [...state.tiles], projectiles: [...state.projectiles] };
  if (s.dead || s.defeated) return s;
  switch (event.type) {
    case 'tick': tick(s, event.dt); break;
    case 'word': word(s, event.word, event.points); break;
    case 'tapShield':
      if (s.shields > 0 && !s.guard) {
        s.shields -= 1;
        s.guard = true;
        s.guardUntil = Math.max(s.now + GUARD_MS, s.telegraph ? s.telegraph.endsAt + GUARD_GRACE_MS : 0);
        s.fx.push('guard');
      }
      break;
    case 'tapTile': {
      const before = s.tiles.length;
      s.tiles = s.tiles.filter((t) => t.key !== event.key);
      if (s.tiles.length < before) s.fx.push('cleanse');
      break;
    }
    case 'swipeProjectile': {
      const before = s.projectiles.length;
      s.projectiles = s.projectiles.filter((p) => p.id !== event.id);
      if (s.projectiles.length < before) s.fx.push('deflect');
      break;
    }
    case 'potion':
      if (event.id === 'heal') { s.hp = Math.min(s.maxHp, s.hp + POTION_HEAL); s.fx.push('heal'); }
      if (event.id === 'cleanse') {
        s.tiles = [];
        s.blindUntil = 0;
        s.telegraph = null;
        s.stunnedUntil = s.now + POTION_STUN_MS;
        s.nextAttackAt = Math.max(s.nextAttackAt, s.stunnedUntil);
        s.fx.push('cleanse');
      }
      break;
  }
  return s;
}

/** Tiles the board must treat as unusable right now (frozen or cursed). */
export const blockedTiles = (s: CombatState | null) => new Set((s?.tiles ?? []).map((t) => t.key));
