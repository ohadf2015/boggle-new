'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Sparkles, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface BrainScoreHeroProps {
  score: number;
  tier: 'novice' | 'apprentice' | 'intermediate' | 'advanced' | 'expert' | 'master';
  tierProgress: number;
  gamesAnalyzed: number;
  drillsCompleted?: number;
  onShare?: () => void;
}

const TIER_CONFIG = {
  novice: { color: 'bg-slate-400', next: 'apprentice', min: 0, max: 19 },
  apprentice: { color: 'bg-neo-green', next: 'intermediate', min: 20, max: 39 },
  intermediate: { color: 'bg-neo-cyan', next: 'advanced', min: 40, max: 59 },
  advanced: { color: 'bg-neo-purple', next: 'expert', min: 60, max: 79 },
  expert: { color: 'bg-neo-orange', next: 'master', min: 80, max: 89 },
  master: { color: 'bg-neo-yellow', next: null, min: 90, max: 100 },
};

/**
 * Brain Score Hero Component
 * Displays the overall brain score with tier badge and progress indicator.
 */
export default function BrainScoreHero({
  score,
  tier,
  tierProgress,
  gamesAnalyzed,
  drillsCompleted = 0,
  onShare,
}: BrainScoreHeroProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';
  const tierConfig = TIER_CONFIG[tier];
  const nextTier = tierConfig.next;

  // Total activities combines both games and drills for brain score
  const totalActivities = gamesAnalyzed + drillsCompleted;

  return (
    <div className={cn(
      'rounded-neo border-4 border-neo-black shadow-hard p-4 sm:p-6 relative overflow-hidden',
      isDarkMode ? 'bg-slate-800' : 'bg-white'
    )}>
      {/* Main Score Display */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Animated Brain Icon */}
          <motion.div
            className={cn(
              'w-12 h-12 sm:w-16 sm:h-16 rounded-neo border-3 border-neo-black flex items-center justify-center shrink-0',
              tierConfig.color
            )}
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Brain className="w-7 h-7 sm:w-10 sm:h-10 text-neo-black" />
          </motion.div>

          <div className="min-w-0">
            <p className={cn(
              'text-xs sm:text-sm font-bold uppercase tracking-wide',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.score')}
            </p>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <motion.span
                className={cn(
                  'text-3xl sm:text-5xl font-black',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black'
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {score}
              </motion.span>
              <span className={cn(
                'text-base sm:text-xl font-bold',
                isDarkMode ? 'text-neo-white/50' : 'text-neo-black/50'
              )}>
                /100
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Activities + Share */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Share Button */}
          {onShare && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onShare}
              className={cn(
                'p-2 sm:p-3 rounded-neo border-2 border-neo-black',
                'shadow-hard-sm hover:shadow-hard hover:translate-y-[-2px]',
                'transition-all',
                isDarkMode ? 'bg-neo-cyan' : 'bg-neo-cyan',
                'text-neo-black'
              )}
              title={t('common.share')}
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          )}

          {/* Activities Analyzed Badge */}
          <div className={cn(
            'text-right px-2 sm:px-3 py-1.5 sm:py-2 rounded-neo border-2 border-neo-black',
            isDarkMode ? 'bg-slate-700' : 'bg-neo-cream'
          )}>
            <p className={cn(
              'text-[10px] sm:text-xs font-bold uppercase leading-tight',
              isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
            )}>
              {t('brain.activitiesAnalyzed')}
            </p>
            <p className={cn(
              'text-lg sm:text-xl font-black',
              isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
            )}>
              {totalActivities}
            </p>
          </div>
        </div>
      </div>

      {/* Tier Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className={cn(
              'w-4 h-4',
              isDarkMode ? 'text-neo-yellow' : 'text-neo-orange'
            )} />
            <span className={cn(
              'text-sm font-bold uppercase',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )}>
              {t(`brain.tiers.${tier}`)}
            </span>
          </div>
          {nextTier && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-neo-green" />
              <span className={cn(
                'text-xs font-medium',
                isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
              )}>
                {tierProgress}% {t('brain.toNextTier')} {t(`brain.tiers.${nextTier}`)}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className={cn(
          'h-4 rounded-full border-2 border-neo-black overflow-hidden',
          isDarkMode ? 'bg-slate-900' : 'bg-gray-200'
        )}>
          <motion.div
            className={cn('h-full', tierConfig.color)}
            initial={{ width: 0 }}
            animate={{ width: `${tierProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
