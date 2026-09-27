/**
 * New-account custom avatar selection.
 *
 * `createNewProfile` runs only when a Supabase profile row is genuinely absent
 * (PGRST116). At that moment a guest may have just crafted a custom avatar in
 * the FTUE (persisted to localStorage via setStoredCustomAvatar). Prefer that
 * crafted avatar so it carries into the new account instead of being silently
 * replaced by a random one.
 */
import { getStoredCustomAvatar } from '@/utils/profileStorage';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';

export function pickSignupCustomAvatar(): CustomAvatarConfig {
  return getStoredCustomAvatar() ?? getRandomAvatarConfig();
}
