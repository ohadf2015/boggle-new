import type { Locale } from './types';
import { hashStringToSeed, seededPRNG } from './prng';
import { tierForChestNumber, type ChestTier, CHEST_TIERS } from './chest-config';
import { milestoneForChest } from './chest-milestone';

// Stub pools — Plan 6 expands these per locale
const BOOST_POOL = ['shield', 'speed', 'xray', 'reload'];
const AVATAR_PARTS_PER_LOCALE: Record<Locale, string[]> = {
  en: ['head_1', 'eyes_1', 'mouth_1', 'body_1'],
  he: ['head_1', 'eyes_1', 'mouth_1', 'body_1'],
  sv: ['head_1', 'eyes_1', 'mouth_1', 'body_1'],
  ja: ['head_1', 'eyes_1', 'mouth_1', 'body_1'],
  es: ['head_1', 'eyes_1', 'mouth_1', 'body_1'],
};

export type ChestContents = {
  tier: ChestTier['tier'];
  coins: number;
  boosts: { type: string; count: number }[];
  avatarPart: string | null;
  frameSkin: string;
  /** Set when chestNumber lands on a milestone (10/25/50/100/200) — drives a celebratory open variant. */
  milestone?: number;
};

export function rollChest(userId: string, chestNumber: number, locale: Locale): ChestContents {
  const seed = hashStringToSeed(`${userId}:chest:${chestNumber}`);
  const prng = seededPRNG(seed);
  const tierDef = tierForChestNumber(chestNumber);

  const coins = tierDef.coinBase + prng.intRange(tierDef.coinVariance + 1);

  const boosts: { type: string; count: number }[] = [];
  for (let i = 0; i < tierDef.boostCount; i++) {
    const type = prng.pick(BOOST_POOL);
    boosts.push({ type, count: 1 });
  }

  const avatarPart = prng.chance(tierDef.avatarPartChance)
    ? prng.pick(AVATAR_PARTS_PER_LOCALE[locale] ?? AVATAR_PARTS_PER_LOCALE.en)
    : null;

  const milestone = milestoneForChest(chestNumber);
  return {
    tier: tierDef.tier,
    coins,
    boosts,
    avatarPart,
    frameSkin: tierDef.frame,
    ...(milestone !== null ? { milestone } : {}),
  };
}
