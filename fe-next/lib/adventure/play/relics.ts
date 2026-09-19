/**
 * Run-scoped relics (passives) and potions (consumables) — pure data + pure fns.
 * Ids are fixed by the spec: art lives at public/images/adventure/{relics,potions}/<id>.webp.
 * Effects are language-agnostic (length / order only) so every locale plays the same.
 */
import { calculateWordScore } from '@/shared/utils/scoring';

export type RelicId =
  | 'sharp-quill' | 'long-bow' | 'short-sword' | 'storm-rune' | 'twin-ink' | 'echo-stone' | 'magnet'
  | 'heart-locket' | 'hourglass' | 'lens-of-insight' | 'sage-scroll' | 'iron-bookmark' | 'frost-ward'
  | 'vampire-fang' | 'gold-tooth' | 'lucky-clover' | 'phoenix-feather';

export type PotionId = 'heal' | 'time' | 'cleanse' | 'insight';
export type Rarity = 'common' | 'rare' | 'epic';

/** Word context a scoring relic sees: its letters and how many words came before it this level. */
export interface WordCtx { len: number; index: number }

export type RelicEffect =
  | { type: 'flat'; bonus: (w: WordCtx) => number }
  | { type: 'mult'; factor: (w: WordCtx) => number }
  | { type: 'stat' };

export interface RelicDef { rarity: Rarity; effect: RelicEffect }

const flat = (bonus: (w: WordCtx) => number): RelicEffect => ({ type: 'flat', bonus });
const mult = (factor: (w: WordCtx) => number): RelicEffect => ({ type: 'mult', factor });
const stat: RelicEffect = { type: 'stat' };

export const RELICS: Record<RelicId, RelicDef> = {
  'sharp-quill': { rarity: 'common', effect: mult((w) => (w.len >= 6 ? 1.5 : 1)) },
  'long-bow': { rarity: 'rare', effect: mult((w) => (w.len >= 7 ? 2 : 1)) },
  'short-sword': { rarity: 'common', effect: flat((w) => (w.len === 3 ? 2 : 0)) },
  'storm-rune': { rarity: 'common', effect: flat((w) => (w.len === 5 ? 5 : 0)) },
  'twin-ink': { rarity: 'common', effect: mult((w) => (w.index === 0 ? 2 : 1)) },
  'echo-stone': { rarity: 'rare', effect: flat((w) => Math.min(w.index, 10)) },
  magnet: { rarity: 'rare', effect: mult(() => 1.2) },
  'heart-locket': { rarity: 'common', effect: stat },
  hourglass: { rarity: 'common', effect: stat },
  'lens-of-insight': { rarity: 'common', effect: stat },
  'sage-scroll': { rarity: 'rare', effect: stat },
  'iron-bookmark': { rarity: 'common', effect: stat },
  'frost-ward': { rarity: 'rare', effect: stat },
  'vampire-fang': { rarity: 'rare', effect: stat },
  'gold-tooth': { rarity: 'common', effect: stat },
  'lucky-clover': { rarity: 'rare', effect: stat },
  'phoenix-feather': { rarity: 'epic', effect: stat },
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];

export interface PotionDef { rarity: Rarity }
export const POTIONS: Record<PotionId, PotionDef> = {
  heal: { rarity: 'common' },
  time: { rarity: 'common' },
  cleanse: { rarity: 'common' },
  insight: { rarity: 'common' },
};
export const POTION_IDS = Object.keys(POTIONS) as PotionId[];

export const isRelicId = (x: unknown): x is RelicId => typeof x === 'string' && x in RELICS;
export const isPotionId = (x: unknown): x is PotionId => typeof x === 'string' && x in POTIONS;

/** Potion strengths (spec): heal +2 HP · time +15s · cleanse clears + stuns 3s · insight +2 hints. */
export const POTION_HEAL = 2;
export const POTION_TIME_MS = 15_000;
export const POTION_STUN_MS = 3_000;
export const POTION_HINTS = 2;

const known = (relics: readonly string[]) => [...new Set(relics)].filter(isRelicId);

/**
 * Points for one word with the run's relics. Flat bonuses add first, then
 * multipliers stack. `index` = words already credited this level (order matters).
 */
export function applyRelics(word: string, index: number, relics: readonly RelicId[], base = calculateWordScore(word)): number {
  const ctx: WordCtx = { len: Array.from(word).length, index };
  const owned = known(relics).map((id) => RELICS[id].effect);
  let pts = base;
  for (const e of owned) if (e.type === 'flat') pts += e.bonus(ctx);
  for (const e of owned) if (e.type === 'mult') pts *= e.factor(ctx);
  return Math.round(pts);
}

const has = (relics: readonly string[], id: RelicId) => relics.includes(id);

export const BASE_HP = 5;
export const BASE_HINTS = 2;

export const maxHpFor = (r: readonly string[]) => BASE_HP + (has(r, 'heart-locket') ? 1 : 0);
export const secondsBonus = (r: readonly string[]) => (has(r, 'hourglass') ? 10 : 0);
export const hintCharges = (r: readonly string[]) => BASE_HINTS + (has(r, 'lens-of-insight') ? 1 : 0);
export const draftSize = (r: readonly string[]) => (has(r, 'lucky-clover') ? 4 : 3);
export const goldMult = (r: readonly string[]) => (has(r, 'gold-tooth') ? 1.5 : 1);
export const startShields = (r: readonly string[]) => (has(r, 'iron-bookmark') ? 1 : 0);
export const effectDurationMult = (r: readonly string[]) => (has(r, 'frost-ward') ? 0.5 : 1);
export const healsOnLongWord = (r: readonly string[]) => has(r, 'vampire-fang');
export const hasRevive = (r: readonly string[]) => has(r, 'phoenix-feather');
export const revealsFullHint = (r: readonly string[]) => has(r, 'sage-scroll');
