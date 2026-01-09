'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, User } from 'lucide-react';
import Image from 'next/image';
import { AVATARS, getAvatarPath, mapEmojiToAvatar, type AvatarConfig } from '@/utils/avatarConfig';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Special constant for "use profile avatar" selection
export const PROFILE_AVATAR_ID = '__profile_avatar__';

/**
 * Avatar selection result
 */
interface AvatarSelection {
  avatarImage: string; // Avatar image ID or PROFILE_AVATAR_ID
  emoji?: string; // Deprecated: kept for backward compatibility
  color?: string; // Deprecated: kept for backward compatibility
}

/**
 * Profile avatar info for authenticated users
 */
interface ProfileAvatarInfo {
  profilePictureUrl?: string | null;
  avatarEmoji?: string;
  avatarColor?: string;
  displayName?: string;
  avatarImage?: string; // Profile's avatar_image ID
}

/**
 * EmojiAvatarPicker Props (renamed but kept for backward compatibility)
 */
interface EmojiAvatarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selection: AvatarSelection) => void;
  currentEmoji?: string; // Deprecated: will be mapped to avatar image
  currentColor?: string; // Deprecated: no longer used
  currentAvatarImage?: string; // New: current avatar image ID
  profileAvatar?: ProfileAvatarInfo; // Profile avatar for authenticated users
}

/**
 * AvatarPicker - Modal for selecting avatar image
 * (Previously EmojiAvatarPicker - renamed but kept export name for compatibility)
 */
const EmojiAvatarPicker: React.FC<EmojiAvatarPickerProps> = ({
  isOpen,
  onClose,
  onSave,
  currentEmoji,
  currentAvatarImage,
  profileAvatar
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  // Check if profile avatar is available (user has profile picture, avatar image, or emoji)
  const hasProfileAvatar = profileAvatar && (profileAvatar.profilePictureUrl || profileAvatar.avatarImage || profileAvatar.avatarEmoji);

  // Check if currently using profile avatar
  const isUsingProfileAvatar = currentAvatarImage === PROFILE_AVATAR_ID ||
    (!currentAvatarImage && !!hasProfileAvatar);

  // Determine initial avatar selection
  const getInitialAvatar = React.useCallback((): AvatarConfig | null => {
    // If using profile avatar, return null to indicate profile selection
    if (isUsingProfileAvatar) {
      return null;
    }
    if (currentAvatarImage && currentAvatarImage !== PROFILE_AVATAR_ID) {
      const found = AVATARS.find(a => a.id === currentAvatarImage || a.filename === currentAvatarImage);
      if (found) return found;
    }
    if (currentEmoji) {
      return mapEmojiToAvatar(currentEmoji);
    }
    // Default to first avatar if no profile avatar available
    return hasProfileAvatar ? null : AVATARS[0];
  }, [isUsingProfileAvatar, currentAvatarImage, currentEmoji, hasProfileAvatar]);

  const [selectedAvatar, setSelectedAvatar] = useState<AvatarConfig | null>(getInitialAvatar());
  const [useProfileAvatar, setUseProfileAvatar] = useState<boolean>(isUsingProfileAvatar);

  // Reset state when modal opens to reflect current profile state
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAvatar(getInitialAvatar());
      setUseProfileAvatar(isUsingProfileAvatar);
    }
  }, [isOpen, getInitialAvatar, isUsingProfileAvatar]);

  // Handle selecting a regular avatar
  const handleSelectAvatar = (avatar: AvatarConfig) => {
    setSelectedAvatar(avatar);
    setUseProfileAvatar(false);
  };

  // Handle selecting profile avatar
  const handleSelectProfileAvatar = () => {
    setSelectedAvatar(null);
    setUseProfileAvatar(true);
  };

  const handleSave = () => {
    if (useProfileAvatar && hasProfileAvatar) {
      onSave({
        avatarImage: PROFILE_AVATAR_ID,
        emoji: profileAvatar?.avatarEmoji || '🎮',
        color: profileAvatar?.avatarColor || '#4ECDC4'
      });
    } else if (selectedAvatar) {
      onSave({
        avatarImage: selectedAvatar.id,
        emoji: '🎮',
        color: '#4ECDC4'
      });
    }
    onClose();
  };

  // Get display name for preview
  const getPreviewName = (): string => {
    if (useProfileAvatar && profileAvatar?.displayName) {
      return profileAvatar.displayName;
    }
    return selectedAvatar?.name || 'Your Avatar';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.chooseAvatar') || 'Choose your avatar'}
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
              {t('profile.chooseAvatar') || 'Choose Your Avatar'}
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
              {useProfileAvatar ? (
                profileAvatar?.profilePictureUrl ? (
                  <Image
                    src={profileAvatar.profilePictureUrl}
                    alt={profileAvatar.displayName || 'Profile'}
                    fill
                    sizes="80px"
                    className="object-cover"
                    priority
                  />
                ) : profileAvatar?.avatarImage ? (
                  <Image
                    src={getAvatarPath(AVATARS.find(a => a.id === profileAvatar.avatarImage) || AVATARS[0])}
                    alt={profileAvatar.displayName || 'Profile Avatar'}
                    fill
                    sizes="80px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-3xl"
                    style={{ backgroundColor: profileAvatar?.avatarColor || '#4ECDC4' }}
                  >
                    {profileAvatar?.avatarEmoji || '🎮'}
                  </div>
                )
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
              {/* Profile Avatar Option (if available) */}
              {hasProfileAvatar && (
                <button
                  onClick={handleSelectProfileAvatar}
                  aria-label={t('profile.useProfileAvatar') || 'Use your profile avatar'}
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
                  {profileAvatar?.profilePictureUrl ? (
                    <Image
                      src={profileAvatar.profilePictureUrl}
                      alt={profileAvatar.displayName || 'Profile'}
                      fill
                      sizes="64px"
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : profileAvatar?.avatarImage ? (
                    <Image
                      src={getAvatarPath(AVATARS.find(a => a.id === profileAvatar.avatarImage) || AVATARS[0])}
                      alt={profileAvatar.displayName || 'Profile Avatar'}
                      fill
                      sizes="64px"
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: profileAvatar?.avatarColor || '#4ECDC4' }}
                    >
                      {profileAvatar?.avatarEmoji || '🎮'}
                    </div>
                  )}
                  {/* "Profile" label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-neo-black/80 text-white text-[7px] font-bold text-center py-0.5">
                    {t('profile.you') || 'YOU'}
                  </div>
                  {/* Selected checkmark */}
                  {useProfileAvatar && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-neo-cyan text-neo-black rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              )}

              {/* Regular Avatars */}
              {AVATARS.map((avatar) => {
                const isSelected = !useProfileAvatar && selectedAvatar?.id === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => handleSelectAvatar(avatar)}
                    aria-label={`${t('profile.selectAvatar') || 'Select'} ${avatar.name}`}
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
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 bg-neo-cyan text-neo-black hover:bg-neo-cyan/90"
            >
              <Check size={16} />
              {t('common.save') || 'Save'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmojiAvatarPicker;
