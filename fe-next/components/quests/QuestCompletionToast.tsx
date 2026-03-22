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
import { Trophy, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestCompletionOptions {
  questName: string;
  xpReward: number;
  goldReward?: number;
  isGrandSlam?: boolean;
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
}: QuestCompletionOptions) {
  toast.custom(
    (t) => (
      <div
        className={cn(
          'relative overflow-hidden',
          'max-w-sm w-full mx-auto',
          'rounded-neo-lg border-3 border-neo-black',
          'shadow-hard-lg',
          isGrandSlam
            ? 'bg-gradient-to-br from-neo-yellow/20 via-neo-navy to-neo-yellow/10 border-neo-yellow'
            : 'bg-neo-navy',
          t.visible ? 'animate-neo-pop' : 'opacity-0 scale-75',
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
              isGrandSlam
                ? 'bg-neo-yellow shadow-[0_0_20px_rgba(255,225,53,0.4)]'
                : 'bg-neo-lime shadow-[0_0_12px_rgba(191,255,0,0.3)]',
            )}
          >
            {isGrandSlam ? (
              <Sparkles className="w-6 h-6 text-neo-black" aria-hidden="true" />
            ) : (
              <Trophy className="w-6 h-6 text-neo-black" aria-hidden="true" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-neo-display text-sm font-black text-neo-white truncate">
              {isGrandSlam ? 'GRAND SLAM!' : questName}
            </p>
            <div className="flex items-center gap-3 mt-1">
              {/* XP reward */}
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  'font-neo-display text-xs font-black',
                  isGrandSlam ? 'text-neo-yellow' : 'text-neo-lime',
                )}
              >
                <Star className="w-3.5 h-3.5" aria-hidden="true" />
                +{xpReward} XP
              </span>
              {/* Gold reward */}
              {goldReward && goldReward > 0 && (
                <span className="inline-flex items-center gap-1 font-neo-display text-xs font-black text-neo-yellow">
                  +{goldReward} Gold
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      duration: 4000,
      position: 'top-center',
    },
  );
}
