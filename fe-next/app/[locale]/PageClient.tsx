'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { hasCompletedOnboarding, hasSupabaseSession, savePendingRoomInvite } from '@/utils/onboardingStorage';
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
 * Gate: new users (mobile AND desktop) → OnboardingFlow. Returning users → LandingView.
 *
 * Detection is purely localStorage-based (`hasCompletedOnboarding`) — there is
 * no viewport branching, both form factors run the same FTUE. The check is
 * synchronous so there's no flash of LandingView before the onboarding renders.
 * Auth-based returning-player detection is handled inside LandingView for the
 * edge case of cleared localStorage.
 */
export default function HomePageClient({ initialData }: HomePageClientProps): React.JSX.Element {
  // Synchronous check — runs during first render, not in an effect.
  // hasSupabaseSession() is Layer 1: skip FTUE for auth users whose localStorage was cleared.
  const [showFTUE, setShowFTUE] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (hasCompletedOnboarding() || hasSupabaseSession()) return false;
    // Save room invite before onboarding replaces the view
    const roomCode = new URLSearchParams(window.location.search).get('room');
    if (roomCode) savePendingRoomInvite(roomCode);
    return true;
  });

  const handleFTUEComplete = useCallback(() => {
    setShowFTUE(false);
  }, []);

  // New users go straight to onboarding — LandingView never mounts
  if (showFTUE) {
    return <OnboardingFlow onComplete={handleFTUEComplete} />;
  }

  return <LandingView initialData={initialData} />;
}
