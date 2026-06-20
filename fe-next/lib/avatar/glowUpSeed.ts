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

/**
 * Visual fields that affect how the avatar looks. Anything not here (none today)
 * would not invalidate a render. Listed explicitly + sorted so the hash is
 * stable regardless of object key order.
 */
const VISUAL_FIELDS: (keyof CustomAvatarConfig)[] = [
  'accessory',
  'accessoryColor',
  'base',
  'bgColor',
  'bodyStyle',
  'eyeColor',
  'eyebrows',
  'eyes',
  'facialHair',
  'gender',
  'hair',
  'hairColor',
  'mouth',
  'noseStyle',
  'shirtColor',
  'skinColor',
];

/** Canonical, key-order-independent string for the visual config. */
function canonicalize(config: CustomAvatarConfig): string {
  return VISUAL_FIELDS.map((f) => `${f}=${config[f] ?? ''}`).join('|');
}

/** djb2 — small, fast, dependency-free, browser-safe. Hex string output. */
function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

/** Deterministic short hash of an avatar's visual configuration. */
export function computeAvatarSeedHash(config: CustomAvatarConfig): string {
  return djb2(canonicalize(config));
}

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
