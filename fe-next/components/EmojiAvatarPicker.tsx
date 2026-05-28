'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { Check, X, User, Paintbrush } from 'lucide-react';
import Image from 'next/image';
import { AVATARS, getAvatarPath, type AvatarConfig } from '@/utils/avatarConfig';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import dynamic from 'next/dynamic';

const AvatarBuilderModal = dynamic(() => import('@/components/avatar/AvatarBuilderModal'), { ssr: false });

// Special constant for "use profile avatar" selection
export const PROFILE_AVATAR_ID = '__profile_avatar__';

/**
 * Avatar selection result - simplified without emoji/color
 */
export interface AvatarSelection {
  avatarImage: string; // Avatar image ID (e.g., 'broccoli-bob') or PROFILE_AVATAR_ID
  customAvatar?: CustomAvatarConfig; // Custom avatar config (when avatarImage is CUSTOM_AVATAR_ID)
}

export const CUSTOM_AVATAR_ID = '__custom_avatar__';

/**
 * Profile avatar info for authenticated users
 */
interface ProfileAvatarInfo {
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

  const { t } = useLanguage();

  // Check if profile picture is available (user has OAuth profile picture)
  const hasProfilePicture = false;

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
  const [showBuilder, setShowBuilder] = useState(false);

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

  const handleSave = () => {
    if (useProfileAvatar && hasProfilePicture) {
      onSave({ avatarImage: PROFILE_AVATAR_ID });
    } else if (selectedAvatar) {
      onSave({ avatarImage: selectedAvatar.id });
    }
    onClose();
  };

  const handleCustomAvatarSave = (config: CustomAvatarConfig) => {
    onSave({ avatarImage: CUSTOM_AVATAR_ID, customAvatar: config });
    setShowBuilder(false);
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
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-1000 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.chooseAvatar')}
      >
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md rounded-neo overflow-hidden bg-neo-navy border-3 border-neo-black shadow-hard-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-3 bg-neo-cyan border-b-3 border-neo-black">
            <h2 className="text-lg font-black text-neo-black text-center uppercase">
              {t('profile.chooseAvatar')}
            </h2>
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center py-4 bg-neo-navy/50">
            <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-neo-black shadow-hard-sm mb-2 relative">
              {selectedAvatar ? (
                <Image
                  src={getAvatarPath(selectedAvatar)}
                  alt={selectedAvatar.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neo-navy-elevated">
                  <User className="w-10 h-10 text-slate-500" />
                </div>
              )}
            </div>
            <p className="text-sm font-black text-white">
              {getPreviewName()}
            </p>
          </div>

          {/* Build Custom Button */}
          <div className="px-4 pt-4">
            <button
              type="button"
              onClick={() => setShowBuilder(true)}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all',
                'bg-neo-purple text-neo-white hover:bg-neo-purple/90',
                'border-2 border-neo-black shadow-hard-sm'
              )}
            >
              <Paintbrush className="w-4 h-4" />
              {t('avatarBuilder.buildCustom')}
            </button>
          </div>

          {/* Avatar Gallery Grid */}
          <div className="p-4">
            <div className="grid grid-cols-5 gap-2.5 max-h-64 overflow-y-auto pe-1">
              {/* Profile Picture Option (if available) */}
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
                      'relative aspect-square rounded-neo overflow-hidden transition-all duration-100',
                      'border-2 border-neo-black/30',
                      isSelected
                        ? 'ring-3 ring-neo-cyan ring-offset-1 ring-offset-neo-navy scale-105 border-neo-cyan'
                        : 'hover:scale-105 hover:border-neo-white/50'
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
                      <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-neo-cyan text-neo-black rounded-full flex items-center justify-center border-2 border-neo-black shadow-hard-sm">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 p-4 border-t-3 border-neo-black/40">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 font-bold rounded-neo transition-all flex items-center justify-center gap-2 bg-neo-white/10 text-neo-white border-2 border-neo-white/20 hover:bg-neo-white/20 active:translate-y-px"
            >
              <X size={16} />
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 font-black rounded-neo transition-all flex items-center justify-center gap-2 bg-neo-cyan text-neo-black border-3 border-neo-black shadow-hard-sm hover:-translate-y-px hover:shadow-hard active:translate-y-px active:shadow-none"
            >
              <Check size={16} />
              {t('common.save')}
            </button>
          </div>
        </m.div>
      </m.div>
      )}
      {showBuilder && (
        <AvatarBuilderModal
          isOpen={showBuilder}
          onClose={() => setShowBuilder(false)}
          onSave={handleCustomAvatarSave}
          premium={null}
        />
      )}
    </AnimatePresence>,
    document.body
  );
};

export default EmojiAvatarPicker;
