'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, X, Flame, Dumbbell, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { KEEP_PLAYING_DISMISSED_KEY } from '@/utils/dailyChallenge';

/**
 * Check if the user has dismissed the keep playing section today
 */
export function hasDisminisedKeepPlayingToday(): boolean {
  if (typeof window === 'undefined') return false;

  const dismissedDate = localStorage.getItem(KEEP_PLAYING_DISMISSED_KEY);
  if (!dismissedDate) return false;

  // Check if dismissed today
  const today = new Date().toISOString().split('T')[0];
  return dismissedDate === today;
}

/**
 * Mark the keep playing section as dismissed for today
 */
export function dismissKeepPlayingToday(): void {
  if (typeof window === 'undefined') return;

  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(KEEP_PLAYING_DISMISSED_KEY, today);
}

interface KeepPlayingSectionProps {
  /** Whether the player succeeded (solved the challenge or got a good score) */
  isSuccess: boolean;
  /** Optional: Time survived in seconds (for survival mode) */
  timeSurvived?: number;
  /** Optional: Efficiency score */
  efficiencyScore?: number;
}

/**
 * KeepPlayingSection - Encourages players to try other game modes after daily challenge
 * Shows different messaging based on success/failure
 */
const KeepPlayingSection: React.FC<KeepPlayingSectionProps> = ({
  isSuccess,
  timeSurvived,
  efficiencyScore,
}) => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash

  // Check dismissal state on mount
  useEffect(() => {
    setIsDismissed(hasDisminisedKeepPlayingToday());
  }, []);

  const handleDismiss = () => {
    triggerHaptic('light');
    dismissKeepPlayingToday();
    setIsDismissed(true);
  };

  const handleSinglePlayer = () => {
    triggerHaptic('selection');
    router.push(`/${language}/singleplayer`);
  };

  const handleMultiplayer = () => {
    triggerHaptic('selection');
    router.push(`/${language}/multiplayer`);
  };

  // Don't render if dismissed
  if (isDismissed) return null;

  // Different content based on success
  const content = isSuccess
    ? {
        icon: <Flame className="w-6 h-6" />,
        title: t('keepPlaying.succeeded.title'),
        message: t('keepPlaying.succeeded.message'),
        ctaSinglePlayer: t('keepPlaying.succeeded.ctaSinglePlayer'),
        ctaMultiplayer: t('keepPlaying.succeeded.ctaMultiplayer'),
        showMultiplayer: true,
        gradient: 'from-amber-500 to-orange-500',
        iconBg: 'bg-amber-400',
      }
    : {
        icon: <Dumbbell className="w-6 h-6" />,
        title: t('keepPlaying.struggled.title'),
        message: t('keepPlaying.struggled.message'),
        ctaSinglePlayer: t('keepPlaying.struggled.ctaSinglePlayer'),
        ctaMultiplayer: null,
        showMultiplayer: false,
        gradient: 'from-cyan-500 to-blue-500',
        iconBg: 'bg-cyan-400',
      };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={cn(
          'relative mt-4 rounded-neo-lg border-3 border-neo-black shadow-hard overflow-hidden',
          `bg-gradient-to-br ${content.gradient}`
        )}
      >
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 end-2 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors z-10"
          aria-label={t('common.dismiss') || 'Dismiss'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="px-4 py-4">
          {/* Header with icon */}
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-neo flex items-center justify-center border-2 border-neo-black',
              content.iconBg
            )}>
              {content.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-black text-neo-black text-sm uppercase tracking-wide">
                {content.title}
              </h3>
              <p className="text-xs text-neo-black/70 mt-0.5">
                {content.message}
              </p>
            </div>
          </div>

          {/* Efficiency/survival bonus context (if available) */}
          {isSuccess && (efficiencyScore !== undefined && efficiencyScore > 0 || timeSurvived !== undefined && timeSurvived > 60) && (
            <div className="mb-3 flex items-center gap-2 text-xs text-neo-black/80">
              <Zap className="w-3.5 h-3.5" />
              <span className="font-medium">
                {t('keepPlaying.succeeded.subtext')}
              </span>
            </div>
          )}

          {/* CTAs */}
          <div className={cn(
            'grid gap-2',
            content.showMultiplayer ? 'grid-cols-2' : 'grid-cols-1'
          )}>
            {/* Single Player CTA */}
            <Button
              onClick={handleSinglePlayer}
              className={cn(
                'py-2.5 font-bold text-sm border-2 border-neo-black rounded-neo shadow-hard-sm',
                'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 active:shadow-none transition-all',
                isSuccess
                  ? 'bg-white text-neo-black'
                  : 'bg-neo-cyan text-neo-black'
              )}
            >
              <User className="w-4 h-4 me-1.5" />
              {content.ctaSinglePlayer}
            </Button>

            {/* Multiplayer CTA - only for success */}
            {content.showMultiplayer && (
              <Button
                onClick={handleMultiplayer}
                className="py-2.5 font-bold text-sm bg-neo-pink text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 active:shadow-none transition-all"
              >
                <Users className="w-4 h-4 me-1.5" />
                {content.ctaMultiplayer}
              </Button>
            )}
          </div>

          {/* Dismiss text */}
          <button
            onClick={handleDismiss}
            className="w-full mt-2 text-[10px] text-neo-black/50 hover:text-neo-black/70 transition-colors"
          >
            {t('keepPlaying.dismiss')}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default KeepPlayingSection;
