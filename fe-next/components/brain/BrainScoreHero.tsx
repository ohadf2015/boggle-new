'use client';

import { m } from 'framer-motion';
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
  novice: { next: 'apprentice', min: 0, max: 19 },
  apprentice: { next: 'intermediate', min: 20, max: 39 },
  intermediate: { next: 'advanced', min: 40, max: 59 },
  advanced: { next: 'expert', min: 60, max: 79 },
  expert: { next: 'master', min: 80, max: 89 },
  master: { next: null, min: 90, max: 100 },
};

/**
 * Get progress bar gradient based on score
 * Creates a vibrant gradient that evolves with brain score
 * Low: Pink->Red, Medium: Orange->Yellow, High: Lime->Cyan
 */
function getProgressBarGradient(score: number): string {
  if (score < 20) return 'bg-linear-to-r from-neo-pink to-neo-red';
  if (score < 40) return 'bg-linear-to-r from-neo-red to-neo-orange';
  if (score < 60) return 'bg-linear-to-r from-neo-orange to-neo-yellow';
  if (score < 80) return 'bg-linear-to-r from-neo-yellow to-neo-lime';
  return 'bg-linear-to-r from-neo-lime to-neo-cyan';
}

/**
 * Get tier badge color
 */
function getTierBadgeColor(tier: string): string {
  switch (tier) {
    case 'novice': return 'bg-slate-400';
    case 'apprentice': return 'bg-neo-green';
    case 'intermediate': return 'bg-neo-cyan';
    case 'advanced': return 'bg-neo-purple';
    case 'expert': return 'bg-neo-orange';
    case 'master': return 'bg-neo-lime';
    default: return 'bg-slate-400';
  }
}

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
  const progressBarGradient = getProgressBarGradient(score);
  const tierBadgeColor = getTierBadgeColor(tier);

  // Total activities combines both games and drills for brain score
  const totalActivities = gamesAnalyzed + drillsCompleted;

  return (
    <div className={cn(
      'rounded-neo border-4 border-neo-black shadow-hard p-4 sm:p-6 relative overflow-hidden',
      isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
    )}>
      {/* Main Score Display */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Animated Brain Icon */}
          <m.div
            className={cn(
              'w-12 h-12 sm:w-16 sm:h-16 rounded-neo border-3 border-neo-black flex items-center justify-center shrink-0',
              tierBadgeColor
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
          </m.div>

          <div className="min-w-0">
            <p className={cn(
              'text-xs sm:text-sm font-bold uppercase tracking-wide',
              isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
            )}>
              {t('brain.score')}
            </p>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <m.span
                className={cn(
                  'text-3xl sm:text-5xl font-black',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black'
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {score}
              </m.span>
              <span className={cn(
                'text-base sm:text-xl font-bold',
                isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
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
            <m.button
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
            </m.button>
          )}

          {/* Activities Analyzed Badge */}
          <div className={cn(
            'text-right px-2 sm:px-3 py-1.5 sm:py-2 rounded-neo border-2 border-neo-black',
            isDarkMode ? 'bg-neo-navy-elevated' : 'bg-neo-cream'
          )}>
            <p className={cn(
              'text-[10px] sm:text-xs font-bold uppercase leading-tight',
              isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
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
              isDarkMode ? 'text-neo-lime' : 'text-neo-orange'
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
                isDarkMode ? 'text-neo-white' : 'text-neo-black/70'
              )}>
                {t(`brain.tiers.${nextTier}`)}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar with score markers */}
        <div className="relative">
          <div className={cn(
            'h-5 rounded-full border-2 border-neo-black overflow-hidden',
            isDarkMode ? 'bg-neo-navy' : 'bg-gray-300'
          )}>
            <m.div
              className={cn('h-full', progressBarGradient)}
              initial={{ width: 0 }}
              animate={{ width: `${tierProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          {/* Score markers showing current → next tier threshold */}
          {nextTier && (
            <div className="flex justify-between mt-1">
              <span className={cn(
                'text-xs font-bold',
                isDarkMode ? 'text-neo-white' : 'text-neo-black'
              )}>
                {score}
              </span>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                isDarkMode ? 'bg-neo-navy-elevated text-neo-lime' : 'bg-gray-200 text-neo-purple'
              )}>
                {tierConfig.max + 1 - score} {t('brain.pointsToGo')}
              </span>
              <span className={cn(
                'text-xs font-bold',
                isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
              )}>
                {tierConfig.max + 1}
              </span>
            </div>
          )}
          {!nextTier && (
            <div className="flex justify-center mt-1">
              <span className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                'bg-neo-lime text-neo-black'
              )}>
                {t('brain.maxTierReached')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
