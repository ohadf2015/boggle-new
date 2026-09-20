/**
 * Enemy attack scripts per world — pure data, consumed by combat.ts.
 * Each world has a signature (w1 freeze, w2 projectiles, w3 curses, w4 shuffle,
 * w5 drain, then combinations). Bosses escalate across 3 phases (66% / 33% HP);
 * the elite at L4 previews the world's signature with a single attack set.
 *
 * Curve: every fight opens with a wind-up within ~4.5s (worlds stay short, so a
 * slow opener meant fights with no attacks at all). World 1 is a tutorial (slow
 * wind-ups, 1-heart hits, ~10s gaps); from
 * world 4 heavy attacks hit for 2, from world 8 everything hits harder and the
 * gaps are short. Each boss (w2+) adds ONE rule twist — `BOSS_RULES` — that the
 * UI names in a sentence (`adventurePlay.combat.rule.w<N>`).
 */
import type { Attack, AttackEffect, BossRules } from './combat';

interface WorldScript {
  cadenceMs: number;
  /** First wind-up — a fight that ends in 20s must still show the loop. */
  openingMs: number;
  /** Elites breathe slower than the boss (world 1's elite slowest: it is the first fight). */
  eliteCadenceMs: number;
  elite: Attack[];
  boss: [Attack[], Attack[], Attack[]];
  rules?: BossRules;
}

export const SIGNATURES: AttackEffect[][] = [
  ['freeze'], ['projectile'], ['curse'], ['shuffle'], ['drain'],
  ['freeze', 'projectile'], ['curse', 'shuffle'], ['projectile', 'drain'], ['freeze', 'curse'],
  ['freeze', 'projectile', 'curse', 'shuffle', 'drain'],
];

/** One rule per boss. World 1 teaches the base loop (interrupt) and has none. */
const BOSS_RULES: Record<number, BossRules> = {
  2: { volley: 2 },
  3: { curseBite: 2 },
  4: { blindMult: 2 },
  5: { shieldLen: 6 },
  6: { extraTiles: 1, volley: 2 },
  7: { interruptLen: 6 },
  8: { volley: 3 },
  9: { extraTiles: 2, curseBite: 2 },
  10: { interruptLen: 6, curseBite: 2, volley: 2 },
};

/** Worlds whose boss has a named rule sentence (w1's sentence explains the interrupt). */
export const BOSS_RULE_WORLDS = Array.from({ length: 10 }, (_, i) => i + 1);
export const bossRules = (world: number): BossRules => BOSS_RULES[world] ?? {};

/** The world's signature effect — what the elite (and the boss's opening) leads with. */
export const signatureOf = (world: number): AttackEffect => SIGNATURES[Math.min(10, Math.max(1, world)) - 1][0];

function attack(effect: AttackEffect, world: number, telegraphMs: number, heavy = false): Attack {
  const tiles = effect === 'freeze' || effect === 'curse' ? (heavy ? 3 : 2) + (world >= 6 ? 1 : 0) : undefined;
  const base = world >= 8 ? 2 : 1;
  const damage = effect === 'freeze' || effect === 'shuffle' ? 0
    : effect === 'curse' ? 1
      : heavy && world >= 4 ? base + 1
        : effect === 'projectile' && world >= 7 ? 2 : base;
  return { id: heavy ? `${effect}-heavy` : effect, effect, damage, telegraphMs, ...(tiles ? { tiles } : {}) };
}

function build(world: number): WorldScript {
  const sig = SIGNATURES[world - 1];
  const tele = Math.max(1600, 3600 - (world - 1) * 220);
  const fast = Math.round(tele * 0.8);
  const hit = attack('hit', world, tele);
  const heavy = attack('hit', world, tele + 600, true);
  const gentle = world <= 1;
  const cadenceMs = Math.max(4200, 10500 - (world - 1) * 700);
  return {
    cadenceMs,
    eliteCadenceMs: Math.round(cadenceMs * (gentle ? 2 : 1.6)),
    openingMs: Math.max(2500, 4500 - (world - 1) * 220),
    elite: [hit, attack(sig[0], world, tele)],
    boss: [
      [hit, attack(sig[0], world, tele), ...(gentle ? [attack(sig[0], world, tele)] : [])],
      gentle ? [hit, attack(sig[0], world, tele), heavy] : [hit, heavy, ...sig.map((e) => attack(e, world, tele))],
      gentle ? [heavy, attack(sig[0], world, fast, true), attack(sig[0], world, tele)] : [heavy, ...sig.map((e) => attack(e, world, fast, true))],
    ],
    ...(BOSS_RULES[world] ? { rules: BOSS_RULES[world] } : {}),
  };
}

export const WORLD_SCRIPTS: WorldScript[] = Array.from({ length: 10 }, (_, i) => build(i + 1));
