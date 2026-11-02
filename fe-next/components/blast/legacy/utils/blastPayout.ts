import type { BlastGemKind } from '@/shared/types/blast';
import { GEM_DEFS } from './blastGems';

/** Deterministic 0-1 from a string, so the MP server and the client agree without sharing rng order. */
export function hash01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10007) / 10007;
}

/** 1 ± spread, skewed so big rolls are rarer than small ones: payouts feel random but average out. */
export function jitter(key: string, spread: number): number {
  const u = hash01(key);
  return 1 - spread + 2 * spread * u * u;
}

export interface PayoutCtx {
  /** Identifies the move, e.g. word + wave + board position, so each blast rolls its own numbers. */
  seed: string;
  wave: number;
}

/** One tile cleared by a bomb blast: deeper chain links and later waves pay more. */
export function bombTilePoints(ctx: PayoutCtx, row: number, col: number, depth: number): number {
  const base = 2 + depth * 2.5 + Math.min(ctx.wave, 12) * 0.35;
  return Math.max(1, Math.round(base * jitter(`${ctx.seed}:b${row},${col}`, 0.45)));
}

/** One tile cleared by a played gem's row + column blast: long words and rarer gems pay more. */
export function crossTilePoints(ctx: PayoutCtx, row: number, col: number, wordLength: number, gem: BlastGemKind): number {
  const rarity = GEM_DEFS[gem].clearBonus / 15;
  const base = 2 + wordLength * 0.7 + rarity * 0.8;
  return Math.max(1, Math.round(base * jitter(`${ctx.seed}:x${row},${col}`, 0.4)));
}

/** Bonus for clearing a gem tile: its base value grows with the wave and rolls up to +/-30%. */
export function gemClearPoints(ctx: PayoutCtx, row: number, col: number, gem: BlastGemKind): number {
  const base = GEM_DEFS[gem].clearBonus * (1 + Math.min(ctx.wave, 15) * 0.05);
  return Math.round(base * jitter(`${ctx.seed}:g${row},${col}`, 0.3));
}

/** Overflow surge: each suppressed detonation pays more the longer the word that triggered it. */
export function surgePoints(ctx: PayoutCtx, suppressed: number, wordLength: number): number {
  let total = 0;
  for (let i = 0; i < suppressed; i++) {
    total += Math.round((8 + wordLength * 1.5) * jitter(`${ctx.seed}:s${i}`, 0.35));
  }
  return total;
}
