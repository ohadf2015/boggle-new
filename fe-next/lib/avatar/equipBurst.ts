/**
 * Plans the "snap" feedback burst when a player equips/buys an avatar part.
 * Bigger, louder bursts for higher tiers and for tier UPGRADES — the dopamine
 * spike that makes buying premium parts feel rewarding (and repeatable).
 */
import type { Tier } from '@/components/avatar/AvatarTierEffects';

export interface EquipBurst {
  /** Number of particles to spray. 0 = no burst (plain free swap). */
  particles: number;
  /** Brand color for the particles/flash. */
  color: string;
  /** True when this equip raised the avatar's tier — warrants a celebration. */
  celebrate: boolean;
}

const RANK: Record<Tier, number> = { free: 0, vip: 1, epic: 2, legendary: 3 };

const TIER_COLOR: Record<Tier, string> = {
  free: '#BFFF00', // lime
  vip: '#00FFFF', // cyan
  epic: '#A855F7', // purple
  legendary: '#FFD700', // gold
};

// Particle count per tier — escalates so legendary feels like a jackpot.
const TIER_PARTICLES: Record<Tier, number> = { free: 0, vip: 12, epic: 18, legendary: 28 };

/**
 * @param prevTier the avatar's overall tier before this equip
 * @param newTier  the avatar's overall tier after this equip
 */
export function planEquipBurst(prevTier: Tier, newTier: Tier): EquipBurst {
  const color = TIER_COLOR[newTier];
  const base = TIER_PARTICLES[newTier];
  const upgraded = RANK[newTier] > RANK[prevTier];

  if (newTier === 'free') {
    // Swapping free parts: no particle spray, the preview wobble carries it.
    return { particles: 0, color, celebrate: false };
  }
  // Upgrades get the full spray; re-equipping within the same tier gets a
  // smaller acknowledgement so it still feels tactile without spamming.
  return {
    particles: upgraded ? base : Math.round(base * 0.5),
    color,
    celebrate: upgraded,
  };
}
