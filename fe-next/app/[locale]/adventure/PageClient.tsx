'use client';

import React, { Suspense, useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// Loading fallback component with playful design
function LoadingFallback(): React.JSX.Element {
  const { t } = useLanguageSafe();
  return (
    <div className="flex-1 flex relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <PageLoader size="lg" text={t('adventure.loading')} mascotVariant="explorer" className="relative z-10" />
    </div>
  );
}

// Dynamic import for code splitting
const AdventureView = nextDynamic(
  () => import('@/components/adventure/AdventureView'),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Adventure Mode page route — Beta testers & admins only (for now).
 * Shows the world map and level selection for Adventure Mode.
 *
 * Gated on canSeeInWorkModes (admin OR beta tester), mirroring the in-work
 * mode pattern (e.g. Word Forge). Dev mode bypasses the gate for testing.
 */
export default function AdventurePageClient(): React.JSX.Element {
  const { canSeeInWorkModes, loading, user, profile } = useAuth();
  const { language } = useLanguageSafe();
  const router = useRouter();

  // Beta/admin gate — allow in dev mode for testing. Redirect via effect to
  // avoid a router.replace-during-render hydration mismatch.
  //
  // `canSeeInWorkModes` is derived from the profile row, so it starts false on
  // every load and only flips once the profile lands. Redirecting before that
  // bounced genuine admins and beta testers off their own page.
  //
  // `loading` alone is not enough: it is set false on paths that never fetch a
  // profile (TOKEN_REFRESHED, cross-tab sync), so a signed-in user can sit at
  // loading=false with profile still null and be redirected anyway — observed
  // on a production build with a valid session. Treat "have a user, no profile
  // yet" as still resolving; `isAuthenticated` is itself `!!user && !!profile`.
  const isDev = process.env.NODE_ENV === 'development';
  const resolving = loading || (!!user && !profile);
  const denied = !resolving && !canSeeInWorkModes && !isDev;
  useEffect(() => {
    if (denied) {
      router.replace(`/${language}`);
    }
  }, [denied, language, router]);

  if (resolving || denied) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdventureView />
    </Suspense>
  );
}
