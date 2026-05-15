import { mulberry32 } from '@/utils/dailyChallenge/prng';
import {
  POWER_CARD_POOL as SHARED_POOL,
  type PowerCard,
  type ScoreModifier,
} from '../run/powerCards';

const NONE: ScoreModifier = { addChips: 0, addMult: 0, mulMult: 1 };

/**
 * Cards that are rack-mode specific (rely on rack size / blanks / extra bag
 * tiles tuned for rack-mode bag sizes). Cascade uses a different bag model so
 * we skip these to avoid offering dead picks.
 */
const RACK_ONLY = new Set(['wildcardStash', 'quickHands', 'letterHoard', 'premiumHunter']);

/** Cascade-native cards. Most are markers consumed via reducer side effects. */
export const CASCADE_NATIVE_CARDS: readonly PowerCard[] = [
  // Pyro — words ≥5 burn an extra random tile (reducer side-effect)
  { id: 'pyro', rarity: 'common' },
  // Frost — words ≥6 pause fire for 8s (reducer side-effect)
  { id: 'frost', rarity: 'common' },
  // Diagonal — swipe paths may include diagonals (reducer passes to validatePath)
  { id: 'diagonal', rarity: 'rare' },
  // Echo — first auto-cascade per round scores 3× (reducer side-effect)
  { id: 'echo', rarity: 'rare' },
  // Ember Boost — score doubled when fire row > halfway (reducer side-effect)
  { id: 'emberBoost', rarity: 'rare' },
  // Static Spark — +5 chips per word (pure scoring card replacing legacy steadyBuild?)
  // We keep this distinct so cascade picks always have a "safe bonus" option.
  {
    id: 'staticSpark',
    rarity: 'common',
    scoreEffect: () => ({ ...NONE, addChips: 5 }),
  },
];

const NATIVE_IDS = new Set(CASCADE_NATIVE_CARDS.map((c) => c.id));

export const CASCADE_POWER_CARD_POOL: readonly PowerCard[] = [
  ...SHARED_POOL.filter((c) => !RACK_ONLY.has(c.id)),
  ...CASCADE_NATIVE_CARDS,
];

export function drawCascadeCardChoices(
  seed: number,
  excludeIds: readonly string[],
  n: number,
): PowerCard[] {
  const rng = mulberry32(seed);
  const pool = CASCADE_POWER_CARD_POOL.filter((c) => !excludeIds.includes(c.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}

export function isCascadeNativeCardId(id: string): boolean {
  return NATIVE_IDS.has(id);
}
