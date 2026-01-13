'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Edit, Check, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Avatar from '@/components/Avatar';
import { CountrySelector } from '@/components/settings/CountrySelector';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface ProfileHeaderProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  compact?: boolean;
  isUploading: boolean;
  onProfilePictureUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveProfilePicture: () => Promise<void>;
  onShowEmojiPicker: () => void;
  updateProfile: (updates: Partial<ProfileData>) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
  refreshProfile: () => Promise<void>;
}

export function ProfileHeader({
  profile,
  isDarkMode,
  compact = false,
  isUploading,
  onProfilePictureUpload,
  onRemoveProfilePicture,
  onShowEmojiPicker,
  updateProfile,
  refreshProfile
}: ProfileHeaderProps): React.ReactNode {
  const { t } = useLanguage();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingCountry, setIsEditingCountry] = useState(false);
  const [isSavingCountry, setIsSavingCountry] = useState(false);

  const startEditingName = (): void => {
    setEditDisplayName(profile?.display_name || profile?.username || '');
    setIsEditingName(true);
  };

  const handleSaveDisplayName = async (): Promise<void> => {
    if (!editDisplayName.trim() || editDisplayName.trim().length < 2) {
      toast.error(t('validation.usernameTooShort') || 'Name must be at least 2 characters');
      return;
    }

    if (editDisplayName.trim().length > 20) {
      toast.error(t('validation.usernameTooLong') || 'Name must be 20 characters or less');
      return;
    }

    setIsSaving(true);

    try {
      await updateProfile({ display_name: editDisplayName.trim() });
      await refreshProfile();
      setIsEditingName(false);
      toast.success(t('profile.saved') || 'Profile saved!');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(t('profile.saveError') || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCountryChange = useCallback(async (countryCode: string | null): Promise<void> => {
    setIsSavingCountry(true);

    try {
      await updateProfile({ country_code: countryCode });
      await refreshProfile();
      setIsEditingCountry(false);
      toast.success(t('profile.countrySaved') || 'Country updated!');
    } catch (err) {
      console.error('Save country error:', err);
      toast.error(t('profile.countryError') || 'Failed to update country');
    } finally {
      setIsSavingCountry(false);
    }
  }, [updateProfile, refreshProfile, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl mb-4',
        compact ? 'p-3' : 'p-6',
        isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
      )}
    >
      <div className={cn('flex', compact ? 'flex-col gap-3 items-start' : 'flex-row gap-6 items-center')}>
        {/* Avatar with upload/edit controls - Improved mobile layout */}
        <div className={cn('flex', compact ? 'flex-col gap-2' : 'flex-row gap-4 items-center')}>
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar
              profilePictureUrl={profile?.profile_picture_url ?? undefined}
              avatarImage={profile?.avatar_image ?? undefined}
              size={compact ? 'md' : 'xl'}
              className="shadow-lg"
            />
          </div>

          {/* Avatar Controls - Stacked for mobile, horizontal for desktop */}
          <div className={cn(
            'flex gap-2',
            compact ? 'flex-row' : 'flex-col'
          )}>
            {/* Upload Button (camera icon) */}
            <label
              className={cn(
                'rounded-full flex items-center justify-center shadow-md cursor-pointer transition-colors',
                'min-w-[44px] min-h-[44px] w-11 h-11',
                isDarkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-white text-gray-600 hover:bg-gray-100',
                'border-2',
                isDarkMode ? 'border-slate-600' : 'border-gray-200'
              )}
              title={t('profile.uploadPhoto') || 'Upload Photo'}
              aria-label={t('profile.uploadPhoto') || 'Upload Photo'}
            >
              {isUploading ? (
                <div className="border-2 border-current border-t-transparent rounded-full animate-spin w-5 h-5" />
              ) : (
                <Camera size={20} />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onProfilePictureUpload}
                className="hidden"
                disabled={isUploading}
                aria-label={t('profile.uploadPhoto') || 'Upload Photo'}
              />
            </label>

            {/* Remove profile picture button */}
            {profile?.profile_picture_url && (
              <button
                onClick={onRemoveProfilePicture}
                className={cn(
                  'rounded-full flex items-center justify-center shadow-md transition-colors',
                  'min-w-[44px] min-h-[44px] w-11 h-11',
                  'border-2 border-red-600',
                  isDarkMode ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-red-500 text-white hover:bg-red-400'
                )}
                title={t('profile.removePhoto') || 'Remove Photo'}
                aria-label={t('profile.removePhoto') || 'Remove Photo'}
              >
                <X size={20} />
              </button>
            )}

            {/* Edit emoji button (only show if no profile picture) */}
            {!profile?.profile_picture_url && (
              <button
                onClick={onShowEmojiPicker}
                className={cn(
                  'rounded-full flex items-center justify-center shadow-md transition-colors',
                  'min-w-[44px] min-h-[44px] w-11 h-11',
                  'border-2',
                  isDarkMode ? 'bg-slate-600 text-gray-300 hover:bg-slate-500 border-slate-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 border-gray-300'
                )}
                title={t('profile.chooseEmoji') || 'Change Emoji'}
                aria-label={t('profile.chooseEmoji') || 'Change Emoji'}
              >
                <Edit size={20} />
              </button>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                className={cn(
                  'h-10 text-lg font-bold',
                  isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-300'
                )}
                maxLength={20}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSaveDisplayName}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-500"
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingName(false)}
                className={isDarkMode ? 'border-slate-600' : ''}
              >
                <X />
              </Button>
            </div>
          ) : (
            <h1 className={cn(
              'font-bold flex items-center gap-2 truncate',
              compact ? 'text-lg' : 'text-2xl',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              <span className="truncate">{profile?.display_name || profile?.username || 'Player'}</span>
              <button
                onClick={startEditingName}
                className={cn(
                  'p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0',
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                )}
                title={t('profile.editName') || 'Edit Name'}
              >
                <Edit size={compact ? 12 : 14} />
              </button>
            </h1>
          )}
          <p className={cn(
            'text-sm truncate',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            {t('profile.memberSince')} {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
          </p>

          {/* Country Display/Edit */}
          <div className="mt-2">
            {isEditingCountry ? (
              <div className={cn('max-w-[200px]', compact && 'max-w-[160px]')}>
                <CountrySelector
                  value={profile?.country_code}
                  onChange={handleCountryChange}
                  isDarkMode={isDarkMode}
                  disabled={isSavingCountry}
                />
                <button
                  onClick={() => setIsEditingCountry(false)}
                  className={cn(
                    'mt-1 text-xs',
                    isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-600'
                  )}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingCountry(true)}
                className={cn(
                  'flex items-center gap-1.5 text-sm transition-colors',
                  isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-600'
                )}
                title={t('profile.changeCountry') || 'Change country'}
              >
                {profile?.country_code ? (
                  <>
                    <span className="text-base">{getCountryFlag(profile.country_code)}</span>
                    <span>{profile.country_code}</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>{t('profile.addCountry') || 'Add country'}</span>
                  </>
                )}
                <Edit className="w-3 h-3 opacity-60" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ProfileHeader;
