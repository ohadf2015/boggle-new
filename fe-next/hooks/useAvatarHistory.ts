'use client';

/**
 * useAvatarHistory — remembers the player's PREVIOUS saved avatar so they can
 * always revert their last save, even after closing the app.
 *
 * "Previous" = the avatar that was saved before the current one. The save-owner
 * (e.g. ProfileHeader) calls `stashCurrent(outgoingConfig)` at the save boundary,
 * BEFORE persisting the new avatar. Stored in localStorage, scoped per user, so
 * it survives reloads. Reads are schema-validated — corrupt data is ignored.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  customAvatarSchema,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';

const KEY_PREFIX = 'lc_prev_avatar_';

function storageKey(userId?: string | null): string | null {
  return userId ? `${KEY_PREFIX}${userId}` : null;
}

function readPrevious(key: string | null): CustomAvatarConfig | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = customAvatarSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export interface AvatarHistory {
  /** The previously-saved avatar, or null if none recorded for this user. */
  previousConfig: CustomAvatarConfig | null;
  hasPrevious: boolean;
  /** Stash the outgoing avatar as "previous". Call at the save boundary. */
  stashCurrent: (config: CustomAvatarConfig | null | undefined) => void;
}

export function useAvatarHistory(userId?: string | null): AvatarHistory {
  const key = storageKey(userId);
  const [previousConfig, setPreviousConfig] = useState<CustomAvatarConfig | null>(null);

  useEffect(() => {
    setPreviousConfig(readPrevious(key));
  }, [key]);

  const stashCurrent = useCallback(
    (config: CustomAvatarConfig | null | undefined) => {
      if (!key || !config || typeof window === 'undefined') return;
      try {
        localStorage.setItem(key, JSON.stringify(config));
        setPreviousConfig(config);
      } catch {
        /* quota / disabled storage — non-fatal */
      }
    },
    [key],
  );

  return { previousConfig, hasPrevious: previousConfig !== null, stashCurrent };
}

export default useAvatarHistory;
