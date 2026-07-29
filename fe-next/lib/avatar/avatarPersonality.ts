/**
 * Avatar personality traits — pure, deterministic, family-friendly.
 *
 * Same player always gets the same trait (seeded from username), so reactions
 * feel like an identity rather than randomness. A trait REMAPS the base
 * leaderboard mood through the player's "vibe" — a smug player flexes shades
 * where others just grin; a chaotic one clowns a big moment. Reuses existing,
 * wholesome emote faces only — no new art, nothing that could read as adult.
 *
 * The drama beat (being overtaken) ALWAYS lands regardless of trait, so the
 * competitive read stays clear.
 */
import { hashString } from '@/shared/types/customAvatar';
import type { AvatarMood } from '@/lib/avatar/avatarMood';

export const AVATAR_TRAITS = ['standard', 'smug', 'hyped', 'chaotic', 'stoic'] as const;
export type AvatarTrait = (typeof AVATAR_TRAITS)[number];

/**
 * Deterministic trait from a stable seed (username). Distribution favours
 * `standard` (~52%) so personalities are spice, not noise — the board still
 * reads consistently, with surprises sprinkled in.
 */
export function getAvatarTrait(seed: string): AvatarTrait {
  const bucket = hashString(seed) % 100;
  if (bucket < 12) return 'chaotic';
  if (bucket < 24) return 'smug';
  if (bucket < 36) return 'hyped';
  if (bucket < 48) return 'stoic';
  return 'standard';
}

/**
 * Remap a base leaderboard mood through a trait's personality. Returns the
 * (possibly different) mood to play, or null for "stay neutral".
 */
export function applyTrait(base: AvatarMood | null, trait: AvatarTrait): AvatarMood | null {
  if (!base) return null;
  // The flinch always lands — being overtaken is the competitive story.
  if (base === 'emoteShock') return 'emoteShock';

  switch (trait) {
    case 'smug':
      return base === 'correct' ? 'emoteCool' : base;
    case 'hyped':
      return base === 'correct' ? 'emoteLaugh' : base;
    case 'chaotic':
      return base === 'streak' ? 'emoteSilly' : base;
    case 'stoic':
      return base === 'correct' ? null : base; // unmoved by ordinary scores
    case 'standard':
    default:
      return base;
  }
}
