'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Check, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/button';
import { Loader } from '@/components/ui/Loader';
import { Reveal } from '@/components/ui/Reveal';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { AVATARS, getAvatarPath, type AvatarConfig } from '@/utils/avatarConfig';
import { fireConfetti } from '@/utils/confettiUtils';


interface WinnerOnboardingProps {
  isOpen: boolean;
  onComplete: (displayName: string, avatarId: string) => void | Promise<void>;
  initialName?: string;
  initialAvatarId?: string;
  trigger?: 'firstCompletion' | 'streakAtRisk' | 'topPercentile' | 'quickSolve';
}

const WinnerOnboarding: React.FC<WinnerOnboardingProps> = ({
  isOpen,
  onComplete,
  initialName = '',
  initialAvatarId,
  trigger = 'firstCompletion'
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  const [displayName, setDisplayName] = useState(initialName);

  const [selectedAvatar, setSelectedAvatar] = useState<AvatarConfig>(() => {
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
      const avatarId = selectedAvatar.id;
      await onComplete(trimmedName, avatarId);
    } catch (err) {
      setError((err as Error).message || 'Failed to save profile');
      setIsSubmitting(false);
    }
  }, [displayName, selectedAvatar, onComplete]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !isSubmitting) {
      handleComplete();
    }
  }, [handleComplete, isSubmitting]);

  // Get celebration message based on trigger
  const getCelebrationMessage = () => {
    switch (trigger) {
      case 'topPercentile':
        return {
          title: t('auth.winnerOnboarding.topPercentile.title'),
          subtitle: t('auth.winnerOnboarding.topPercentile.subtitle'),
        };
      case 'quickSolve':
        return {
          title: t('auth.winnerOnboarding.quickSolve.title'),
          subtitle: t('auth.winnerOnboarding.quickSolve.subtitle'),
        };
      case 'streakAtRisk':
        return {
          title: t('auth.winnerOnboarding.streakAtRisk.title'),
          subtitle: t('auth.winnerOnboarding.streakAtRisk.subtitle'),
        };
      default:
        return {
          title: t('auth.winnerOnboarding.default.title'),
          subtitle: t('auth.winnerOnboarding.default.subtitle'),
        };
    }
  };

  const celebrationMsg = getCelebrationMessage();

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <Reveal
        noSlide
        className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <Reveal
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
          <Reveal
            noSlide
            className="flex justify-center mb-6 relative"
          >
            <m.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <Trophy className="w-20 h-20 text-amber-400" />
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-300" />
            </m.div>
          </Reveal>

          {/* Header */}
          <Reveal
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-black mb-3 text-neo-lime">
              {celebrationMsg.title}
            </h1>
            <p className={cn(
              'text-lg',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            )}>
              {celebrationMsg.subtitle}
            </p>
          </Reveal>

          <Reveal
            noSlide
            className="space-y-6"
          >
            {/* Avatar Selection */}
            <div>
              <label className={cn(
                'block text-sm font-bold mb-3 uppercase tracking-wide',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              )}>
                {t('auth.winnerOnboarding.chooseAvatar')}
              </label>

              {/* Preview */}
              <div className="flex justify-center mb-4">
                <Reveal
                  key={selectedAvatar.id}
                  noSlide
                  className="relative"
                >
                  <div className={cn(
                    'w-32 h-32 rounded-2xl overflow-hidden border-4 shadow-hard',
                    isDarkMode ? 'border-amber-400' : 'border-amber-500'
                  )}>
                    <Image
                      src={getAvatarPath(selectedAvatar)}
                      alt={selectedAvatar.name}
                      width={128}
                      height={128}
                      className="object-cover"
                      priority
                    />
                  </div>
                  <div className={cn(
                    'absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border-2 text-xs font-bold whitespace-nowrap',
                    isDarkMode
                      ? 'bg-neo-navy-light border-amber-400 text-amber-300'
                      : 'bg-white border-amber-500 text-amber-700'
                  )}>
                    {selectedAvatar.name}
                  </div>
                </Reveal>
              </div>

              {/* Avatar Grid */}
              <div className={cn(
                'grid grid-cols-6 gap-3 p-4 rounded-xl border-2 max-h-64 overflow-y-auto',
                isDarkMode ? 'bg-neo-navy-elevated/50 border-slate-600' : 'bg-white/50 border-gray-300'
              )}>

                {/* Regular Character Avatars */}
                {AVATARS.map((avatar) => (
                  <m.button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(avatar);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'relative w-full aspect-square rounded-xl overflow-hidden border-3 transition-all',
                      selectedAvatar.id === avatar.id
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
                    {selectedAvatar.id === avatar.id && (
                      <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-amber-600 drop-shadow-sm" />
                      </div>
                    )}
                  </m.button>
                ))}
              </div>
            </div>

            {/* Display Name Input */}
            <div>
              <label htmlFor="winner-display-name" className={cn(
                'block text-sm font-bold mb-2 uppercase tracking-wide',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              )}>
                {t('auth.winnerOnboarding.displayName')}
              </label>
              <input
                id="winner-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={handleKeyPress}
                maxLength={20}
                autoFocus
                placeholder={t('auth.winnerOnboarding.namePlaceholder')}
                className={cn(
                  'w-full px-4 py-3 text-lg font-bold border-3 border-neo-black rounded-xl transition-all',
                  isDarkMode
                    ? 'bg-neo-navy-elevated text-white placeholder-gray-500 focus:ring-4 focus:ring-amber-400/50'
                    : 'bg-white text-neo-black placeholder-gray-400 focus:ring-4 focus:ring-amber-400/50',
                  error ? 'border-red-500' : ''
                )}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'winner-name-error' : undefined}
              />
              <div className="flex justify-between items-center mt-1">
                <p className={cn(
                  'text-xs',
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                )}>
                  {displayName.length}/20 {t('daily.characters')}
                </p>
                {error && (
                  <p id="winner-name-error" className="text-xs text-red-500 font-semibold flex items-center gap-1" role="alert"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p>
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
                'bg-neo-lime border-amber-600 text-neo-black'
              )}
              asChild={false}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader size="sm" />
                  <span>{t('auth.winnerOnboarding.saving')}</span>
                </div>
              ) : (
                <>
                  <Trophy className="w-6 h-6 me-2" />
                  {t('auth.winnerOnboarding.showMeLeaderboard')}
                </>
              )}
            </Button>
          </Reveal>
        </Reveal>
      </Reveal>
    </AnimatePresence>,
    document.body
  );
};

export default WinnerOnboarding;
