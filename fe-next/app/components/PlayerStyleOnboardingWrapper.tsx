'use client';

/**
 * Shows the one-time style-choice popup to EXISTING users (authed or returning
 * guests) who haven't picked a style. Brand-new users choose during onboarding
 * instead, so this never double-prompts. Mirrors ProfileCustomizationWrapper.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isLandingRoute } from '@/lib/onboarding/allowedRoutes';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';
import {
  getStoredPlayerStyle,
  hasPlayerStyleModalBeenShown,
  markPlayerStyleModalShown,
} from '@/lib/playerStyle/playerStyleStorage';
import { shouldShowStylePopup } from '@/lib/playerStyle/shouldShowStylePopup';
import type { PlayerStyleKey } from '@/lib/playerStyle/styles';
import logger from '@/utils/logger';

const PlayerStyleModal = dynamic(
  () => import('@/components/playerStyle/PlayerStyleModal').then((m) => m.PlayerStyleModal),
  { ssr: false },
);

export default function PlayerStyleOnboardingWrapper() {
  const { isAuthenticated, profile, needsProfileCustomization, updateProfile, loading } = useAuth();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [show, setShow] = useState(false);
  // Session latch: once we've decided to show the popup, never let the effect
  // re-open it. The authed "shown" marker (profileShownAt) is persisted async,
  // so after dismiss it briefly still reads null and the gate would re-resolve
  // `true` on the next dep change → modal jumps back ("shows multiple times").
  const shownOnceRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Derive primitives up front so the effect deps are stable values, not the
  // `profile` object — whose identity changes on every auth refresh and used to
  // re-fire the timer, racing setShow(true)→setShow(false) into a visible flash.
  const authSettled = !loading;
  const profileLoaded = profile != null;
  const profileShownAt = profile?.player_style_modal_shown_at ?? null;
  const profileStyle = profile?.player_style ?? null;

  useEffect(() => {
    if (!isMounted) return;
    // Don't fight the profile-customization modal; small settle delay.
    const timer = setTimeout(() => {
      const next = shouldShowStylePopup({
        isMounted: true,
        // Gate on auth + profile load so we never decide during the transient
        // unauthenticated / unloaded-profile window (the flash root cause).
        authSettled,
        // SHIPPED TO ALL: the one-time "pick your style" popup now prompts every
        // existing user once (was admin-only during the pilot). Brand-new users
        // still choose during onboarding, so this never double-prompts.
        featureEnabled: true,
        isAuthenticated,
        needsProfileCustomization: !!needsProfileCustomization,
        profileLoaded,
        profileShownAt,
        profileStyle,
        guestShown: hasPlayerStyleModalBeenShown(),
        guestOnboardingDone: hasCompletedOnboarding(),
        // Local truth: if any style is stored we never prompt, even for authed
        // users whose `profiles.player_style` hasn't caught up (FTUE pick before
        // login / sync lag) — the root of "popup reappears after I picked".
        localStyleChosen: getStoredPlayerStyle() != null,
        alreadyShownThisSession: shownOnceRef.current,
      });
      // Only ever OPEN from the effect; dismissal owns closing. This prevents a
      // dep change while the modal is open from yanking it shut mid-choice, and
      // (with the latch) prevents it re-opening after dismiss.
      if (next) {
        shownOnceRef.current = true;
        setShow(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [
    isMounted,
    authSettled,
    isAuthenticated,
    needsProfileCustomization,
    profileLoaded,
    profileShownAt,
    profileStyle,
  ]);

  const markShown = useCallback(async () => {
    if (isAuthenticated && profile) {
      const { error } = await updateProfile({
        player_style_modal_shown_at: new Date().toISOString(),
      });
      if (error) logger.warn('PlayerStyleOnboardingWrapper: failed to mark shown', error.message);
    } else {
      markPlayerStyleModalShown();
    }
  }, [isAuthenticated, profile, updateProfile]);

  const handleDismiss = useCallback(
    (_chosen?: PlayerStyleKey) => {
      // StylePicker already persisted the style choice (if any). We only record
      // that the one-time popup has now been shown so it never reappears.
      void markShown();
      setShow(false);
    },
    [markShown],
  );

  if (!isMounted || !show) return null;
  // Never auto-open over the marketing landing page — it buries the hero and
  // hurts CWV/SEO. The popup will surface on the user's next in-app navigation.
  if (isLandingRoute(pathname)) return null;

  return <PlayerStyleModal isOpen onDismiss={handleDismiss} />;
}
