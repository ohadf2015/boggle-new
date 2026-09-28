/**
 * Glow-Up seed hashing — invalidation key for AI-rendered avatar portraits.
 *
 * A glow-up portrait is generated from a specific `avatar_config`. When the user
 * re-customizes their avatar, the stored portrait no longer matches and must be
 * treated as STALE (so display falls back to the live SVG until re-rendered).
 *
 * See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md (Track B).
 */

import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { computeAvatarSeedHash } from './configHash';

export { computeAvatarSeedHash } from './configHash';

/**
 * True if a stored portrait no longer matches the current config (or none was
 * ever stored). Stale renders must not be displayed.
 */
export function isRenderStale(
  config: CustomAvatarConfig,
  storedSeedHash: string | null | undefined,
): boolean {
  if (!storedSeedHash) return true;
  return computeAvatarSeedHash(config) !== storedSeedHash;
}
