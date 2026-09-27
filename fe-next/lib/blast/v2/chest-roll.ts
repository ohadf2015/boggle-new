import type { Locale } from './types';
import { hashStringToSeed, seededPRNG } from './prng';
import { tierForChestNumber, type ChestTier, CHEST_TIERS } from './chest-config';
import { milestoneForChest } from './chest-milestone';

// Phantom-reward removal (2026-06-20). The chest used to mint two reward types
// the player never actually received:
//   - `boosts` (shield/speed/xray/reload): there is NO boost inventory or in-game
//     power-up system — they were display-only and vanished on chest open.
//   - `avatarPart` ('head_1' …): placeholder ids that don't match the real avatar
//     schema ({category, partId}) and were never redeemed into a player's avatar.
// Celebrating rewards the player can't use makes the headline chest loop feel
// hollow. Until those systems ship, we fold their value into COINS — the one real,
// spendable reward — so the chest pays out only tangible things. The chest UIs
// already gate boost/part display on non-empty, so the fake rows auto-hide.
const BOOST_COIN_VALUE = 100; // coins folded in per boost the tier would have rolled
const AVATAR_PART_COIN_VALUE = 150; // coins folded in when an avatar part would have rolled

export type ChestContents = {
  tier: ChestTier['tier'];
  coins: number;
  boosts: { type: string; count: number }[];
  avatarPart: string | null;
  frameSkin: string;
  /** Set when chestNumber lands on a milestone (10/25/50/100/200) — drives a celebratory open variant. */
  milestone?: number;
};

export function rollChest(userId: string, chestNumber: number, _locale: Locale): ChestContents {
  const seed = hashStringToSeed(`${userId}:chest:${chestNumber}`);
  const prng = seededPRNG(seed);
  const tierDef = tierForChestNumber(chestNumber);

  const baseCoins = tierDef.coinBase + prng.intRange(tierDef.coinVariance + 1);
  // Convert what the tier WOULD have dropped as boosts/parts into coins. The
  // avatar chance is still rolled (advances the PRNG + decides the bonus) so the
  // rare "you got the legendary drop" feel survives — as a coin windfall.
  const foldedBoostCoins = tierDef.boostCount * BOOST_COIN_VALUE;
  const wouldRollAvatarPart = prng.chance(tierDef.avatarPartChance);
  const foldedAvatarCoins = wouldRollAvatarPart ? AVATAR_PART_COIN_VALUE : 0;
  const coins = baseCoins + foldedBoostCoins + foldedAvatarCoins;

  const milestone = milestoneForChest(chestNumber);
  return {
    tier: tierDef.tier,
    coins,
    boosts: [], // no usable boost system yet — value folded into coins above
    avatarPart: null, // chest parts were never redeemable — value folded into coins
    frameSkin: tierDef.frame,
    ...(milestone !== null ? { milestone } : {}),
  };
}
