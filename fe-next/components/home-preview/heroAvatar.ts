import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { readAccountAvatar } from '@/utils/accountAvatarCache';

export interface HeroAvatar {
  userId: string;
  customAvatar: CustomAvatarConfig | null;
}

/**
 * Which avatar the home hero shows, or null for the loading placeholder.
 *
 * A signed-in player whose profile hasn't answered yet used to get
 * `<Avatar userId={id} />` with no config: a face generated from the user id,
 * swapped for their real avatar a moment later (player report 2026-11-08).
 * Now: their last known avatar from this device, else the placeholder. Never
 * a stand-in face for a signed-in player.
 */
export function pickHeroAvatar(
  userId: string | null,
  profile: { avatar_config?: CustomAvatarConfig | null } | null,
  guestAvatar: CustomAvatarConfig | null,
): HeroAvatar | null {
  if (!userId) return { userId: 'guest', customAvatar: guestAvatar };
  if (profile) {
    // A profile with no saved config is about to get one assigned; show the
    // cached one meanwhile rather than an id-generated face.
    const config = profile.avatar_config ?? readAccountAvatar(userId);
    return config ? { userId, customAvatar: config } : { userId, customAvatar: null };
  }
  const cached = readAccountAvatar(userId);
  return cached ? { userId, customAvatar: cached } : null;
}
