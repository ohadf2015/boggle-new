'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';
import { LandingView } from '@/components/landing';
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
 * Gate: new mobile users → OnboardingFlow (no LandingView hooks run).
 * Returning/desktop users → LandingView immediately.
 *
 * The check is synchronous (localStorage) so there's no flash of landing page
 * before the onboarding renders. Auth-based returning-player detection is
 * handled inside LandingView for the edge case of cleared localStorage.
 */
export default function HomePageClient({ initialData }: HomePageClientProps): React.JSX.Element {
  // Synchronous check — runs during first render, not in an effect
  const [showFTUE, setShowFTUE] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !hasCompletedOnboarding();
  });

  const handleFTUEComplete = useCallback(() => {
    setShowFTUE(false);
  }, []);

  // Desktop check — also synchronous
  const [isDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024;
  });

  // Mobile new users go straight to onboarding — LandingView never mounts
  if (showFTUE && !isDesktop) {
    return <OnboardingFlow onComplete={handleFTUEComplete} />;
  }

  return <LandingView initialData={initialData} />;
}
