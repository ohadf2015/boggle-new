'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { uploadProfilePicture, removeProfilePicture } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { PROFILE_AVATAR_ID } from '@/components/Avatar';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface UseProfilePictureUploadOptions {
  userId: string | undefined;
  profile: ProfileData | null;
  updateProfile: (updates: Partial<ProfileData>) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
  refreshProfile: () => Promise<void>;
}

interface UseProfilePictureUploadReturn {
  isUploading: boolean;
  handleProfilePictureUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemoveProfilePicture: () => Promise<void>;
}

/**
 * Hook for handling profile picture upload and removal
 */
export function useProfilePictureUpload({
  userId,
  profile,
  updateProfile,
  refreshProfile
}: UseProfilePictureUploadOptions): UseProfilePictureUploadReturn {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);

  const handleProfilePictureUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validate file size (4MB)
    if (file.size > 4 * 1024 * 1024) {
      toast.error(t('profile.imageTooLarge') || 'Image must be less than 4MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('profile.invalidImageType') || 'Please upload a JPG, PNG, WebP, or GIF image');
      return;
    }

    setIsUploading(true);

    try {
      const { url, error } = await uploadProfilePicture(userId, file);
      if (error) throw error;

      await updateProfile({
        profile_picture_url: url,
        profile_picture_provider: 'custom',
        avatar_image: PROFILE_AVATAR_ID
      });

      await refreshProfile();
      toast.success(t('profile.uploadSuccess') || 'Profile picture updated!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(t('profile.uploadError') || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, [userId, updateProfile, refreshProfile, t]);

  const handleRemoveProfilePicture = useCallback(async (): Promise<void> => {
    if (!userId) return;

    try {
      if (profile?.profile_picture_provider === 'custom') {
        await removeProfilePicture(userId);
      }

      await updateProfile({
        profile_picture_url: null,
        profile_picture_provider: null
      });

      await refreshProfile();
      toast.success(t('profile.photoRemoved') || 'Profile picture removed');
    } catch (err) {
      console.error('Remove error:', err);
      toast.error(t('profile.removeError') || 'Failed to remove picture');
    }
  }, [userId, profile?.profile_picture_provider, updateProfile, refreshProfile, t]);

  return {
    isUploading,
    handleProfilePictureUpload,
    handleRemoveProfilePicture
  };
}

export default useProfilePictureUpload;
