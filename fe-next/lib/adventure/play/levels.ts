/**
 * Adventure level table — pure, shared by client (HUD) and server (scoring).
 * 10 worlds x 7 levels. A world is a roguelike run; L4 is always an elite
 * fight and L7 the world boss. Each world introduces ONE new twist.
 *
 * The DESIGN (kind + twist per slot) is hand-authored data in WORLD_ROWS;
 * the NUMBERS (thresholds, HP) come from one curve so escalation stays monotonic.
 * Teacher hook: this table is data — a lesson can swap rows without code.
 */

export const WORLD_COUNT = 10;
export const LEVELS_PER_WORLD = 7;
export const BOSS_LEVEL = 7;
export const ELITE_LEVEL = 4;

export type LevelKind = 'classic' | 'hunt' | 'chain' | 'fog' | 'bomb' | 'elite' | 'boss';
export type LevelTwist =
  | 'hunt' | 'chain' | 'fog' | 'bomb' | 'long-words'
  | 'rush' | 'grand-hunt' | 'ambush' | 'blackout' | 'finale';

export interface LevelSpec {
  kind: LevelKind;
  size: number;
  seconds: number;
  minLength: number;
  stars: [number, number, number];
  enemyHp?: number;
  enemyId?: string;
  huntCount?: number;
  /** The world's new rule, set on every level that uses it (drives intro cards). */
  twist?: LevelTwist;
}

export interface PlayLevel extends LevelSpec {
  world: number;
  level: number;
  isBoss: boolean;
  /** Combat kinds (elite + boss): same as enemyHp. 0 otherwise. Kept for back-compat. */
  bossHp: number;
}

export const isCombatKind = (k: LevelKind) => k === 'elite' || k === 'boss';

/** [kind, twist?] per slot. `+` suffix = this level applies the world twist. */
type Slot = LevelKind | `${LevelKind}+`;
const WORLD_ROWS: Array<{ twist: LevelTwist; slots: Slot[] }> = [
  /* 1 Meadow   */ { twist: 'hunt', slots: ['classic', 'hunt+', 'classic', 'elite', 'classic', 'hunt+', 'boss'] },
  /* 2          */ { twist: 'chain', slots: ['classic', 'chain+', 'hunt', 'elite', 'chain+', 'classic', 'boss'] },
  /* 3          */ { twist: 'fog', slots: ['fog+', 'classic', 'chain', 'elite', 'fog+', 'hunt', 'boss'] },
  /* 4 (5x5)    */ { twist: 'bomb', slots: ['classic', 'bomb+', 'fog', 'elite', 'bomb+', 'chain', 'boss'] },
  /* 5          */ { twist: 'long-words', slots: ['classic+', 'hunt', 'bomb', 'elite', 'classic+', 'fog+', 'boss'] },
  /* 6          */ { twist: 'rush', slots: ['classic+', 'chain', 'fog+', 'elite', 'bomb+', 'hunt', 'boss'] },
  /* 7          */ { twist: 'grand-hunt', slots: ['hunt+', 'classic', 'chain', 'elite', 'hunt+', 'bomb', 'boss'] },
  /* 8          */ { twist: 'ambush', slots: ['classic', 'elite+', 'fog', 'elite', 'chain', 'bomb', 'boss'] },
  /* 9          */ { twist: 'blackout', slots: ['fog+', 'bomb', 'chain', 'elite', 'fog+', 'hunt', 'boss'] },
  /* 10 Finale  */ { twist: 'finale', slots: ['chain+', 'bomb+', 'hunt+', 'elite', 'fog+', 'classic+', 'boss'] },
];

// ponytail: curve multipliers are first guesses; retune from beta run data.
const KIND_STAR_MULT: Record<LevelKind, number> = {
  classic: 1, hunt: 0.7, chain: 0.6, fog: 0.8, bomb: 0.85, elite: 1, boss: 1,
};
const KIND_SECONDS: Record<LevelKind, number> = {
  classic: 90, hunt: 90, chain: 100, fog: 90, bomb: 90, elite: 100, boss: 120,
};

const r5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

function buildSpec(world: number, level: number, slot: Slot, worldTwist: LevelTwist): LevelSpec {
  const twisted = slot.endsWith('+');
  const kind = slot.replace('+', '') as LevelKind;
  const twist = twisted ? worldTwist : undefined;

  let size = world <= 3 ? 4 : 5;
  if (twist === 'grand-hunt') size = 6;
  const sizeFactor = size === 6 ? 2 : size === 5 ? 1.5 : 1;

  const minLength = twist === 'long-words' || twist === 'blackout' || twist === 'finale' ? 4 : 3;
  let seconds = KIND_SECONDS[kind];
  if (twist === 'rush') seconds = 60;
  if (twist === 'finale') seconds = 75;

  const one = (60 + (world - 1) * 12 + (level - 1) * 8) * sizeFactor;
  let mult = KIND_STAR_MULT[kind];
  if (minLength > 3) mult *= 0.9;
  if (seconds < 90) mult *= seconds / 90;
  const s1 = r5(one * mult);
  const stars: [number, number, number] = [s1, r5(s1 * 1.8), r5(s1 * 2.8)];

  const spec: LevelSpec = { kind, size, seconds, minLength, stars };
  if (twist) spec.twist = twist;
  if (kind === 'boss') {
    spec.enemyHp = stars[1];
    spec.enemyId = `boss-w${world}`;
  } else if (kind === 'elite') {
    spec.enemyHp = r5(stars[1] * (twist === 'ambush' ? 0.6 : 0.8));
    spec.enemyId = `elite-w${world}`;
  } else if (kind === 'hunt') {
    spec.huntCount = 2 + Math.floor((world - 1) / 3) + (twist === 'grand-hunt' ? 1 : 0);
  }
  return spec;
}

export const WORLD_LEVELS: LevelSpec[][] = WORLD_ROWS.map((row, wi) =>
  row.slots.map((slot, li) => buildSpec(wi + 1, li + 1, slot, row.twist)),
);

export function getPlayLevel(world: number, level: number): PlayLevel {
  if (!Number.isInteger(world) || world < 1 || world > WORLD_COUNT) throw new Error(`bad world ${world}`);
  if (!Number.isInteger(level) || level < 1 || level > LEVELS_PER_WORLD) throw new Error(`bad level ${level}`);
  const spec = WORLD_LEVELS[world - 1][level - 1];
  return {
    ...spec,
    stars: [...spec.stars] as [number, number, number],
    world,
    level,
    isBoss: spec.kind === 'boss',
    bossHp: isCombatKind(spec.kind) ? spec.enemyHp ?? 0 : 0,
  };
}

export function starsForScore(score: number, t: [number, number, number]): 0 | 1 | 2 | 3 {
  if (score >= t[2]) return 3;
  if (score >= t[1]) return 2;
  if (score >= t[0]) return 1;
  return 0;
}

/** Combat stars come from how fast the enemy fell (server-measured elapsed time). */
export function bossStarsForElapsed(elapsedMs: number, seconds: number): 1 | 2 | 3 {
  const frac = elapsedMs / (seconds * 1000);
  if (frac <= 0.6) return 3;
  if (frac <= 0.85) return 2;
  return 1;
}
