import { mulberry32 } from '@/utils/dailyChallenge/prng';
import type { ScoringTile } from '../types';

export type CardRarity = 'common' | 'rare' | 'legendary';

export interface ScoreContext {
  wordTiles: readonly ScoringTile[];
  wordLength: number;
  wordIndexInRound: number;
  baseChips: number;
  baseMult: number;
}

export interface ScoreModifier {
  addChips: number;
  addMult: number;
  mulMult: number;
}

export interface PowerCardRoundSetup {
  extraBagTiles?: number;
  extraBlankTiles?: number;
  rackSize?: number;
}

export interface PowerCard {
  id: string;
  rarity: CardRarity;
  scoreEffect?: (ctx: ScoreContext) => ScoreModifier;
  roundSetup?: PowerCardRoundSetup;
  roundEndBonus?: (roundScore: number, target: number) => number;
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const NONE: ScoreModifier = { addChips: 0, addMult: 0, mulMult: 1 };

export const POWER_CARD_POOL: readonly PowerCard[] = [
  {
    id: 'vowelPower',
    rarity: 'common',
    scoreEffect: (ctx) => ({
      ...NONE,
      addChips: ctx.wordTiles.filter((t) => VOWELS.has(t.letter.toUpperCase())).length * 2,
    }),
  },
  {
    id: 'longGame',
    rarity: 'common',
    scoreEffect: (ctx) => ({ ...NONE, mulMult: ctx.wordLength >= 5 ? 2 : 1 }),
  },
  {
    id: 'combo',
    rarity: 'common',
    scoreEffect: (ctx) => ({ ...NONE, addMult: ctx.wordIndexInRound }),
  },
  {
    id: 'premiumHunter',
    rarity: 'rare',
    scoreEffect: (ctx) => ({
      ...NONE,
      addMult: ctx.wordTiles.filter((t) => t.premium !== null).length,
    }),
  },
  { id: 'wildcardStash', rarity: 'common', roundSetup: { extraBlankTiles: 1 } },
  { id: 'quickHands', rarity: 'common', roundSetup: { extraBagTiles: 4 } },
  {
    id: 'doubleDown',
    rarity: 'rare',
    scoreEffect: (ctx) => ({ ...NONE, mulMult: ctx.wordIndexInRound === 0 ? 3 : 1 }),
  },
  {
    id: 'rareLetters',
    rarity: 'rare',
    scoreEffect: (ctx) => ({
      ...NONE,
      addChips: ctx.wordTiles.filter((t) => t.value >= 4).length * 3,
    }),
  },
  {
    id: 'shortSweet',
    rarity: 'common',
    scoreEffect: (ctx) => ({ ...NONE, addChips: ctx.wordLength === 3 ? 15 : 0 }),
  },
  {
    id: 'steadyBuild',
    rarity: 'common',
    scoreEffect: () => ({ ...NONE, addChips: 5 }),
  },
  {
    id: 'overflow',
    rarity: 'legendary',
    roundEndBonus: (roundScore, target) =>
      roundScore > target ? Math.round((roundScore - target) * 0.1) : 0,
  },
  { id: 'letterHoard', rarity: 'legendary', roundSetup: { rackSize: 10 } },
];

// Legendary pulls only feel special if they're actually rare — a plain shuffle
// gave every rarity equal odds, so a "legendary" was indistinguishable from a coin flip.
const RARITY_WEIGHT: Record<CardRarity, number> = { common: 10, rare: 4, legendary: 1 };

export function drawCardChoices(
  seed: number,
  excludeIds: readonly string[],
  n: number,
): PowerCard[] {
  const rng = mulberry32(seed);
  const remaining = POWER_CARD_POOL.filter((c) => !excludeIds.includes(c.id));
  const result: PowerCard[] = [];
  while (result.length < n && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, c) => sum + RARITY_WEIGHT[c.rarity], 0);
    let roll = rng() * totalWeight;
    let pickIndex = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      roll -= RARITY_WEIGHT[remaining[i].rarity];
      if (roll < 0) {
        pickIndex = i;
        break;
      }
    }
    result.push(remaining[pickIndex]);
    remaining.splice(pickIndex, 1);
  }
  return result;
}
