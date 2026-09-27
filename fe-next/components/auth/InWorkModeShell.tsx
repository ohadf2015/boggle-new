'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { inWorkModeAccess } from '@/lib/auth/inWorkModeAccess';

/**
 * Beta/admin gate used by Adventure, Word Tower v2, and /adventure/achievements.
 * Waits while a signed-in user has no profile yet (TOKEN_REFRESHED race).
 */
export function InWorkModeShell({ children }: { children: React.ReactNode }) {
  const { canSeeInWorkModes, loading, user, profile } = useAuth();
  const { language } = useLanguageSafe();
  const router = useRouter();
  const isDev = process.env.NODE_ENV === 'development';
  const { denied, allowed } = inWorkModeAccess({
    loading,
    user,
    profile,
    canSeeInWorkModes,
    isDev,
  });

  useEffect(() => {
    if (denied) router.replace(`/${language}`);
  }, [denied, language, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
