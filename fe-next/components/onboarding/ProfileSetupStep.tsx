'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import AvatarSelectorButton from '@/components/join/AvatarSelectorButton';
import { cn } from '@/lib/utils';

interface ProfileSetupStepProps {
  customAvatar: CustomAvatarConfig;
  displayName: string;
  onAvatarSelect: (config: CustomAvatarConfig) => void;
  onNameChange: (name: string) => void;
  deferred?: boolean;
}

/**
 * ProfileSetupStep - Avatar builder + name input
 * Clicking the avatar opens the full AvatarBuilderModal
 */
const ProfileSetupStep: React.FC<ProfileSetupStepProps> = ({
  customAvatar,
  displayName,
  onAvatarSelect,
  onNameChange,
  deferred = false,
}) => {
  const { t } = useLanguage();
  const [nameTouched, setNameTouched] = useState(false);

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

  // Deferred mode: gentle prompt after first game
  if (deferred) {
    return (
      <m.div
        data-testid="deferred-profile-prompt"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-neo-cream border-3 border-neo-black rounded-neo p-4 shadow-hard-sm text-center max-w-sm mx-auto"
      >
        <h3 className="font-black text-neo-black text-sm uppercase mb-1">
          {t('onboarding.profile.deferredTitle', 'Save your progress?')}
        </h3>
        <p className="text-xs text-neo-black/70">
          {t('onboarding.profile.deferredSubtitle', 'Set up your profile to keep your stats!')}
        </p>
      </m.div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 sm:space-y-5 w-full max-w-md mx-auto">
      {/* Header */}
      <m.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-black text-neo-white uppercase">
          {t('onboarding.profile.title')}
        </h2>
        <p className="text-xs sm:text-sm text-neo-white">
          {t('onboarding.profile.subtitle')}
        </p>
      </m.div>

      {/* Avatar builder button + Name input */}
      <m.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full bg-neo-cream border-3 border-neo-black rounded-neo p-3 sm:p-4 shadow-hard-md"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Avatar preview — tap to open builder */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <AvatarSelectorButton
              selectedAvatar={customAvatar}
              onAvatarSelect={onAvatarSelect}
              t={t}
              size="lg"
            />
            <div className="text-[10px] sm:text-xs text-neo-black/60 text-center">
              {t('onboarding.profile.tapToCustomize', 'Tap to customize')}
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
                  onNameChange(e.target.value);
                }}
                onBlur={() => setNameTouched(true)}
                placeholder={t('onboarding.name.placeholder')}
                maxLength={maxLength}
                className={cn(
                  'w-full px-3 py-2.5 sm:py-3 bg-white border-3 border-neo-black rounded-neo',
                  'font-bold text-base sm:text-lg text-neo-black placeholder:text-neo-black/40',
                  'focus:outline-hidden focus:ring-3 focus:ring-neo-cyan',
                  'shadow-hard-sm transition-all',
                  'min-h-[44px]',
                  showNameError && 'border-neo-red focus:ring-neo-red',
                  isNameValid && displayName.length > 0 && 'border-neo-lime'
                )}
              />

              {/* Validation indicator */}
              {displayName.length > 0 && (
                <m.div
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
                </m.div>
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
      </m.div>
    </div>
  );
};

export default ProfileSetupStep;
