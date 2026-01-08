'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, User } from 'lucide-react';
import Image from 'next/image';
import { AVATARS, getAvatarPath, mapEmojiToAvatar, type AvatarConfig } from '@/utils/avatarConfig';

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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Choose your avatar"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md p-6 bg-neo-cream border-4 border-neo-black shadow-hard"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-neo-black shadow-hard mb-3 relative">
              {useProfileAvatar ? (
                profileAvatar?.profilePictureUrl ? (
                  <Image
                    src={profileAvatar.profilePictureUrl}
                    alt={profileAvatar.displayName || 'Profile'}
                    fill
                    sizes="96px"
                    className="object-cover"
                    priority
                  />
                ) : profileAvatar?.avatarImage ? (
                  // Show profile's avatar_image in preview
                  <Image
                    src={getAvatarPath(AVATARS.find(a => a.id === profileAvatar.avatarImage) || AVATARS[0])}
                    alt={profileAvatar.displayName || 'Profile Avatar'}
                    fill
                    sizes="96px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-4xl"
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
                  sizes="96px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-200">
                  <User className="w-12 h-12 text-slate-400" />
                </div>
              )}
            </div>
            <p className="text-lg font-black text-neo-black uppercase tracking-wide">
              {getPreviewName()}
            </p>
          </div>

          {/* Avatar Gallery Grid */}
          <div className="mb-4">
            <p className="text-sm font-bold mb-3 text-neo-black uppercase tracking-wide">
              Choose Your Avatar
            </p>
            <div className="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-2">
              {/* Profile Avatar Option (if available) */}
              {hasProfileAvatar && (
                <button
                  onClick={handleSelectProfileAvatar}
                  aria-label="Use your profile avatar"
                  aria-pressed={useProfileAvatar}
                  className={`relative aspect-square overflow-hidden transition-all duration-100 border-3 ${
                    useProfileAvatar
                      ? 'ring-4 ring-neo-cyan scale-105 shadow-hard border-neo-cyan'
                      : 'hover:scale-105 hover:shadow-hard-sm border-neo-black'
                  }`}
                >
                  {profileAvatar?.profilePictureUrl ? (
                    <Image
                      src={profileAvatar.profilePictureUrl}
                      alt={profileAvatar.displayName || 'Profile'}
                      fill
                      sizes="(max-width: 640px) 64px, 80px"
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : profileAvatar?.avatarImage ? (
                    // Show profile's avatar_image if no profile picture URL
                    <Image
                      src={getAvatarPath(AVATARS.find(a => a.id === profileAvatar.avatarImage) || AVATARS[0])}
                      alt={profileAvatar.displayName || 'Profile Avatar'}
                      fill
                      sizes="(max-width: 640px) 64px, 80px"
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: profileAvatar?.avatarColor || '#4ECDC4' }}
                    >
                      {profileAvatar?.avatarEmoji || '🎮'}
                    </div>
                  )}
                  {/* "Your Profile" label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-neo-black/80 text-white text-[8px] font-bold text-center py-0.5">
                    PROFILE
                  </div>
                </button>
              )}

              {/* Regular Avatars */}
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleSelectAvatar(avatar)}
                  aria-label={`Select ${avatar.name} avatar`}
                  aria-pressed={!useProfileAvatar && selectedAvatar?.id === avatar.id}
                  className={`relative aspect-square overflow-hidden transition-all duration-100 border-3 border-neo-black ${
                    !useProfileAvatar && selectedAvatar?.id === avatar.id
                      ? 'ring-4 ring-neo-cyan scale-105 shadow-hard'
                      : 'hover:scale-105 hover:shadow-hard-sm'
                  }`}
                >
                  <Image
                    src={getAvatarPath(avatar)}
                    alt={avatar.name}
                    fill
                    sizes="(max-width: 640px) 64px, 80px"
                    className="object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 font-bold uppercase tracking-wide transition-all duration-100 flex items-center justify-center gap-2 bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              <X size={14} />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 font-bold uppercase tracking-wide transition-all duration-100 flex items-center justify-center gap-2 bg-neo-cyan text-neo-black border-3 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              <Check size={14} />
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmojiAvatarPicker;
