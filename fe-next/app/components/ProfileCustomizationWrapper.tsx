'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import logger from '@/utils/logger';

// Dynamic import for ProfileCustomizationModal (not needed on initial page load)
const ProfileCustomizationModal = dynamic(
  () => import('@/components/ProfileCustomizationModal'),
  { ssr: false }
);

/**
 * Global wrapper component that manages profile customization modal
 * Shows the modal when an authenticated user hasn't customized their profile yet
 *
 * This ensures the profile customization flow works regardless of which page
 * the user lands on after OAuth redirect (home, profile, daily challenge, etc.)
 */
export default function ProfileCustomizationWrapper() {
  const { profile, needsProfileCustomization, updateProfile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Track mount state for hydration safety
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show profile customization modal for authenticated users who haven't customized
  useEffect(() => {
    if (!isMounted || !needsProfileCustomization) {
      setShowModal(false);
      return;
    }

    // Small delay to let the page settle after auth redirect
    const timer = setTimeout(() => {
      logger.info('ProfileCustomizationWrapper: Showing customization modal');
      setShowModal(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [isMounted, needsProfileCustomization]);

  // Handle profile customization save
  const handleSave = useCallback(async (name: string, avatarConfig: CustomAvatarConfig) => {
    logger.info('ProfileCustomizationWrapper: Saving profile', { name });

    const { error } = await updateProfile({
      display_name: name,
      avatar_config: avatarConfig,
      has_customized_profile: true,
    });

    if (error) {
      logger.error('ProfileCustomizationWrapper: Failed to save profile', { error: error.message });
      throw new Error(error.message);
    }

    logger.info('ProfileCustomizationWrapper: Profile saved successfully');
    setShowModal(false);
  }, [updateProfile]);

  // No-op close handler — user must save a name to dismiss
  const handleClose = useCallback(() => {
    // Intentionally empty: modal cannot be dismissed without saving
  }, []);

  // Don't render anything until mounted (hydration safety)
  if (!isMounted) {
    return null;
  }

  // Don't render if modal shouldn't be shown
  if (!showModal || !profile) {
    return null;
  }

  return (
    <ProfileCustomizationModal
      isOpen={showModal}
      onClose={handleClose}
      defaultName={profile.display_name || profile.username || ''}
      initialAvatar={profile.avatar_config}
      onSave={handleSave}
    />
  );
}
