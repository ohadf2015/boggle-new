'use client';

import React from 'react';
import { useWinnerOnboarding } from '@/hooks/useWinnerOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import WinnerOnboarding from '@/components/auth/WinnerOnboarding';

/**
 * Wrapper component that manages winner onboarding modal
 * Shows the modal when a new user signs up after winning a daily challenge
 */
export default function WinnerOnboardingWrapper() {
  const { isOpen, onboardingData, isProcessing, completeOnboarding } = useWinnerOnboarding();
  const { profile } = useAuth();

  if (!onboardingData) {
    return null;
  }

  return (
    <WinnerOnboarding
      isOpen={isOpen && !isProcessing}
      onComplete={completeOnboarding}
      initialName={onboardingData.initialName}
      initialAvatarId={onboardingData.initialAvatarId}

      trigger={onboardingData.trigger}
    />
  );
}
