/**
 * Resolve who the *challenger* is when building an outgoing WordCraft duel link.
 *
 * Historically the link read `localStorage('wordcraft-duel-name')` — a key that
 * nothing ever wrote, so every invite said "A challenger" with no avatar. We now
 * source identity from the authenticated profile (the thing the user actually
 * set), falling back to the generic name for guests.
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface ChallengerProfileLike {
  display_name?: string | null;
  username?: string | null;
  avatar_config?: CustomAvatarConfig | null;
}

export interface ChallengerIdentity {
  name: string;
  avatar?: CustomAvatarConfig;
}

const firstNonBlank = (...vals: Array<string | null | undefined>): string | undefined =>
  vals.map((v) => v?.trim()).find((v) => !!v) || undefined;

export function resolveChallengerIdentity(
  profile: ChallengerProfileLike | null | undefined,
  fallbackName: string,
): ChallengerIdentity {
  const name = firstNonBlank(profile?.display_name, profile?.username) ?? fallbackName;
  const identity: ChallengerIdentity = { name };
  if (profile?.avatar_config) identity.avatar = profile.avatar_config;
  return identity;
}
