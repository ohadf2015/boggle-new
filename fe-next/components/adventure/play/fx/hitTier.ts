/**
 * Word-hit tiering: how hard a landed word "hits" (normal / BIG / CRIT), which praise
 * banner it earns, how much the screen shakes, and why a rejected word failed.
 * Pure — the fx layer only reads these.
 */
import { wordPoints } from '@/lib/adventure/play/scoreRun';
import type { HitEvent } from '../events';

export type HitTier = 'hit' | 'big' | 'crit';

const len = (w: string) => Array.from(w).length;

/** CRIT = 7+ letters or a relic boost of 1.5x+; BIG = 5+ letters or any relic boost. */
export function hitTier(word: string, pts: number): HitTier {
  const n = len(word);
  const base = Math.max(1, wordPoints(word));
  if (n >= 7 || (pts > base && pts >= base * 1.5)) return 'crit';
  if (n >= 5 || pts > base) return 'big';
  return 'hit';
}

const hash = (w: string) => Array.from(w).reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7);

const BANNERS: Record<HitTier, string[]> = {
  hit: ['nice', 'good'],
  big: ['great', 'smashing'],
  crit: ['critical', 'astonishing', 'whomped'],
};

/** Translation key for the praise banner. A knockout blow always reads as K.O. */
export function bannerKey(tier: HitTier, word: string, ko: boolean): string {
  if (ko) return 'adventurePlay.juice.ko';
  const pool = BANNERS[tier];
  return `adventurePlay.juice.${pool[hash(word) % pool.length]}`;
}

/** Screen-shake amplitude in px: a nudge for small words, capped at 10px. */
export function shakePx(pts: number): number {
  if (pts <= 0) return 0;
  return Math.min(10, Math.round(2 + Math.sqrt(pts) * 1.4));
}

const FAIL_KEYS: Record<Exclude<HitEvent['result'], 'ok'>, string> = {
  short: 'adventurePlay.juice.tooShort',
  invalid: 'adventurePlay.juice.notAWord',
  dup: 'adventurePlay.juice.alreadyFound',
  chain: 'adventurePlay.juice.breaksChain',
};

export function failReasonKey(result: HitEvent['result']): string | null {
  return result === 'ok' ? null : FAIL_KEYS[result];
}

/** Visual weight per tier: number size (px), fill colour, banner colour. */
export const TIER_STYLE: Record<HitTier, { size: number; fill: string; banner: string; sparks: number }> = {
  hit: { size: 40, fill: '#fef3c7', banner: '#a3e635', sparks: 6 },
  big: { size: 56, fill: '#22d3ee', banner: '#22d3ee', sparks: 8 },
  crit: { size: 76, fill: '#facc15', banner: '#ff4fa3', sparks: 12 },
};

/**
 * How hard a landed word hits, 0..1: word length drives it (3 letters = 0, 8+ = 1),
 * and a relic boost adds on top (2x points = +0.5). Everything on impact scales with it.
 */
export function hitPower(word: string, pts: number): number {
  const byLen = Math.min(1, Math.max(0, (len(word) - 3) / 5));
  const base = Math.max(1, wordPoints(word));
  const boost = Math.min(0.5, Math.max(0, (pts / base - 1) * 0.5));
  return Math.min(1, Math.round((byLen + boost) * 100) / 100);
}

export interface ImpactLook {
  /** Damage number font size. */
  numberPx: number;
  /** Particle count at the target. */
  sparks: number;
  /** How far the target is knocked back. */
  knockPx: number;
  /** Diameter of the hit flash behind the number. */
  flashPx: number;
  /** Praise banner font size. */
  bannerPx: number;
}

/** Freeze-frame weight of an impact: a 7-letter word must read far harder than a 3-letter one. */
export function impactLook(power: number, tier: HitTier): ImpactLook {
  const p = Math.min(1, Math.max(0, power));
  const crit = tier === 'crit' ? 6 : 0;
  return {
    numberPx: Math.min(100, Math.round(52 + p * 48 + crit)),
    sparks: Math.round(10 + p * 14),
    knockPx: Math.round(14 + p * 26),
    flashPx: Math.round(120 + p * 130),
    bannerPx: Math.round(22 + p * 12),
  };
}

export interface PraiseLook {
  /** Praise font size (px). */
  px: number;
  /** CRIT / knockout: a screen-wide tilted slab stamp instead of a speech bubble. */
  slab: boolean;
}

/**
 * How loud the praise is: a 3-letter "Good!" is a small bubble, a BIG word a bigger one,
 * a CRIT a screen-wide stamp, a knockout the loudest of all (Bookworm's "Whomped!").
 */
export function praiseLook(tier: HitTier, power: number, ko: boolean): PraiseLook {
  const p = Math.min(1, Math.max(0, power));
  if (ko) return { px: 64, slab: true };
  if (tier === 'crit') return { px: Math.round(50 + p * 10), slab: true };
  if (tier === 'big') return { px: Math.round(38 + p * 6), slab: false };
  return { px: Math.round(26 + p * 4), slab: false };
}
