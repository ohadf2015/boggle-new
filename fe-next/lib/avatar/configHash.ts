/**
 * Canonical visual hash for avatar_config — shared by AvatarLite PNG cache-bust
 * (`?v=` / `/v/:hash` URL) and glow-up seed invalidation.
 *
 * Dependency-free on purpose: AvatarLite is first-paint-critical and must not
 * pull zod / the renderer. Field list is explicit + sorted so key order on the
 * stored JSONB never changes the hash.
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

/** Visual fields that affect how the avatar looks. */
export const AVATAR_VISUAL_FIELDS: (keyof CustomAvatarConfig)[] = [
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
export function canonicalizeAvatarConfig(
  config: Partial<CustomAvatarConfig> | null | undefined,
): string {
  if (!config) return '';
  return AVATAR_VISUAL_FIELDS.map((f) => `${f}=${config[f] ?? ''}`).join('|');
}

/** djb2 — small, fast, dependency-free, browser-safe. Hex string output. */
function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

/**
 * Deterministic short hash of an avatar's visual configuration.
 * Accepts a partial config (AvatarLite may only know colors) — missing fields
 * hash as empty, so a hair/eyes edit on a full config still changes the hash.
 */
export function computeAvatarSeedHash(
  config: Partial<CustomAvatarConfig> | null | undefined,
): string {
  return djb2(canonicalizeAvatarConfig(config));
}
