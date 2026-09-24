/**
 * The ONE player-facing rarity scheme for avatar parts.
 *
 * Economy tiers (free / vip / epic / legendary) come from the PREMIUM_* /
 * EPIC_* / LEGENDARY_PARTS tables in shared/types/customAvatar.ts. Players
 * see them as common / rare / epic / legendary — the same words the builder
 * already renders via `avatarBuilder.tiers.*`. AvatarTierEffects,
 * AvatarTierBadge, the unlock ladder and telemetry all read from here, so a
 * part can never be "rare" on one surface and "epic" on another.
 *
 * Pure module: no React, no CSS, safe for lib/ and server code.
 */
import {
  type CustomAvatarConfig,
  isEpicPart,
  isLegendaryPart,
  isPremiumPart,
} from '@/shared/types/customAvatar';

/** Internal economy tier. */
export type Tier = 'free' | 'vip' | 'epic' | 'legendary';
/** Player-facing rarity. */
export type VisualTier = 'common' | 'rare' | 'epic' | 'legendary';
export type PartRarity = VisualTier;

export const RARITY_ORDER: readonly VisualTier[] = ['common', 'rare', 'epic', 'legendary'];

const TIER_TO_VISUAL: Record<Tier, VisualTier> = {
  free: 'common',
  vip: 'rare',
  epic: 'epic',
  legendary: 'legendary',
};

export function tierToVisual(tier: Tier): VisualTier {
  return TIER_TO_VISUAL[tier];
}

export function getPartTier(category: string, partId: string): Tier {
  if (!partId || partId === 'none') return 'free';
  if (isLegendaryPart(category, partId)) return 'legendary';
  if (isEpicPart(category, partId)) return 'epic';
  if (isPremiumPart(category, partId)) return 'vip';
  return 'free';
}

export function getPartRarity(category: string, partId: string): VisualTier {
  return tierToVisual(getPartTier(category, partId));
}

const TIER_RANK: Record<Tier, number> = { free: 0, vip: 1, epic: 2, legendary: 3 };

/** Highest tier across all equipped parts (bg color stays cosmetic, as before). */
export function getConfigTier(config: CustomAvatarConfig): Tier {
  const parts: [string, string | undefined][] = [
    ['eyes', config.eyes],
    ['mouth', config.mouth],
    ['accessory', config.accessory],
    ['hair', config.hair],
    ['base', config.base],
    ['eyebrows', config.eyebrows],
    ['facialHair', config.facialHair],
  ];
  let best: Tier = 'free';
  for (const [cat, val] of parts) {
    const tier = getPartTier(cat, val ?? 'none');
    if (tier === 'legendary') return tier;
    if (TIER_RANK[tier] > TIER_RANK[best]) best = tier;
  }
  return best;
}

export function getConfigRarity(config: CustomAvatarConfig): VisualTier {
  return tierToVisual(getConfigTier(config));
}

export function maxRarity(list: readonly VisualTier[]): VisualTier {
  let best = 0;
  for (const r of list) best = Math.max(best, RARITY_ORDER.indexOf(r));
  return RARITY_ORDER[best];
}

export interface RarityToken {
  bg: string;
  border: string;
  text: string;
  dot: string;
  /** Raw color for SVG / canvas / inline style. */
  hex: string;
  /** t() key for the label. */
  labelKey: string;
}

/** Bronze → silver → gold → prismatic gold, lifted from AvatarTierBadge. */
export const RARITY_TOKENS: Record<VisualTier, RarityToken> = {
  common: {
    bg: 'bg-[#8B5A2B]/15',
    border: 'border-[#8B5A2B]/40',
    text: 'text-[#C49A6C]',
    dot: 'bg-[#C49A6C]',
    hex: '#C49A6C',
    labelKey: 'avatarBuilder.tiers.common',
  },
  rare: {
    bg: 'bg-[#A0AEC0]/15',
    border: 'border-[#A0AEC0]/50',
    text: 'text-[#E2E8F0]',
    dot: 'bg-[#E2E8F0]',
    hex: '#E2E8F0',
    labelKey: 'avatarBuilder.tiers.rare',
  },
  epic: {
    bg: 'bg-[#FFD700]/15',
    border: 'border-[#FFD700]/50',
    text: 'text-[#FFE066]',
    dot: 'bg-[#FFE066]',
    hex: '#FFE066',
    labelKey: 'avatarBuilder.tiers.epic',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-[#FFD700]/20 via-[#FF1493]/20 to-[#00FFFF]/20',
    border: 'border-[#FFD700]/60',
    text: 'text-[#FFD700]',
    dot: 'bg-[#FFD700]',
    hex: '#FFD700',
    labelKey: 'avatarBuilder.tiers.legendary',
  },
};
