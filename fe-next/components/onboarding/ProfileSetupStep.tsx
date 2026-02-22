'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AVATARS, getAvatarPath, getAvatarById } from '@/utils/avatarConfig';
import { cn } from '@/lib/utils';

interface ProfileSetupStepProps {
  selectedAvatarId: string;
  displayName: string;
  onAvatarSelect: (avatarId: string) => void;
  onNameChange: (name: string) => void;
}

/**
 * ProfileSetupStep - Combined avatar selection and name input
 * Avatar picker comes first - selecting an avatar auto-fills the name
 */
const ProfileSetupStep: React.FC<ProfileSetupStepProps> = ({
  selectedAvatarId,
  displayName,
  onAvatarSelect,
  onNameChange,
}) => {
  const { t } = useLanguage();
  const [nameTouched, setNameTouched] = useState(false);
  const [hasManuallyEditedName, setHasManuallyEditedName] = useState(false);

  // Check if current name is a default avatar name
  const isDefaultAvatarName = (name: string): boolean => {
    return AVATARS.some(avatar => avatar.name === name);
  };

  // Auto-fill name from avatar on initial load (if name is empty)
  useEffect(() => {
    if (!displayName && selectedAvatarId && !hasManuallyEditedName) {
      const avatar = getAvatarById(selectedAvatarId);
      if (avatar) {
        onNameChange(avatar.name);
      }
    }
  }, [selectedAvatarId, displayName, hasManuallyEditedName, onNameChange]);

  // Handle avatar selection - auto-fill name if not manually edited OR if current name is a default avatar name
  const handleAvatarSelect = (avatarId: string) => {
    onAvatarSelect(avatarId);
    // Update name if user hasn't manually edited OR if current name is a default avatar name
    if (!hasManuallyEditedName || isDefaultAvatarName(displayName)) {
      const avatar = getAvatarById(avatarId);
      if (avatar) {
        onNameChange(avatar.name);
        // Reset manual edit flag since we're using a default name
        setHasManuallyEditedName(false);
      }
    }
  };

  // Name validation
  const minLength = 2;
  const maxLength = 20;
  const isValidFormat = /^[\p{L}\p{N}\s._-]+$/u.test(displayName) || displayName === '';
  const isValidLength = displayName.trim().length >= minLength && displayName.length <= maxLength;
  const isNameValid = isValidFormat && isValidLength;
  const showNameError = nameTouched && displayName.length > 0 && !isNameValid;

  const getErrorMessage = () => {
    if (!isValidFormat) return t('onboarding.name.errorInvalid');
    if (displayName.trim().length < minLength) return t('onboarding.name.errorTooShort');
    if (displayName.length > maxLength) return t('onboarding.name.errorTooLong');
    return '';
  };

  const selectedAvatar = AVATARS.find((a) => a.id === selectedAvatarId) || AVATARS[0];

  return (
    <div className="flex flex-col items-center space-y-4 sm:space-y-5 w-full max-w-md mx-auto">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-black text-neo-white uppercase">
          {t('onboarding.profile.title')}
        </h2>
        <p className="text-xs sm:text-sm text-neo-white/70">
          {t('onboarding.profile.subtitle')}
        </p>
      </motion.div>

      {/* Avatar grid - FIRST (pick your character) */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full"
      >
        <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5 sm:gap-2">
          {AVATARS.map((avatar, index) => {
            const isSelected = avatar.id === selectedAvatarId;

            return (
              <motion.button
                key={avatar.id}
                onClick={() => handleAvatarSelect(avatar.id)}
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
                transition={{ delay: 0.2 + index * 0.015, type: 'spring', stiffness: 500, damping: 28 }}
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
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="absolute inset-0 bg-neo-cyan/20 flex items-center justify-center"
                  >
                    <div className="bg-neo-pink text-white border-2 border-neo-black rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-black text-[10px] shadow-hard-sm">
                      ✓
                    </div>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Selected avatar preview + Name input row - SECOND */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full bg-neo-cream border-3 border-neo-black rounded-neo p-3 sm:p-4 shadow-hard-md"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-3 border-neo-black shadow-hard-sm bg-neo-lime text-neo-black">
              <Image
                src={getAvatarPath(selectedAvatar)}
                alt={selectedAvatar.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-[10px] sm:text-xs text-neo-black/60 text-center max-w-[80px] truncate">
              {selectedAvatar.name}
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
                  setHasManuallyEditedName(true);
                  onNameChange(e.target.value);
                }}
                onBlur={() => setNameTouched(true)}
                placeholder={t('onboarding.name.placeholder')}
                maxLength={maxLength}
                className={cn(
                  'w-full px-3 py-2.5 sm:py-3 bg-white border-3 border-neo-black rounded-neo',
                  'font-bold text-base sm:text-lg text-neo-black placeholder:text-neo-black/40',
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
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className={cn(
                    'w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center shadow-hard-sm shrink-0',
                    isNameValid
                      ? 'bg-neo-lime border-neo-black'
                      : 'bg-neo-red border-neo-black'
                  )}
                >
                  {isNameValid ? (
                    <Check className="text-neo-black text-sm" />
                  ) : (
                    <X className="text-neo-white text-sm" />
                  )}
                </motion.div>
              )}
            </div>

            {/* Character counter / Error */}
            <div className="flex justify-between items-center text-[10px] sm:text-xs mt-1.5">
              <div
                className={cn(
                  'font-medium',
                  showNameError ? 'text-neo-red' : 'text-neo-black/60'
                )}
              >
                {showNameError ? getErrorMessage() : `${minLength}-${maxLength} ${t('onboarding.name.characterCount')}`}
              </div>
              <div
                className={cn(
                  'font-bold',
                  displayName.length > maxLength ? 'text-neo-red' : 'text-neo-black/60'
                )}
              >
                {displayName.length}/{maxLength}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSetupStep;
