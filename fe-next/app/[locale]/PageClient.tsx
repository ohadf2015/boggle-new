'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { hasCompletedOnboarding, savePendingRoomInvite } from '@/utils/onboardingStorage';
import { LandingView } from '@/components/landing';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LandingInitialData } from '@/lib/landing/fetchLandingData';

const OnboardingFlow = dynamic(
  () => import('@/components/onboarding/OnboardingFlow'),
  {
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-neo-navy z-50" />,
  }
);

interface HomePageClientProps {
  initialData?: LandingInitialData;
}

/**
 * Gate: new users (mobile AND desktop) → OnboardingFlow. Returning users → LandingView.
 *
 * Detection is purely localStorage-based (`hasCompletedOnboarding`) — there is
 * no viewport branching, both form factors run the same FTUE. The check is
 * synchronous so there's no flash of LandingView before the onboarding renders.
 * Auth-based returning-player detection is handled inside LandingView for the
 * edge case of cleared localStorage.
 */
export default function HomePageClient({ initialData }: HomePageClientProps): React.JSX.Element {
  const { isOnCrazyGamesPlatform, isLoading: isCrazyGamesLoading } = useCrazyGames();
  const router = useRouter();
  const { language } = useLanguage();

  // Synchronous check — runs during first render, not in an effect
  const [showFTUE, setShowFTUE] = useState(() => {
    if (typeof window === 'undefined') return false;
    const needsOnboarding = !hasCompletedOnboarding();
    // Save room invite before onboarding replaces the view
    if (needsOnboarding) {
      const roomCode = new URLSearchParams(window.location.search).get('room');
      if (roomCode) savePendingRoomInvite(roomCode);
    }
    return needsOnboarding;
  });

  const handleFTUEComplete = useCallback(() => {
    setShowFTUE(false);
  }, []);

  // On CrazyGames, skip the landing page and go straight to multiplayer
  useEffect(() => {
    if (!isCrazyGamesLoading && isOnCrazyGamesPlatform) {
      router.replace(`/${language}/multiplayer`);
    }
  }, [isCrazyGamesLoading, isOnCrazyGamesPlatform, router, language]);

  // While CrazyGames SDK is loading in an iframe, show loading instead of landing/onboarding
  if (isCrazyGamesLoading && typeof window !== 'undefined' && window.self !== window.top) {
    return <div className="fixed inset-0 bg-neo-navy" />;
  }
  // Already confirmed on CrazyGames — show loading until redirect completes
  if (isOnCrazyGamesPlatform) {
    return <div className="fixed inset-0 bg-neo-navy" />;
  }

  // New users go straight to onboarding — LandingView never mounts
  if (showFTUE) {
    return <OnboardingFlow onComplete={handleFTUEComplete} />;
  }

  return <LandingView initialData={initialData} />;
}
