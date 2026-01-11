'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Check } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/button';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { AVATARS, getAvatarPath, type AvatarConfig } from '@/utils/avatarConfig';
import { fireConfetti } from '@/utils/confettiUtils';
import { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';

interface WinnerOnboardingProps {
  isOpen: boolean;
  onComplete: (displayName: string, avatarId: string) => void | Promise<void>;
  initialName?: string;
  initialAvatarId?: string;
  profilePictureUrl?: string;
  trigger?: 'firstCompletion' | 'streakAtRisk' | 'topPercentile' | 'quickSolve';
}

const WinnerOnboarding: React.FC<WinnerOnboardingProps> = ({
  isOpen,
  onComplete,
  initialName = '',
  initialAvatarId,
  profilePictureUrl,
  trigger = 'firstCompletion'
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  const [displayName, setDisplayName] = useState(initialName);

  // Determine if we should use profile picture by default
  const shouldUseProfilePicture = profilePictureUrl && initialAvatarId === PROFILE_AVATAR_ID;
  const [useProfilePicture, setUseProfilePicture] = useState(shouldUseProfilePicture);

  const [selectedAvatar, setSelectedAvatar] = useState<AvatarConfig>(() => {
    if (shouldUseProfilePicture) {
      return AVATARS[0]; // Default fallback, won't be shown if using profile picture
    }
    return AVATARS.find(a => a.id === initialAvatarId) || AVATARS[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync display name when initialName prop changes (e.g., after profile loads)
  useEffect(() => {
    if (initialName && initialName !== displayName) {
      setDisplayName(initialName);
    }
  }, [initialName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync profile picture state when props change
  useEffect(() => {
    const newShouldUseProfilePicture = profilePictureUrl && initialAvatarId === PROFILE_AVATAR_ID;
    if (newShouldUseProfilePicture !== useProfilePicture) {
      setUseProfilePicture(newShouldUseProfilePicture);
    }
    // Also update selected avatar if not using profile picture
    if (!newShouldUseProfilePicture && initialAvatarId) {
      const avatar = AVATARS.find(a => a.id === initialAvatarId);
      if (avatar) {
        setSelectedAvatar(avatar);
      }
    }
  }, [profilePictureUrl, initialAvatarId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire confetti on mount
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fireConfetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.3 },
          colors: ['#FFE135', '#00D9FF', '#10B981', '#FF6B6B', '#FF69B4']
        });
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  const handleComplete = useCallback(async () => {
    const trimmedName = displayName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 20) {
      setError('Name must be between 1 and 20 characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const avatarId = useProfilePicture ? PROFILE_AVATAR_ID : selectedAvatar.id;
      await onComplete(trimmedName, avatarId);
    } catch (err) {
      setError((err as Error).message || 'Failed to save profile');
      setIsSubmitting(false);
    }
  }, [displayName, selectedAvatar, useProfilePicture, onComplete]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleComplete();
    }
  }, [handleComplete, isSubmitting]);

  // Get celebration message based on trigger
  const getCelebrationMessage = () => {
    switch (trigger) {
      case 'topPercentile':
        return {
          title: t('auth.winnerOnboarding.topPercentile.title') || 'You\'re a Top Player!',
          subtitle: t('auth.winnerOnboarding.topPercentile.subtitle') || 'Show off your achievement on the leaderboard',
        };
      case 'quickSolve':
        return {
          title: t('auth.winnerOnboarding.quickSolve.title') || 'Lightning Fast!',
          subtitle: t('auth.winnerOnboarding.quickSolve.subtitle') || 'Let everyone see your impressive skills',
        };
      case 'streakAtRisk':
        return {
          title: t('auth.winnerOnboarding.streakAtRisk.title') || 'Streak Protected!',
          subtitle: t('auth.winnerOnboarding.streakAtRisk.subtitle') || 'Claim your spot on the leaderboard',
        };
      default:
        return {
          title: t('auth.winnerOnboarding.default.title') || 'Welcome Champion!',
          subtitle: t('auth.winnerOnboarding.default.subtitle') || 'Personalize your profile to shine on the leaderboard',
        };
    }
  };

  const celebrationMsg = getCelebrationMessage();

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            'w-full max-w-2xl rounded-2xl p-8 shadow-2xl overflow-hidden relative border-4',
            isDarkMode
              ? 'bg-neo-navy border-amber-500/50'
              : 'bg-white border-amber-400'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Trophy animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
            className="flex justify-center mb-6 relative"
          >
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <Trophy className="w-20 h-20 text-amber-400" />
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-300" />
            </motion.div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-black mb-3 text-neo-yellow">
              {celebrationMsg.title}
            </h1>
            <p className={cn(
              'text-lg',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            )}>
              {celebrationMsg.subtitle}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Avatar Selection */}
            <div>
              <label className={cn(
                'block text-sm font-bold mb-3 uppercase tracking-wide',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              )}>
                {t('auth.winnerOnboarding.chooseAvatar') || 'Choose Your Avatar'}
              </label>

              {/* Preview */}
              <div className="flex justify-center mb-4">
                <motion.div
                  key={useProfilePicture ? 'profile' : selectedAvatar.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative"
                >
                  <div className={cn(
                    'w-32 h-32 rounded-2xl overflow-hidden border-4 shadow-hard',
                    isDarkMode ? 'border-amber-400' : 'border-amber-500'
                  )}>
                    {useProfilePicture && profilePictureUrl ? (
                      <Image
                        src={profilePictureUrl}
                        alt="Your Profile"
                        width={128}
                        height={128}
                        className="object-cover"
                        priority
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Image
                        src={getAvatarPath(selectedAvatar)}
                        alt={selectedAvatar.name}
                        width={128}
                        height={128}
                        className="object-cover"
                        priority
                      />
                    )}
                  </div>
                  <div className={cn(
                    'absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border-2 text-xs font-bold whitespace-nowrap',
                    isDarkMode
                      ? 'bg-slate-800 border-amber-400 text-amber-300'
                      : 'bg-white border-amber-500 text-amber-700'
                  )}>
                    {useProfilePicture ? 'Your Profile' : selectedAvatar.name}
                  </div>
                </motion.div>
              </div>

              {/* Avatar Grid */}
              <div className={cn(
                'grid grid-cols-6 gap-3 p-4 rounded-xl border-2 max-h-64 overflow-y-auto',
                isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white/50 border-gray-300'
              )}>
                {/* Profile Picture Option (if available) */}
                {profilePictureUrl && (
                  <motion.button
                    key="profile-picture"
                    type="button"
                    onClick={() => setUseProfilePicture(true)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'relative w-full aspect-square rounded-xl overflow-hidden border-3 transition-all',
                      useProfilePicture
                        ? 'border-amber-400 ring-4 ring-amber-400/50'
                        : 'border-neo-black hover:border-gray-500'
                    )}
                  >
                    <Image
                      src={profilePictureUrl}
                      alt="Your Profile"
                      fill
                      sizes="80px"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {useProfilePicture && (
                      <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-amber-600 drop-shadow" />
                      </div>
                    )}
                    {/* Label */}
                    <div className="absolute bottom-0 left-0 right-0 bg-neo-black/80 text-white text-[9px] font-bold text-center py-0.5">
                      YOU
                    </div>
                  </motion.button>
                )}

                {/* Regular Character Avatars */}
                {AVATARS.map((avatar) => (
                  <motion.button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(avatar);
                      setUseProfilePicture(false);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'relative w-full aspect-square rounded-xl overflow-hidden border-3 transition-all',
                      !useProfilePicture && selectedAvatar.id === avatar.id
                        ? 'border-amber-400 ring-4 ring-amber-400/50'
                        : 'border-neo-black hover:border-gray-500'
                    )}
                  >
                    <Image
                      src={getAvatarPath(avatar)}
                      alt={avatar.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                    {!useProfilePicture && selectedAvatar.id === avatar.id && (
                      <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-amber-600 drop-shadow" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Display Name Input */}
            <div>
              <label className={cn(
                'block text-sm font-bold mb-2 uppercase tracking-wide',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              )}>
                {t('auth.winnerOnboarding.displayName') || 'Your Display Name'}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={handleKeyPress}
                maxLength={20}
                autoFocus
                placeholder={t('auth.winnerOnboarding.namePlaceholder') || 'Enter your name...'}
                className={cn(
                  'w-full px-4 py-3 text-lg font-bold border-3 border-neo-black rounded-xl transition-all',
                  isDarkMode
                    ? 'bg-slate-700 text-white placeholder-gray-500 focus:ring-4 focus:ring-amber-400/50'
                    : 'bg-white text-neo-black placeholder-gray-400 focus:ring-4 focus:ring-amber-400/50',
                  error ? 'border-red-500' : ''
                )}
              />
              <div className="flex justify-between items-center mt-1">
                <p className={cn(
                  'text-xs',
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                )}>
                  {displayName.length}/20 {t('daily.characters') || 'characters'}
                </p>
                {error && (
                  <p className="text-xs text-red-500 font-semibold">{error}</p>
                )}
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleComplete}
              disabled={isSubmitting || displayName.trim().length < 1 || displayName.trim().length > 20}
              className={cn(
                'w-full h-14 text-xl font-black rounded-xl border-4 shadow-hard transition-all',
                'hover:shadow-hard-lg hover:-translate-y-1',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
                'bg-neo-yellow border-amber-600 text-neo-black'
              )}
              asChild={false}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-6 h-6 border-3 border-current border-t-transparent rounded-full animate-spin" />
                  <span>{t('auth.winnerOnboarding.saving') || 'Saving...'}</span>
                </div>
              ) : (
                <>
                  <Trophy className="w-6 h-6 mr-2" />
                  {t('auth.winnerOnboarding.showMeLeaderboard') || 'Show Me On The Leaderboard!'}
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default WinnerOnboarding;
