'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import AvatarSelectorButton from '@/components/join/AvatarSelectorButton';
import { cn } from '@/lib/utils';

interface ProfileCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
  initialAvatar?: CustomAvatarConfig | null;
  onSave: (name: string, avatarConfig: CustomAvatarConfig) => Promise<void>;
}

/**
 * ProfileCustomizationModal - Compact modal for new users to customize their profile
 * Uses the AvatarBuilderModal (via AvatarSelectorButton) for avatar customization
 */
const ProfileCustomizationModal: React.FC<ProfileCustomizationModalProps> = ({
  isOpen,
  onClose,
  defaultName,
  initialAvatar,
  onSave,
}) => {
  const { t, dir } = useLanguage();

  const [selectedAvatar, setSelectedAvatar] = useState<CustomAvatarConfig>(
    () => initialAvatar ?? getRandomAvatarConfig()
  );
  const [displayName, setDisplayName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplayName(defaultName);
      setSelectedAvatar(initialAvatar ?? getRandomAvatarConfig());
      setNameTouched(false);
    }
  }, [isOpen, defaultName, initialAvatar]);

  // Name validation
  const minLength = 2;
  const maxLength = 20;
  const isValidFormat = /^[\p{L}\p{N}\s._-]+$/u.test(displayName) || displayName === '';
  const isValidLength = displayName.trim().length >= minLength && displayName.length <= maxLength;
  const isNameValid = isValidFormat && isValidLength;
  const showNameError = nameTouched && displayName.length > 0 && !isNameValid;

  const getErrorMessage = () => {
    if (!isValidFormat) return t('validation.invalidCharacters');
    if (displayName.trim().length < minLength) return t('validation.usernameTooShort');
    if (displayName.length > maxLength) return t('validation.usernameTooLong');
    return '';
  };

  const handleSave = async () => {
    if (!isNameValid) return;

    setIsSaving(true);
    try {
      await onSave(displayName.trim(), selectedAvatar);
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await onSave(defaultName, selectedAvatar);
      onClose();
    } catch (error) {
      console.error('Failed to skip:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        noDescription
        className="max-w-md"
        dir={dir}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="bg-neo-cyan text-neo-black p-3 sm:p-4">
          <DialogTitle className="text-lg sm:text-xl font-black uppercase text-center">
            {t('profileCustomization.title')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4 px-4 sm:px-5 py-3">
          <p className="text-center text-sm text-neo-black/70 dark:text-gray-300">
            {t('profileCustomization.subtitle')}
          </p>

          {/* Avatar + Name input */}
          <div className="bg-neo-cream dark:bg-slate-700 border-3 border-neo-black dark:border-slate-600 rounded-neo p-3 shadow-hard-md">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Avatar builder button */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <AvatarSelectorButton
                  selectedAvatar={selectedAvatar}
                  onAvatarSelect={setSelectedAvatar}
                  t={t}
                  size="lg"
                />
                <div className="text-[10px] sm:text-xs text-neo-black/60 dark:text-gray-400 text-center">
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
                      setDisplayName(e.target.value);
                    }}
                    onBlur={() => setNameTouched(true)}
                    placeholder={t('profileCustomization.namePlaceholder')}
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
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-hard-sm shrink-0',
                        isNameValid
                          ? 'bg-neo-lime border-neo-black'
                          : 'bg-neo-red border-neo-black'
                      )}
                    >
                      {isNameValid ? (
                        <Check className="text-neo-black dark:text-neo-black w-4 h-4" />
                      ) : (
                        <X className="text-neo-black dark:text-neo-white w-4 h-4" />
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
                    {showNameError ? getErrorMessage() : `${minLength}-${maxLength} ${t('onboarding.name.characterCount', 'chars')}`}
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
            {t('profileCustomization.skipButton')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isNameValid || isSaving}
            className="flex-1 bg-neo-lime hover:bg-neo-lime/90 text-neo-black font-bold border-3 border-neo-black shadow-hard"
          >
            {isSaving ? (
              <Loader size="sm" />
            ) : (
              <>
                <Check className="w-5 h-5 me-2" />
                {t('profileCustomization.saveButton')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCustomizationModal;
