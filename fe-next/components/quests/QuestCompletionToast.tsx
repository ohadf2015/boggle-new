'use client';

/**
 * QuestCompletionToast — satisfying animated notification when a quest
 * is completed. Uses react-hot-toast with a custom render.
 *
 * Features:
 * - Animated entrance with neo-pop
 * - XP/gold reward display with glow
 * - Confetti-like particle burst (CSS-only)
 * - Auto-dismiss after 4s
 */

import toast from 'react-hot-toast';
import { Trophy, Star, Sparkles, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fireVictoryConfetti, fireFireworks } from '@/utils/confettiUtils';

interface QuestCompletionOptions {
  questName: string;
  xpReward: number;
  goldReward?: number;
  isGrandSlam?: boolean;
  isAllComplete?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Show a satisfying quest completion toast.
 * Call this when a quest/mission is completed.
 */
export function showQuestCompletionToast({
  questName,
  xpReward,
  goldReward,
  isGrandSlam = false,
  isAllComplete = false,
  t,
}: QuestCompletionOptions) {
  // Fire confetti based on achievement tier
  if (isAllComplete) {
    fireFireworks(4, 2500);
  } else if (isGrandSlam) {
    fireFireworks(3, 2000);
  } else {
    fireVictoryConfetti();
  }

  const bgStyle = isAllComplete
    ? 'bg-gradient-to-br from-neo-lime/20 via-neo-navy to-neo-cyan/10 border-neo-lime'
    : isGrandSlam
      ? 'bg-gradient-to-br from-neo-yellow/20 via-neo-navy to-neo-yellow/10 border-neo-yellow'
      : 'bg-neo-navy';

  const iconBg = isAllComplete
    ? 'bg-neo-lime shadow-[0_0_20px_rgba(191,255,0,0.4)]'
    : isGrandSlam
      ? 'bg-neo-yellow shadow-[0_0_20px_rgba(255,225,53,0.4)]'
      : 'bg-neo-lime shadow-[0_0_12px_rgba(191,255,0,0.3)]';

  const title = isAllComplete
    ? t('quests.allComplete')
    : isGrandSlam
      ? t('quests.completion.grandSlam')
      : questName;

  const rewardColor = isAllComplete
    ? 'text-neo-lime'
    : isGrandSlam
      ? 'text-neo-yellow'
      : 'text-neo-lime';

  toast.custom(
    (toastInstance) => (
      <div
        className={cn(
          'relative overflow-hidden',
          'max-w-sm w-full mx-auto',
          'rounded-neo-lg border-3 border-neo-black',
          'shadow-hard-lg',
          bgStyle,
          toastInstance.visible ? 'animate-neo-pop' : 'opacity-0 scale-75',
          'transition-all duration-300',
        )}
        role="status"
        aria-live="polite"
      >
        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-neo-white/5 to-transparent animate-shimmer pointer-events-none"
          aria-hidden="true"
        />

        {/* Particle burst effect — CSS pseudo elements */}
        <div className="absolute top-2 start-4 w-2 h-2 rounded-full bg-neo-yellow animate-burst" aria-hidden="true" />
        <div className="absolute top-4 end-6 w-1.5 h-1.5 rounded-full bg-neo-pink animate-burst [animation-delay:0.1s]" aria-hidden="true" />
        <div className="absolute bottom-3 start-8 w-1 h-1 rounded-full bg-neo-cyan animate-burst [animation-delay:0.2s]" aria-hidden="true" />
        <div className="absolute top-6 end-10 w-1.5 h-1.5 rounded-full bg-neo-lime animate-burst [animation-delay:0.15s]" aria-hidden="true" />

        <div className="relative flex items-center gap-3 p-4">
          {/* Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-12 h-12 flex items-center justify-center',
              'rounded-full border-3 border-neo-black',
              iconBg,
            )}
          >
            {isAllComplete ? (
              <Crown className="w-6 h-6 text-neo-black" aria-hidden="true" />
            ) : isGrandSlam ? (
              <Sparkles className="w-6 h-6 text-neo-black" aria-hidden="true" />
            ) : (
              <Trophy className="w-6 h-6 text-neo-black" aria-hidden="true" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-neo-display text-sm font-black text-neo-white truncate">
              {title}
            </p>
            {isAllComplete && (
              <p className="font-neo-body text-xs text-neo-white/70 mt-0.5">
                {t('quests.allCompleteDesc')}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1">
              {/* XP reward */}
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  'font-neo-display text-xs font-black',
                  rewardColor,
                )}
              >
                <Star className="w-3.5 h-3.5" aria-hidden="true" />
                {t('quests.completion.xpReward', { xp: xpReward })}
              </span>
              {/* Gold reward */}
              {goldReward && goldReward > 0 && (
                <span className="inline-flex items-center gap-1 font-neo-display text-xs font-black text-neo-yellow">
                  {t('quests.completion.goldReward', { gold: goldReward })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      duration: isAllComplete ? 6000 : isGrandSlam ? 5000 : 4000,
      position: 'top-center',
    },
  );
}
