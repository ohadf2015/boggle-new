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
 * Gate: returning users → LandingView (no CTA). New users → LandingView with
 * onStartOnboarding CTA; OnboardingFlow mounts only after they click play.
 *
 * Detection is purely localStorage-based (`hasCompletedOnboarding`) — there is
 * no viewport branching, both form factors run the same FTUE. New users see the
 * landing page first so they can browse before committing to signup.
 */
export default function HomePageClient({ initialData }: HomePageClientProps): React.JSX.Element {
  // Synchronous check: determine if user is new and parse URL invite params.
  // Kept synchronous (in useState initializer) so invite is saved before any
  // child effects that might redirect to /multiplayer read it.
  const [isNewUser] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const returning = hasCompletedOnboarding() || hasSupabaseSession();
    // Save room invite (and optional host name) regardless of FTUE state
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
        isFirstTimeUser: !returning,
      });
    }
    return !returning;
  });

  const [showFTUE, setShowFTUE] = useState(false);

  const handleStartOnboarding = useCallback(() => setShowFTUE(true), []);
  const handleFTUEComplete = useCallback(() => setShowFTUE(false), []);

  if (showFTUE) {
    return <OnboardingFlow onComplete={handleFTUEComplete} />;
  }

  return (
    <LandingView
      initialData={initialData}
      onStartOnboarding={isNewUser ? handleStartOnboarding : undefined}
    />
  );
}
