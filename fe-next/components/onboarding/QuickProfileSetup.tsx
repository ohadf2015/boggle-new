'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Shuffle, Pencil, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { type CustomAvatarConfig, getRandomAvatarConfig } from '@/shared/types/customAvatar';
import Avatar from '@/components/Avatar';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import InviteContextBanner from './InviteContextBanner';
import { suggestPlayerName } from '@/utils/onboardingNameSuggestions';
import OnboardingGoogleSignup from './OnboardingGoogleSignup';
import { useImeText } from '@/hooks/useImeText';
import { useMobileKeyboard } from '@/hooks/useMobileKeyboard';
import { cn } from '@/lib/utils';
import { NeoPanel } from '@/components/ui/panel';

interface QuickProfileSetupProps {
  onComplete: (name: string, avatar: CustomAvatarConfig, nameEdited: boolean) => void;
  onSkip?: () => void;
  hasPendingInvite?: boolean;
  inviteContext?: { roomCode: string; hostName?: string };
  onSkipInvite?: () => void;
}

/**
 * QuickProfileSetup - Compact slide-up card for name + avatar.
 * Step 3 of the FTUE: Identity (60-90s).
 * NOT a modal — slides up as an inline card.
 */
const QuickProfileSetup: React.FC<QuickProfileSetupProps> = ({
  onComplete,
  hasPendingInvite,
  inviteContext,
  onSkipInvite,
}) => {
  const { t, dir, language } = useLanguage();
  // Initial suggestion is locale-aware. We snapshot it in a ref so we can
  // tell later whether the user edited the field (force-customize gating).
  const initialSuggestionRef = useRef<string>('');
  if (initialSuggestionRef.current === '') {
    initialSuggestionRef.current = suggestPlayerName(language);
  }
  // IME-resilient input. Mobile keyboards (Android GBoard, RTL/Hebrew, swipe &
  // autocorrect) buffer composition and commit text WITHOUT firing React's
  // synthetic onChange. A naive `value={name}` controlled input then keeps
  // forcing the DOM back to the stale suggestion — so the user "can't change
  // their name". The hook mirrors the live DOM value via onInput/compositionEnd.
  const {
    ref: inputRef,
    value: name,
    getValue: getLiveName,
    setValue: setName,
    inputProps,
  } = useImeText<HTMLInputElement>({ maxLength: 20, initialValue: initialSuggestionRef.current });
  const [avatar, setAvatar] = useState<CustomAvatarConfig>(getRandomAvatarConfig);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0);
  const [showShake, setShowShake] = useState(false);
  const [justValidated, setJustValidated] = useState(false);
  const previouslyValidRef = useRef(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  // When the soft keyboard opens, the layout viewport shrinks (viewport
  // `interactiveWidget: resizes-content`). Pull the primary CTA into view so it's
  // never stranded under the keyboard — the core "can't reach Continue" fix.
  const { keyboardVisible } = useMobileKeyboard();
  useEffect(() => {
    if (keyboardVisible) {
      submitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [keyboardVisible]);

  const trimmedName = name.trim();
  const nameCharCount = Array.from(trimmedName).length;
  const isNameValid = nameCharCount >= 2 && nameCharCount <= 20 && /^[\p{L}\p{N}\s._-]+$/u.test(trimmedName);

  // Pulse the input once, the first frame a name transitions invalid → valid.
  // Using a ref guard keeps this a single celebration per validation flip.
  useEffect(() => {
    if (!isNameValid) {
      previouslyValidRef.current = false;
      return () => {};
    }
    if (previouslyValidRef.current) {
      return () => {};
    }
    previouslyValidRef.current = true;
    setJustValidated(true);
    const timer = setTimeout(() => setJustValidated(false), 600);
    return () => clearTimeout(timer);
  }, [isNameValid]);

  const handleRandomize = useCallback(() => {
    setAvatar(getRandomAvatarConfig());
    setAvatarKey((k) => k + 1);
    const next = suggestPlayerName(language);
    initialSuggestionRef.current = next;
    setName(next);
    previouslyValidRef.current = false;
  }, [language, setName]);

  const handleBuilderSave = useCallback((config: CustomAvatarConfig) => {
    setAvatar(config);
    setIsBuilderOpen(false);
  }, []);

  const handleSubmit = useCallback(() => {
    // getLiveName() reads the DOM ref directly (and trims/caps) as the source of
    // truth — React state can still lag mid-composition on mobile keyboards.
    const liveTrimmed = getLiveName();
    const liveCount = Array.from(liveTrimmed).length;
    const liveValid =
      liveCount >= 2 && liveCount <= 20 && /^[\p{L}\p{N}\s._-]+$/u.test(liveTrimmed);

    if (!liveValid) {
      setShowShake(true);
      setTimeout(() => setShowShake(false), 500);
      inputRef.current?.focus();
      return;
    }
    const nameEdited = liveTrimmed !== initialSuggestionRef.current.trim();
    onComplete(liveTrimmed, avatar, nameEdited);
  }, [getLiveName, inputRef, avatar, onComplete]);

  const staggerChild = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.15 + i * 0.1, type: 'spring' as const, stiffness: 400, damping: 28 },
    }),
  };

  return (
    <m.div
      data-testid="quick-profile-setup"
      initial={{ y: 60, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="w-full max-w-sm lg:max-w-lg mx-auto"
      dir={dir}
    >
      <NeoPanel tone="cream" shadow="md" className="p-6 sm:p-7 lg:p-9">
        {inviteContext && onSkipInvite && (
          <InviteContextBanner
            roomCode={inviteContext.roomCode}
            hostName={inviteContext.hostName}
            onSkip={onSkipInvite}
          />
        )}
        {/* Header */}
        <m.h2
          custom={0}
          variants={staggerChild}
          initial="hidden"
          animate="visible"
          className="text-xl font-black text-neo-black text-center mb-4"
        >
          {hasPendingInvite ? t('onboarding.ftue.friendIsWaiting') : t('onboarding.ftue.niceWork')}
        </m.h2>
        {/* Avatar (clickable to open builder) + randomize */}
        <m.div
          custom={1}
          variants={staggerChild}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center mb-4"
        >
          <div className="flex items-end justify-center gap-4">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <m.button
                onClick={handleRandomize}
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={cn(
                  // Neutral at rest (color only on hover) so the avatar + pink CTA
                  // are the only saturated elements — calmer palette, clear hierarchy.
                  'w-11 h-11 rounded-full border-2 border-neo-black bg-neo-white',
                  'hover:bg-neo-yellow transition-colors',
                  'flex items-center justify-center shadow-hard-sm'
                )}
                aria-label={t('onboarding.ftue.randomize', 'Randomize avatar')}
              >
                <Shuffle className="w-5 h-5 text-neo-black" />
              </m.button>
              <span className="text-[10px] font-bold text-neo-black/70">{t('onboarding.ftue.randomize', 'Randomize')}</span>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <m.button
                data-testid="avatar-edit-button"
                onClick={() => setIsBuilderOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group"
                aria-label={t('onboarding.ftue.editAvatar', 'Customize avatar')}
              >
                <div className={cn(
                  'w-20 h-20 shrink-0 rounded-full border-3 border-neo-black',
                  'overflow-hidden bg-neo-white shadow-hard-sm'
                )}>
                  <AnimatePresence mode="wait">
                    <m.div
                      key={avatarKey}
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="w-full h-full"
                    >
                      <Avatar customAvatar={avatar} size="xl" />
                    </m.div>
                  </AnimatePresence>
                </div>
                <div className={cn(
                  'absolute -bottom-1 -inset-e-1 w-7 h-7',
                  'bg-neo-lime border-2 border-neo-black rounded-full',
                  'flex items-center justify-center shadow-hard-sm',
                  'group-hover:scale-110 transition-transform'
                )}>
                  <Pencil className="w-3.5 h-3.5 text-neo-black" />
                </div>
              </m.button>
              <span className="text-[10px] font-bold text-neo-black/70">{t('onboarding.profile.tapToCustomize', 'Tap to customize')}</span>
            </div>
          </div>
        </m.div>

        <AvatarBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          onSave={handleBuilderSave}
          initialConfig={avatar}
          premium={null}
        />

        {/* Name input */}
        <m.div
          custom={2}
          variants={staggerChild}
          initial="hidden"
          animate="visible"
        >
          <label htmlFor="profile-name" className="block text-[10px] font-black text-neo-black/70 uppercase tracking-wide mb-1">
            {t('onboarding.name.label')}
          </label>
          <m.div
            className="relative"
            animate={
              showShake
                ? { x: [0, -6, 6, -4, 4, 0] }
                : justValidated
                ? { scale: [1, 1.04, 1] }
                : {}
            }
            transition={{ duration: justValidated ? 0.5 : 0.4, ease: 'easeOut' }}
          >
            <input
              {...inputProps}
              id="profile-name"
              type="text"
              onKeyDown={(e) => { if (e.key === 'Enter' && isNameValid) handleSubmit(); }}
              placeholder={t('onboarding.name.placeholder')}
              // Intentionally NOT autoFocused: let the avatar (the fun, first
              // impression) land before the keyboard slams up and shifts the
              // layout. The keyboard opens only when the player taps the field.
              maxLength={20}
              autoComplete="off"
              className={cn(
                'w-full px-3 py-3 bg-white border-3 border-neo-black rounded-neo',
                'font-bold text-lg text-neo-black placeholder:text-neo-black/60',
                'focus:outline-hidden focus:ring-3 focus:ring-neo-cyan',
                'shadow-hard-sm mb-1 min-h-[48px] pe-10',
                isNameValid && trimmedName.length > 0 && 'border-neo-lime',
                !isNameValid && name.length > 0 && 'border-neo-red'
              )}
            />
            {/* Success check badge — pops in when the name first becomes valid */}
            <AnimatePresence>
              {isNameValid && (
                <m.div
                  key="valid-check"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 45 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  className="absolute top-1/2 -translate-y-1/2 inset-e-2 w-6 h-6 bg-neo-lime border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm pointer-events-none"
                  aria-hidden
                >
                  <Check className="w-3.5 h-3.5 text-neo-black" strokeWidth={3} />
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
          <div className="flex justify-between text-[10px] font-bold text-neo-black/70 mb-4 px-0.5">
            <span>{t('onboarding.ftue.nameHint')}</span>
            <span>{name.length}/20</span>
          </div>
        </m.div>

        {/* Submit button */}
        <m.button
          ref={submitRef}
          custom={3}
          variants={staggerChild}
          initial="hidden"
          animate="visible"
          onClick={handleSubmit}
          aria-disabled={!isNameValid}
          whileHover={isNameValid ? { scale: 1.02, y: -2 } : {}}
          whileTap={isNameValid ? { scale: 0.98, y: 2 } : {}}
          className={cn(
            'w-full py-3 border-3 border-neo-black rounded-neo',
            'font-black text-lg uppercase',
            'shadow-hard-sm transition-all',
            isNameValid
              ? 'bg-neo-pink text-neo-white hover:shadow-hard'
              : 'bg-neo-black/15 text-neo-black/35 cursor-not-allowed shadow-none'
          )}
        >
          {hasPendingInvite ? t('onboarding.ftue.joinFriendsGame') : t('onboarding.ftue.letsGo')}
        </m.button>

        {/* Optional Google signup — secondary to the guest "Let's Go". Hidden in
            the invite flow, where joining the friend's room is the priority.
            Lets a brand-new player lock in the avatar + name they just crafted. */}
        {!hasPendingInvite && (
          <OnboardingGoogleSignup
            name={name}
            avatar={avatar}
            nameValid={isNameValid}
            nameEdited={trimmedName !== initialSuggestionRef.current.trim()}
          />
        )}
      </NeoPanel>
    </m.div>
  );
};

export default QuickProfileSetup;
