'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { inWorkModeAccess } from '@/lib/auth/inWorkModeAccess';

/**
 * Pixi touches `window` at import time, so the game must never be server
 * rendered. `ssr: false` is only legal inside a Client Component, which is what
 * this wrapper exists to provide — the same shape v1 uses.
 */
const WordTowerV2 = dynamic(() => import('@/components/wordTowerV2/WordTowerV2'), {
  ssr: false,
});

/**
 * Word Tower v2 — beta testers and admins only.
 *
 * Gated on canSeeInWorkModes, mirroring Adventure. v1 stays the public Word
 * Tower; this route is the in-work preview of the physics rebuild.
 *
 * `canSeeInWorkModes` is derived from the profile row, so it starts false on
 * every load and only flips once the profile lands. Redirecting before that
 * bounced genuine admins and beta testers off their own page.
 *
 * `loading` alone is not enough: it is set false on paths that never fetch a
 * profile (TOKEN_REFRESHED, cross-tab sync), so a signed-in user can sit at
 * loading=false with profile still null and be redirected anyway — observed
 * on a production build with a valid session. Treat "have a user, no profile
 * yet" as still resolving; `isAuthenticated` is itself `!!user && !!profile`.
 */
export function WordTowerV2PageClient({ daily = false }: { daily?: boolean } = {}) {
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

  return <WordTowerV2 daily={daily} />;
}
