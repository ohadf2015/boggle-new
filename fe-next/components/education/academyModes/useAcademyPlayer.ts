'use client';

/** The signed-in student's avatar + display name — the same fields the academy map HUD reads. */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveStudentDisplayName } from '@/lib/education/studentDisplayName';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { AcademyPlayer } from './AcademyChrome';

export function useAcademyPlayer(): AcademyPlayer | undefined {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  return useMemo(() => {
    if (!user) return undefined;
    const fields = (profile ?? {}) as { avatar_config?: unknown };
    return {
      name: resolveStudentDisplayName(profile, user, t('student.dashboard.defaultName')),
      userId: user.id,
      avatarConfig: (fields.avatar_config ?? null) as CustomAvatarConfig | null,
    };
  }, [user, profile, t]);
}
