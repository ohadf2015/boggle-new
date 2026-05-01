import type { Tile } from '../types';

export interface DamageContext {
  critRoll: number;
  runeBonusSum: number;
  heroAtk: number;
}

const LENGTH_MULTIPLIER: Record<number, number> = {
  3: 1.0,
  4: 1.3,
  5: 1.7,
  6: 2.2,
  7: 2.8,
};

function getLengthMultiplier(len: number): number {
  if (len <= 2) return 0;
  if (len >= 8) return 3.5;
  return LENGTH_MULTIPLIER[len] ?? 1.0;
}

export function calculateDamage(tiles: Tile[], ctx: DamageContext): number {
  if (tiles.length < 3) return 0;
  const letterValueSum = tiles.reduce(
    (acc, t) => acc + t.letterValue * (t.isGold ? 2 : 1),
    0,
  );
  const base = letterValueSum * getLengthMultiplier(tiles.length);
  const final = base * ctx.critRoll * (1 + ctx.runeBonusSum) * ctx.heroAtk;
  return Math.floor(final);
}
