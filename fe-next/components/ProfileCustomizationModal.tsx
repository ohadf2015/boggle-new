'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { AVATARS, getAvatarPath, getAvatarById, getRandomAvatar } from '@/utils/avatarConfig';
import { cn } from '@/lib/utils';
import { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';

interface ProfileCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
  profilePictureUrl?: string;
  onSave: (name: string, avatarId: string) => Promise<void>;
}

/**
 * ProfileCustomizationModal - Compact modal for new users to customize their profile
 * Shows avatar grid + name input together for quick personalization
 */
const ProfileCustomizationModal: React.FC<ProfileCustomizationModalProps> = ({
  isOpen,
  onClose,
  defaultName,
  profilePictureUrl,
  onSave,
}) => {
  const { t, dir } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Pre-select profile picture if available, otherwise random avatar
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(() =>
    profilePictureUrl ? PROFILE_AVATAR_ID : getRandomAvatar().id
  );
  const [displayName, setDisplayName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplayName(defaultName);
      setSelectedAvatarId(profilePictureUrl ? PROFILE_AVATAR_ID : getRandomAvatar().id);
      setNameTouched(false);
    }
  }, [isOpen, defaultName, profilePictureUrl]);

  // Name validation
  const minLength = 2;
  const maxLength = 20;
  const isValidFormat = /^[\p{L}\p{N}\s._-]+$/u.test(displayName) || displayName === '';
  const isValidLength = displayName.trim().length >= minLength && displayName.length <= maxLength;
  const isNameValid = isValidFormat && isValidLength;
  const showNameError = nameTouched && displayName.length > 0 && !isNameValid;

  const getErrorMessage = () => {
    if (!isValidFormat) return t('validation.invalidCharacters') || 'Invalid characters';
    if (displayName.trim().length < minLength) return t('validation.usernameTooShort') || 'Too short';
    if (displayName.length > maxLength) return t('validation.usernameTooLong') || 'Too long';
    return '';
  };

  const handleSave = async () => {
    if (!isNameValid || !selectedAvatarId) return;

    setIsSaving(true);
    try {
      await onSave(displayName.trim(), selectedAvatarId);
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    // Use current defaults and mark as customized
    setIsSaving(true);
    try {
      await onSave(defaultName, selectedAvatarId);
      onClose();
    } catch (error) {
      console.error('Failed to skip:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedAvatar = getAvatarById(selectedAvatarId) || AVATARS[0];
  const isUsingProfilePicture = selectedAvatarId === PROFILE_AVATAR_ID;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        dir={dir}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="bg-neo-cyan text-neo-black p-3 sm:p-4">
          <DialogTitle className="text-lg sm:text-xl font-black uppercase text-center">
            {t('profileCustomization.title') || 'Make it yours!'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4 px-4 sm:px-5 py-3">
          <p className="text-center text-sm text-neo-black/70 dark:text-gray-300">
            {t('profileCustomization.subtitle') || 'Choose your avatar and name'}
          </p>

          {/* Avatar grid */}
          <div className="w-full">
            <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">
              {t('profileCustomization.avatarLabel') || 'Pick your character'}
            </label>
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
              {/* Profile Picture Option (if available) */}
              {profilePictureUrl && (
                <motion.button
                  onClick={() => setSelectedAvatarId(PROFILE_AVATAR_ID)}
                  className={cn(
                    'relative aspect-square rounded-neo border-2 overflow-hidden',
                    'transition-all hover:scale-105 active:scale-95',
                    'min-h-[40px] min-w-[40px]',
                    isUsingProfilePicture
                      ? 'border-neo-cyan shadow-hard-sm scale-105 ring-2 ring-neo-pink'
                      : 'border-neo-black shadow-hard-sm hover:shadow-hard-md'
                  )}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.05 }}
                  whileHover={{ scale: isUsingProfilePicture ? 1.05 : 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Image
                    src={profilePictureUrl}
                    alt="Your Profile"
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />

                  {/* Selected indicator */}
                  {isUsingProfilePicture && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 bg-neo-cyan/20 flex items-center justify-center"
                    >
                      <div className="bg-neo-pink text-white border-2 border-neo-black rounded-full w-5 h-5 flex items-center justify-center font-black text-[10px] shadow-hard-sm">
                        ✓
                      </div>
                    </motion.div>
                  )}

                  {/* Label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-neo-black/80 text-white text-[8px] font-bold text-center py-0.5">
                    YOU
                  </div>
                </motion.button>
              )}

              {/* Regular Character Avatars */}
              {AVATARS.map((avatar, index) => {
                const isSelected = !isUsingProfilePicture && avatar.id === selectedAvatarId;

                return (
                  <motion.button
                    key={avatar.id}
                    onClick={() => setSelectedAvatarId(avatar.id)}
                    className={cn(
                      'relative aspect-square rounded-neo border-2 overflow-hidden',
                      'transition-all hover:scale-105 active:scale-95',
                      'min-h-[40px] min-w-[40px]',
                      isSelected
                        ? 'border-neo-cyan shadow-hard-sm scale-105 ring-2 ring-neo-pink'
                        : 'border-neo-black shadow-hard-sm hover:shadow-hard-md'
                    )}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.05 + index * 0.015 }}
                    whileHover={{ scale: isSelected ? 1.05 : 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Image
                      src={getAvatarPath(avatar)}
                      alt={avatar.name}
                      fill
                      className="object-cover"
                    />

                    {/* Selected indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 bg-neo-cyan/20 flex items-center justify-center"
                      >
                        <div className="bg-neo-pink text-white border-2 border-neo-black rounded-full w-5 h-5 flex items-center justify-center font-black text-[10px] shadow-hard-sm">
                          ✓
                        </div>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Selected avatar preview + Name input */}
          <div className="bg-neo-cream dark:bg-slate-700 border-3 border-neo-black dark:border-slate-600 rounded-neo p-3 shadow-hard-md">
            <div className="flex items-start gap-3">
              {/* Avatar preview */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-3 border-neo-black dark:border-slate-500 shadow-hard-sm">
                  {isUsingProfilePicture && profilePictureUrl ? (
                    <Image
                      src={profilePictureUrl}
                      alt="Your Profile"
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Image
                      src={getAvatarPath(selectedAvatar)}
                      alt={selectedAvatar.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="text-[10px] text-neo-black/60 dark:text-gray-400 text-center max-w-[60px] truncate">
                  {isUsingProfilePicture ? 'Your Profile' : selectedAvatar.name}
                </div>
              </div>

              {/* Name input */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setNameTouched(true);
                      setDisplayName(e.target.value);
                    }}
                    onBlur={() => setNameTouched(true)}
                    placeholder={t('profileCustomization.namePlaceholder') || 'Enter your name'}
                    maxLength={maxLength}
                    className={cn(
                      'w-full px-3 py-2.5 bg-white dark:bg-slate-600 border-3 border-neo-black dark:border-slate-500 rounded-neo',
                      'font-bold text-base text-neo-black dark:text-white placeholder:text-neo-black/40 dark:placeholder:text-gray-400',
                      'focus:outline-none focus:ring-3 focus:ring-neo-cyan',
                      'shadow-hard-sm transition-all',
                      'min-h-[44px]',
                      showNameError && 'border-neo-red focus:ring-neo-red',
                      isNameValid && displayName.length > 0 && 'border-neo-lime'
                    )}
                  />

                  {/* Validation indicator */}
                  {displayName.length > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-hard-sm shrink-0',
                        isNameValid
                          ? 'bg-neo-lime border-neo-black'
                          : 'bg-neo-red border-neo-black'
                      )}
                    >
                      {isNameValid ? (
                        <Check className="text-neo-black w-4 h-4" />
                      ) : (
                        <X className="text-neo-white w-4 h-4" />
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Character counter / Error */}
                <div className="flex justify-between items-center text-[10px] mt-1.5">
                  <div
                    className={cn(
                      'font-medium',
                      showNameError ? 'text-neo-red' : 'text-neo-black/60 dark:text-gray-400'
                    )}
                  >
                    {showNameError ? getErrorMessage() : `${minLength}-${maxLength} chars`}
                  </div>
                  <div
                    className={cn(
                      'font-bold',
                      displayName.length > maxLength ? 'text-neo-red' : 'text-neo-black/60 dark:text-gray-400'
                    )}
                  >
                    {displayName.length}/{maxLength}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="px-4 sm:px-5 pb-4 flex gap-2">
          <Button
            onClick={handleSkip}
            variant="outline"
            disabled={isSaving}
            className="flex-1 border-2 border-neo-black dark:border-slate-500 font-bold"
          >
            {t('profileCustomization.skipButton') || 'Skip'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isNameValid || isSaving}
            className="flex-1 bg-neo-lime hover:bg-neo-lime/90 text-neo-black font-bold border-3 border-neo-black shadow-hard"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-neo-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5 me-2" />
                {t('profileCustomization.saveButton') || 'Save'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCustomizationModal;
