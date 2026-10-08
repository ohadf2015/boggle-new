'use client';

import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getStoredCustomAvatar } from '@/utils/profileStorage';

/** The avatar the student is wearing: the profile for a signed-in player, the stored avatar for a guest. */
export function useStudentAvatar(): CustomAvatarConfig {
  const { profile } = useAuth();
  return profile?.avatar_config ?? getStoredCustomAvatar() ?? DEFAULT_AVATAR_CONFIG;
}
