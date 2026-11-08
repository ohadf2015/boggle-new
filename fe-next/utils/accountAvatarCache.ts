import { getFromStorage, saveToStorage } from '@/utils/storageHelpers';
import { type CustomAvatarConfig, isValidCustomAvatar } from '@/shared/types/customAvatar';

/**
 * The signed-in player's last known avatar, keyed to their account, so a
 * returning player's home shows THEIR avatar on the first frame instead of a
 * stand-in while the profile query is in flight. Keyed by user id: a different
 * account on the same device never sees someone else's avatar.
 */
const KEY = 'lc_account_avatar';

export function rememberAccountAvatar(userId: string, config: CustomAvatarConfig): void {
  if (!userId) return;
  saveToStorage(KEY, JSON.stringify({ u: userId, c: config }));
}

export function readAccountAvatar(userId: string | null | undefined): CustomAvatarConfig | null {
  if (!userId) return null;
  const raw = getFromStorage(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { u?: unknown; c?: unknown };
    if (parsed?.u !== userId || !isValidCustomAvatar(parsed.c)) return null;
    return parsed.c as CustomAvatarConfig;
  } catch {
    return null;
  }
}

/**
 * The last signed-in account's avatar on this device, whoever it was. Only for
 * the moment a live session exists but auth hasn't said whose it is yet: once
 * the user is known, readAccountAvatar(userId) takes over and drops it if the
 * account differs.
 */
export function readLastAccountAvatar(): { userId: string; config: CustomAvatarConfig } | null {
  const raw = getFromStorage(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { u?: unknown; c?: unknown };
    if (typeof parsed?.u !== 'string' || !isValidCustomAvatar(parsed.c)) return null;
    return { userId: parsed.u, config: parsed.c as CustomAvatarConfig };
  } catch {
    return null;
  }
}
