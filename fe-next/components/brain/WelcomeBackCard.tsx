'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, X, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BrainTier } from '@/shared/types/cognitive';
import { SilentVideo } from '@/components/ui/SilentVideo';

interface WelcomeBackCardProps {
  /** Days since last activity */
  daysSinceLastActivity: number;
  /** User's current brain score */
  currentScore: number;
  /** User's personal best brain score */
  personalBest?: number;
  /** User's current tier */
  currentTier: BrainTier;
  /** User's highest achieved tier */
  highestTier?: BrainTier;
  /** Current streak count */
  currentStreak: number;
  /** Longest streak ever achieved */
  longestStreak: number;
  /** Callback when card is dismissed */
  onDismiss?: () => void;
  /** Storage key for dismissal persistence */
  storageKey?: string;
}

const TIER_ORDER: BrainTier[] = ['novice', 'apprentice', 'intermediate', 'advanced', 'expert', 'master'];

/**
 * WelcomeBackCard Component
 *
 * Displays a welcoming message for returning users, acknowledging their
 * previous achievements and encouraging them to continue. Designed to
 * reduce anxiety about returning after a break.
 *
 * Features:
 * - Shows personal best alongside current score
 * - Acknowledges highest tier achieved
 * - Frames returning positively ("rebuild your streak!")
 * - Auto-dismisses after viewing, won't show again for same session
 */
export default function WelcomeBackCard({
  daysSinceLastActivity,
  currentScore,
  personalBest,
  currentTier,
  highestTier,
  currentStreak,
  longestStreak,
  onDismiss,
  storageKey = 'brain-welcome-back-dismissed',
}: WelcomeBackCardProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if we should show the card
  useEffect(() => {
    // Only show if user has been away for 3+ days
    if (daysSinceLastActivity < 3) {
      return;
    }

    // Check if already dismissed this session
    const dismissed = sessionStorage.getItem(storageKey);
    if (dismissed) {
      return;
    }

    // Show the card with a slight delay for dramatic effect
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, [daysSinceLastActivity, storageKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(storageKey, 'true');
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  // Calculate encouraging stats
  const hasPersonalBest = personalBest && personalBest > currentScore;
  const hadHigherTier = highestTier && TIER_ORDER.indexOf(highestTier) > TIER_ORDER.indexOf(currentTier);
  const streakBroken = longestStreak > 0 && currentStreak === 0;

  // Get appropriate welcome message
  const getWelcomeMessage = () => {
    if (daysSinceLastActivity >= 30) {
      return t('brain.welcomeBack.longTime');
    }
    if (daysSinceLastActivity >= 14) {
      return t('brain.welcomeBack.twoWeeks');
    }
    return t('brain.welcomeBack.fewDays');
  };

  // Get motivational message based on user's state
  const getMotivationalMessage = () => {
    if (hadHigherTier) {
      return t('brain.welcomeBack.reachTier', { tier: t(`brain.tiers.${highestTier}`) });
    }
    if (hasPersonalBest) {
      return t('brain.welcomeBack.beatBest', { score: personalBest });
    }
    if (streakBroken) {
      return t('brain.welcomeBack.rebuildStreak');
    }
    return t('brain.welcomeBack.keepGrowing');
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <m.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={cn(
            'rounded-neo border-3 border-neo-black shadow-hard overflow-hidden',
            isDarkMode
              ? 'bg-linear-to-br from-neo-purple/20 to-neo-cyan/20'
              : 'bg-linear-to-br from-purple-100 to-cyan-100'
          )}
        >
          {/* Decorative top bar */}
          <div className="h-1.5 bg-linear-to-r from-neo-purple via-neo-cyan to-neo-lime" />

          <div className="p-4">
            {/* Header with dismiss button */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <SilentVideo
                  src="/mascot/encouraging.webp"
                  width={40}
                  height={40}
                  className="drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                  preload="metadata"
                  aria-hidden="true"
                />
                <h3 className={cn(
                  'text-lg font-black uppercase',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black'
                )}>
                  {t('brain.welcomeBack.title')}
                </h3>
              </div>
              <button
                onClick={handleDismiss}
                aria-label={t('common.close')}
                className={cn(
                  'p-1.5 rounded-neo border-2 border-neo-black',
                  'transition-all hover:bg-neo-red/20',
                  isDarkMode ? 'bg-neo-navy-elevated' : 'bg-white'
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Welcome message */}
            <p className={cn(
              'text-sm mb-4',
              isDarkMode ? 'text-neo-white' : 'text-neo-black/80'
            )}>
              {getWelcomeMessage()}
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {/* Current Score */}
              <div className={cn(
                'p-2 rounded-neo border-2 border-neo-black text-center',
                isDarkMode ? 'bg-neo-navy-elevated/50' : 'bg-white'
              )}>
                <p className={cn(
                  'text-[10px] font-bold uppercase mb-0.5',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black/60'
                )}>
                  {t('brain.welcomeBack.currentScore')}
                </p>
                <p className={cn(
                  'text-xl font-black',
                  isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
                )}>
                  {currentScore}
                </p>
              </div>

              {/* Personal Best */}
              {hasPersonalBest && (
                <div className={cn(
                  'p-2 rounded-neo border-2 border-neo-black text-center',
                  'bg-neo-lime/20'
                )}>
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Trophy className="w-3 h-3 text-neo-lime" />
                    <p className={cn(
                      'text-[10px] font-bold uppercase',
                      isDarkMode ? 'text-neo-white' : 'text-neo-black/60'
                    )}>
                      {t('brain.welcomeBack.personalBest')}
                    </p>
                  </div>
                  <p className={cn(
                    'text-xl font-black text-neo-lime'
                  )}>
                    {personalBest}
                  </p>
                </div>
              )}

              {/* Longest Streak */}
              <div className={cn(
                'p-2 rounded-neo border-2 border-neo-black text-center',
                isDarkMode ? 'bg-neo-navy-elevated/50' : 'bg-white'
              )}>
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Flame className={cn(
                    'w-3 h-3',
                    longestStreak > 0 ? 'text-neo-orange' : 'text-gray-400'
                  )} />
                  <p className={cn(
                    'text-[10px] font-bold uppercase',
                    isDarkMode ? 'text-neo-white' : 'text-neo-black/60'
                  )}>
                    {t('brain.welcomeBack.bestStreak')}
                  </p>
                </div>
                <p className={cn(
                  'text-xl font-black',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black'
                )}>
                  {longestStreak}
                </p>
              </div>
            </div>

            {/* Motivational message */}
            <div className={cn(
              'flex items-center gap-2 p-3 rounded-neo border-2 border-neo-black',
              'bg-linear-to-r from-neo-green/20 to-neo-cyan/20'
            )}>
              <TrendingUp className="w-5 h-5 text-neo-green shrink-0" />
              <p className={cn(
                'text-xs font-bold',
                isDarkMode ? 'text-neo-white' : 'text-neo-black'
              )}>
                {getMotivationalMessage()}
              </p>
            </div>

            {/* Days away indicator */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <Clock className={cn(
                'w-3 h-3',
                isDarkMode ? 'text-neo-white' : 'text-neo-black/40'
              )} />
              <p className={cn(
                'text-[10px]',
                isDarkMode ? 'text-neo-white' : 'text-neo-black/40'
              )}>
                {t('brain.welcomeBack.daysAway', { days: daysSinceLastActivity })}
              </p>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
