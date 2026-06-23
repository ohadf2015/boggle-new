'use client';

import React, { useState, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import { Check, X, Sparkles, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { Loader } from '@/components/ui/Loader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import AvatarSelectorButton from '@/components/join/AvatarSelectorButton';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import { cn } from '@/lib/utils';

interface ProfileCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
  initialAvatar?: CustomAvatarConfig | null;
  onSave: (name: string, avatarConfig: CustomAvatarConfig) => Promise<void>;
}

/**
 * ProfileCustomizationModal - Required modal for new users to set their name and avatar.
 * Name is mandatory (no skip). Avatar defaults to random if not customized.
 */
const ProfileCustomizationModal: React.FC<ProfileCustomizationModalProps> = ({
  isOpen,
  onClose,
  defaultName,
  initialAvatar,
  onSave,
}) => {
  const { t, dir } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  // Families Policy: a KNOWN child may not set a freeform display name visible
  // to strangers (personal info) unless an adult enabled it. Only gate confirmed
  // children — `unknown` age (e.g. mid-onboarding, before the age screen) must
  // still be able to pick a name, or every new user would be locked.
  const { tier, caps } = useSocialCapabilities();
  const lockName = tier === 'child' && !caps.customDisplayName;

  const [selectedAvatar, setSelectedAvatar] = useState<CustomAvatarConfig>(
    () => initialAvatar ?? getRandomAvatarConfig()
  );
  const [displayName, setDisplayName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [showShake, setShowShake] = useState(false);

  // Reset state only when modal first opens (not on prop changes while open)
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = isOpen && !prevOpenRef.current;
    prevOpenRef.current = isOpen;
    if (justOpened) {
      setDisplayName(defaultName);
      setSelectedAvatar(initialAvatar ?? getRandomAvatarConfig());
      setNameTouched(false);
      // Auto-focus the name input after a brief delay
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen, defaultName, initialAvatar]);

  // Name validation
  const minLength = 2;
  const maxLength = 20;
  const trimmedName = displayName.trim();
  const isValidFormat = /^[\p{L}\p{N}\s._-]+$/u.test(displayName) || displayName === '';
  const isValidLength = trimmedName.length >= minLength && displayName.length <= maxLength;
  const isNameValid = isValidFormat && isValidLength;
  const isEmpty = trimmedName.length === 0;
  const showNameError = nameTouched && displayName.length > 0 && !isNameValid;

  const getErrorMessage = () => {
    if (!isValidFormat) return t('validation.invalidCharacters');
    if (trimmedName.length < minLength) return t('validation.usernameTooShort');
    if (displayName.length > maxLength) return t('validation.usernameTooLong');
    return '';
  };

  const handleSave = async () => {
    setNameTouched(true);
    if (!isNameValid) {
      // Shake the input to indicate error
      setShowShake(true);
      setTimeout(() => setShowShake(false), 500);
      inputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setSaveError(false);
    try {
      await onSave(trimmedName, selectedAvatar);
      onClose();
    } catch (error) {
      setSaveError(true);
      // Serialize Error explicitly — passing a raw Error to console.error
      // yields `{}` in Sentry because Error has no enumerable own-properties.
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to save profile:', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && isNameValid) {
      handleSave();
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
        {/* Header with gradient */}
        <DialogHeader className="bg-linear-to-r from-neo-cyan via-neo-cyan to-neo-lime text-neo-black p-4 sm:p-5 relative overflow-hidden">
          <Sparkles className="absolute top-2 right-3 w-4 h-4 text-neo-black/20 animate-pulse" aria-hidden="true" />
          <Sparkles className="absolute bottom-2 left-4 w-3 h-3 text-neo-black/15 animate-pulse" aria-hidden="true" />
          <DialogTitle className="text-xl sm:text-2xl font-black uppercase text-center tracking-tight">
            {t('profileCustomization.title')}
          </DialogTitle>
          <p className="text-sm text-neo-black/60 text-center mt-1 font-bold">
            {t('profileCustomization.subtitle')}
          </p>
        </DialogHeader>

        <DialogBody className="px-4 sm:px-5 py-5">
          {/* Avatar section — centered, prominent */}
          <div className="flex flex-col items-center mb-5">
            <AvatarSelectorButton
              selectedAvatar={selectedAvatar}
              onAvatarSelect={setSelectedAvatar}
              t={t}
              size="lg"
            />
            <div className="text-xs text-neo-black/50 dark:text-gray-400 text-center mt-2 font-bold">
              {t('onboarding.profile.tapToCustomize', 'Tap to customize')}
            </div>
          </div>

          {/* Name input — full width, prominent */}
          <div className="bg-neo-cream dark:bg-neo-navy-elevated border-3 border-neo-black dark:border-slate-600 rounded-neo p-3 shadow-hard-sm">
            <label className="block text-xs font-black text-neo-black/70 dark:text-gray-300 uppercase tracking-wide mb-1.5">
              {t('validation.usernameRequired')}
            </label>
            <div className="flex items-center gap-2">
              <m.div
                className="flex-1"
                animate={showShake ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setNameTouched(true);
                    setDisplayName(e.target.value);
                  }}
                  onBlur={() => setNameTouched(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('profileCustomization.namePlaceholder')}
                  maxLength={maxLength}
                  autoComplete="off"
                  readOnly={lockName}
                  aria-disabled={lockName}
                  className={cn(
                    'w-full px-3 py-3 bg-white dark:bg-slate-600 border-3 border-neo-black dark:border-slate-500 rounded-neo',
                    'font-bold text-lg text-neo-black dark:text-white placeholder:text-neo-black/30 dark:placeholder:text-gray-400',
                    'focus:outline-hidden focus:ring-3 focus:ring-neo-cyan',
                    'shadow-hard-sm transition-all',
                    'min-h-[48px]',
                    lockName && 'opacity-60 cursor-not-allowed',
                    showNameError && 'border-neo-red focus:ring-neo-red',
                    isNameValid && !isEmpty && 'border-neo-lime'
                  )}
                />
              </m.div>

              {/* Validation indicator */}
              {displayName.length > 0 && (
                <Reveal
                  noSlide
                  className={cn(
                    'w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-hard-sm shrink-0',
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
                </Reveal>
              )}
            </div>

            {/* Character counter / Error */}
            <div className="flex justify-between items-center text-[10px] mt-1.5 px-0.5">
              <div
                className={cn(
                  'font-bold',
                  showNameError ? 'text-neo-red' : 'text-neo-black/50 dark:text-gray-400'
                )}
              >
                {showNameError
                  ? getErrorMessage()
                  : isEmpty && nameTouched
                    ? t('validation.usernameRequired')
                    : `${minLength}-${maxLength} ${t('onboarding.name.characterCount', 'chars')}`}
              </div>
              <div
                className={cn(
                  'font-bold',
                  displayName.length > maxLength ? 'text-neo-red' : 'text-neo-black/50 dark:text-gray-400'
                )}
              >
                {displayName.length}/{maxLength}
              </div>
            </div>

            {lockName && (
              <p className="mt-1.5 text-[11px] font-bold text-neo-black/60 dark:text-gray-400">
                {t('familiesSafety.nameLockedNote')}
              </p>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="px-4 sm:px-5 pb-4">
          {saveError && (
            <p className="text-neo-red text-xs font-bold text-center mb-2">
              {t('profileCustomization.saveError', 'Failed to save. Please try again.')}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'w-full py-3.5 font-black text-lg uppercase rounded-neo border-3 border-neo-black transition-all',
              isNameValid && !isEmpty
                ? 'bg-accent text-accent-foreground shadow-hard hover:translate-y-[-2px] hover:shadow-hard-lg active:translate-y-px active:shadow-hard-sm'
                : 'bg-neo-black/20 text-neo-black/40 dark:bg-slate-600 dark:text-gray-500 cursor-not-allowed shadow-none',
              'flex items-center justify-center gap-2'
            )}
          >
            {isSaving ? (
              <Loader size="sm" />
            ) : (
              <>
                {t('profileCustomization.saveButton')}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCustomizationModal;
