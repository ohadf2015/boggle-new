'use client';

import React, { useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { hasCompletedOnboarding, hasSupabaseSession, savePendingRoomInvite } from '@/utils/onboardingStorage';
import { trackInviteLanded } from '@/utils/growthTracking';
import { isOnboardingAllowedRoute } from '@/lib/onboarding/allowedRoutes';
import { LandingView } from '@/components/landing';
import { detectCrazyGamesSync } from '@/components/CrazyGamesSDK';
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

  // Same-origin relative path captured from `?next=` so a play surface
  // (e.g. /practice) can redirect first-timers here, finish FTUE, then route
  // back. Validated client-side: starts with `/`, no protocol-relative `//`.
  const [pendingNext] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const next = new URLSearchParams(window.location.search).get('next');
    if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
    return next;
  });

  // CG users on homepage skip the LandingView marketing surface and drop
  // straight into the CG short-flow (tutorial→welcome). PostHog 90d data showed
  // most CG visitors ignored the "Start Playing" CTA → only 2/20 saw welcome.
  // CG portal traffic = high intent to play; respect that.
  // ?next= present + FTUE not done = user was redirected from a gated play
  // surface. Auto-open FTUE so they don't have to click "Start Playing" again.
  const [showFTUE, setShowFTUE] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (hasCompletedOnboarding() || hasSupabaseSession()) return false;
    if (pendingNext) return true;
    return detectCrazyGamesSync();
  });
  // Defensive route allowlist: FTUE may only render on locale homepage.
  // PageClient is mounted only at /[locale]/page.tsx today, so this is dormant
  // for current users — but guards against a future hoist that would leak the
  // FTUE onto blog/SEO/legal routes (and tank their CWV / SEO).
  const pathname = usePathname();
  const router = useRouter();
  const routeAllowsOnboarding = isOnboardingAllowedRoute(pathname);

  const handleStartOnboarding = useCallback(() => {
    if (!routeAllowsOnboarding) return;
    setShowFTUE(true);
  }, [routeAllowsOnboarding]);
  const handleFTUEComplete = useCallback(() => {
    setShowFTUE(false);
    if (pendingNext) router.push(pendingNext);
  }, [pendingNext, router]);

  if (showFTUE && routeAllowsOnboarding) {
    return <OnboardingFlow onComplete={handleFTUEComplete} />;
  }

  return (
    <LandingView
      initialData={initialData}
      onStartOnboarding={isNewUser && routeAllowsOnboarding ? handleStartOnboarding : undefined}
    />
  );
}
