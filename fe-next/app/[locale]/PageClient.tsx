'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { hasCompletedOnboarding, hasSupabaseSession, savePendingRoomInvite } from '@/utils/onboardingStorage';
import { trackInviteLanded } from '@/utils/growthTracking';
import { LandingView } from '@/components/landing';
import type { LandingInitialData } from '@/lib/landing/fetchLandingData';

// Denylist: allow only Latin/accented/Hebrew/Hiragana/Katakana + space/apostrophe/hyphen
const HOST_NAME_ALLOWED = /[^A-Za-z0-9 '\-À-ɏ֐-׿぀-ヿ]/g;

const sanitizeHostName = (raw: string): string => {
  if (!raw) return '';
  return raw.replace(HOST_NAME_ALLOWED, '').trim().slice(0, 24);
};

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
    // Save room invite (and optional host name) before onboarding replaces the view
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      const rawHost = params.get('host') ?? '';
      const hostName = sanitizeHostName(rawHost) || undefined;
      savePendingRoomInvite(roomCode, hostName);
      // Stamp landing time so downstream events can measure secondsSinceLanded
      sessionStorage.setItem('invite_landed_ts', String(Date.now()));
      trackInviteLanded({
        roomCode,
        hasHostName: !!hostName,
        isFirstTimeUser: true, // gated by hasCompletedOnboarding check above
      });
    }
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
