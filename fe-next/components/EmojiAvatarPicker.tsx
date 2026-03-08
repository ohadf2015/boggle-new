'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, User } from 'lucide-react';
import Image from 'next/image';
import { AVATARS, getAvatarPath, type AvatarConfig } from '@/utils/avatarConfig';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Special constant for "use profile avatar" selection
export const PROFILE_AVATAR_ID = '__profile_avatar__';

/**
 * Avatar selection result - simplified without emoji/color
 */
export interface AvatarSelection {
  avatarImage: string; // Avatar image ID (e.g., 'broccoli-bob') or PROFILE_AVATAR_ID
}

/**
 * Profile avatar info for authenticated users
 */
interface ProfileAvatarInfo {
  profilePictureUrl?: string | null;
  displayName?: string;
  avatarImage?: string; // Profile's current avatar_image ID
}

/**
 * AvatarPicker Props
 */
interface AvatarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selection: AvatarSelection) => void;
  currentAvatarImage?: string; // Current avatar image ID
  profileAvatar?: ProfileAvatarInfo; // Profile avatar for authenticated users
}

/**
 * AvatarPicker - Modal for selecting avatar image
 * Supports:
 * 1. Profile picture from OAuth provider (if available)
 * 2. Custom character avatars (17 options)
 */
const EmojiAvatarPicker: React.FC<AvatarPickerProps> = ({
  isOpen,
  onClose,
  onSave,
  currentAvatarImage,
  profileAvatar
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  // Check if profile picture is available (user has OAuth profile picture)
  const hasProfilePicture = !!profileAvatar?.profilePictureUrl;

  // Check if currently using profile avatar
  const isUsingProfileAvatar = currentAvatarImage === PROFILE_AVATAR_ID;

  // Determine initial avatar selection
  const getInitialAvatar = useCallback((): AvatarConfig | null => {
    // If using profile avatar, return null to indicate profile selection
    if (isUsingProfileAvatar && hasProfilePicture) {
      return null;
    }
    if (currentAvatarImage && currentAvatarImage !== PROFILE_AVATAR_ID) {
      const found = AVATARS.find(a => a.id === currentAvatarImage || a.filename === currentAvatarImage);
      if (found) return found;
    }
    // Default to first avatar if no profile picture available
    return hasProfilePicture ? null : AVATARS[0];
  }, [isUsingProfileAvatar, currentAvatarImage, hasProfilePicture]);

  const [selectedAvatar, setSelectedAvatar] = useState<AvatarConfig | null>(getInitialAvatar());
  const [useProfileAvatar, setUseProfileAvatar] = useState<boolean>(isUsingProfileAvatar && hasProfilePicture);

  // Reset state when modal opens to reflect current profile state
  useEffect(() => {
    if (isOpen) {
      setSelectedAvatar(getInitialAvatar());
      setUseProfileAvatar(isUsingProfileAvatar && hasProfilePicture);
    }
  }, [isOpen, getInitialAvatar, isUsingProfileAvatar, hasProfilePicture]);

  // Handle selecting a character avatar
  const handleSelectAvatar = (avatar: AvatarConfig) => {
    setSelectedAvatar(avatar);
    setUseProfileAvatar(false);
  };

  // Handle selecting profile picture
  const handleSelectProfilePicture = () => {
    setSelectedAvatar(null);
    setUseProfileAvatar(true);
  };

  const handleSave = () => {
    if (useProfileAvatar && hasProfilePicture) {
      onSave({ avatarImage: PROFILE_AVATAR_ID });
    } else if (selectedAvatar) {
      onSave({ avatarImage: selectedAvatar.id });
    }
    onClose();
  };

  // Get display name for preview
  const getPreviewName = (): string => {
    if (useProfileAvatar && profileAvatar?.displayName) {
      return profileAvatar.displayName;
    }
    return selectedAvatar?.name || t('profile.yourAvatar');
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.chooseAvatar')}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={cn(
            'w-full max-w-md rounded-2xl overflow-hidden',
            isDarkMode
              ? 'bg-slate-800 border border-slate-700'
              : 'bg-white border border-gray-200 shadow-xl'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            'px-6 py-4 border-b',
            isDarkMode ? 'border-slate-700' : 'border-gray-200'
          )}>
            <h2 className={cn(
              'text-lg font-bold text-center',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              {t('profile.chooseAvatar')}
            </h2>
          </div>

          {/* Preview */}
          <div className={cn(
            'flex flex-col items-center py-4',
            isDarkMode ? 'bg-slate-900/50' : 'bg-gray-50'
          )}>
            <div className={cn(
              'w-20 h-20 rounded-full overflow-hidden border-4 mb-2 relative',
              isDarkMode ? 'border-slate-600' : 'border-gray-300'
            )}>
              {useProfileAvatar && profileAvatar?.profilePictureUrl ? (
                <Image
                  src={profileAvatar.profilePictureUrl}
                  alt={profileAvatar.displayName || 'Profile'}
                  fill
                  sizes="80px"
                  className="object-cover"
                  priority
                />
              ) : selectedAvatar ? (
                <Image
                  src={getAvatarPath(selectedAvatar)}
                  alt={selectedAvatar.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className={cn(
                  'w-full h-full flex items-center justify-center',
                  isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                )}>
                  <User className={cn('w-10 h-10', isDarkMode ? 'text-slate-500' : 'text-gray-400')} />
                </div>
              )}
            </div>
            <p className={cn(
              'text-sm font-bold',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            )}>
              {getPreviewName()}
            </p>
          </div>

          {/* Avatar Gallery Grid */}
          <div className="p-4">
            <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto">
              {/* Profile Picture Option (if available) */}
              {hasProfilePicture && (
                <button
                  onClick={handleSelectProfilePicture}
                  aria-label={t('profile.useProfileAvatar')}
                  aria-pressed={useProfileAvatar}
                  className={cn(
                    'relative aspect-square rounded-xl overflow-hidden transition-all duration-150',
                    useProfileAvatar
                      ? 'ring-3 ring-neo-cyan ring-offset-2 scale-105'
                      : cn(
                          'hover:scale-105',
                          isDarkMode ? 'ring-offset-slate-800' : 'ring-offset-white'
                        ),
                    isDarkMode ? 'ring-offset-slate-800' : 'ring-offset-white'
                  )}
                >
                  <Image
                    src={profileAvatar!.profilePictureUrl!}
                    alt={profileAvatar?.displayName || 'Profile'}
                    fill
                    sizes="64px"
                    className="object-cover"
                    loading="lazy"
                  />
                  {/* "Profile" label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-neo-black/80 text-white text-[7px] font-bold text-center py-0.5">
                    {t('profile.you')}
                  </div>
                  {/* Selected checkmark */}
                  {useProfileAvatar && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-neo-cyan text-neo-black rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              )}

              {/* Character Avatars */}
              {AVATARS.map((avatar) => {
                const isSelected = !useProfileAvatar && selectedAvatar?.id === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => handleSelectAvatar(avatar)}
                    aria-label={`${t('profile.selectAvatar')} ${avatar.name}`}
                    aria-pressed={isSelected}
                    className={cn(
                      'relative aspect-square rounded-xl overflow-hidden transition-all duration-150',
                      isSelected
                        ? 'ring-3 ring-neo-cyan ring-offset-2 scale-105'
                        : 'hover:scale-105',
                      isDarkMode ? 'ring-offset-slate-800' : 'ring-offset-white'
                    )}
                  >
                    <Image
                      src={getAvatarPath(avatar)}
                      alt={avatar.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                      loading="lazy"
                    />
                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-neo-cyan text-neo-black rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className={cn(
            'flex gap-3 p-4 border-t',
            isDarkMode ? 'border-slate-700' : 'border-gray-200'
          )}>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'flex-1 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2',
                isDarkMode
                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              <X size={16} />
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 bg-neo-cyan text-neo-black hover:bg-neo-cyan/90"
            >
              <Check size={16} />
              {t('common.save')}
            </button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default EmojiAvatarPicker;
