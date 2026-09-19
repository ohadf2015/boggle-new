/**
 * Adventure level table — pure, shared by client (HUD) and server (scoring).
 * 10 worlds x 7 levels; level 7 is the world boss.
 */

export const WORLD_COUNT = 10;
export const LEVELS_PER_WORLD = 7;
export const BOSS_LEVEL = 7;

export interface PlayLevel {
  world: number;
  level: number;
  isBoss: boolean;
  /** Board is size x size. */
  size: number;
  seconds: number;
  minLength: number;
  /** Score needed for 1 / 2 / 3 stars (normal levels). */
  stars: [number, number, number];
  /** Boss only: total damage needed to win (damage = word points). */
  bossHp: number;
}

export function getPlayLevel(world: number, level: number): PlayLevel {
  if (!Number.isInteger(world) || world < 1 || world > WORLD_COUNT) throw new Error(`bad world ${world}`);
  if (!Number.isInteger(level) || level < 1 || level > LEVELS_PER_WORLD) throw new Error(`bad level ${level}`);

  const isBoss = level === BOSS_LEVEL;
  const size = world <= 3 ? 4 : 5;
  // ponytail: linear curve, retune from real run data once beta players exist
  const sizeFactor = size === 5 ? 1.5 : 1;
  const one = Math.round((60 + (world - 1) * 12 + (level - 1) * 8) * sizeFactor / 5) * 5;
  const stars: [number, number, number] = [one, Math.round(one * 1.8 / 5) * 5, Math.round(one * 2.8 / 5) * 5];

  return {
    world,
    level,
    isBoss,
    size,
    seconds: isBoss ? 120 : 90,
    minLength: 3,
    stars,
    bossHp: isBoss ? stars[1] : 0,
  };
}

export function starsForScore(score: number, t: [number, number, number]): 0 | 1 | 2 | 3 {
  if (score >= t[2]) return 3;
  if (score >= t[1]) return 2;
  if (score >= t[0]) return 1;
  return 0;
}

/** Boss stars come from how fast it fell (server-measured elapsed time). */
export function bossStarsForElapsed(elapsedMs: number, seconds: number): 1 | 2 | 3 {
  const frac = elapsedMs / (seconds * 1000);
  if (frac <= 0.6) return 3;
  if (frac <= 0.85) return 2;
  return 1;
}
