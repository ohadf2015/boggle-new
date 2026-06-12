'use client';

/**
 * Shows the one-time style-choice popup to EXISTING users (authed or returning
 * guests) who haven't picked a style. Brand-new users choose during onboarding
 * instead, so this never double-prompts. Mirrors ProfileCustomizationWrapper.
 */

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';
import {
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
  const { isAuthenticated, isAdmin, profile, needsProfileCustomization, updateProfile } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    // Don't fight the profile-customization modal; small settle delay.
    const timer = setTimeout(() => {
      setShow(
        shouldShowStylePopup({
          isMounted: true,
          featureEnabled: !!isAdmin,
          isAuthenticated,
          needsProfileCustomization: !!needsProfileCustomization,
          profileShownAt: profile?.player_style_modal_shown_at ?? null,
          profileStyle: profile?.player_style ?? null,
          guestShown: hasPlayerStyleModalBeenShown(),
          guestOnboardingDone: hasCompletedOnboarding(),
        }),
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [isMounted, isAdmin, isAuthenticated, needsProfileCustomization, profile]);

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

  return <PlayerStyleModal isOpen onDismiss={handleDismiss} />;
}
