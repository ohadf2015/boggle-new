'use client';

/**
 * QuestCompletionToast — Satisfying animated celebration overlay when a quest
 * is completed. Uses react-hot-toast with a custom render.
 *
 * Features:
 * - Full-width overlay with confetti burst
 * - Animated entrance with bounce + scale
 * - XP/gold reward display with glow
 * - Tiered celebrations: normal < grandSlam < allComplete
 * - Auto-dismiss
 */

import toast from 'react-hot-toast';
import { Trophy, Star, Sparkles, Crown, Coins, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fireVictoryConfetti, fireFireworks } from '@/utils/confettiUtils';

interface QuestCompletionOptions {
  questName: string;
  xpReward: number;
  goldReward?: number;
  isGrandSlam?: boolean;
  isAllComplete?: boolean;
  /**
   * Stable, translation-independent key for in-memory dedup within a short
   * window (defends against double-invocation from the same tab). Cross-device
   * / cross-session dedup is handled server-side via player_daily_missions
   * celebrated flags — callers should only invoke this function when the
   * server has signalled the flag transitioned false→true.
   */
  dedupKey?: string;
  t?: (key: string, params?: Record<string, string | number>) => string;
  onComplete?: () => void;
}

// Short in-memory dedup window: swallows rapid duplicate invocations from the
// same tab (e.g. React strict-mode double-effect, concurrent state updates).
const recentToasts = new Set<string>();
const DEDUP_WINDOW_MS = 2000;

// Track quest toast IDs to dismiss only quest toasts, not all app toasts
let lastQuestToastId: string | null = null;

/**
 * Show a satisfying quest completion celebration.
 * Call this when a quest/mission is completed.
 */
export function showQuestCompletionToast({
  questName,
  xpReward,
  goldReward,
  isGrandSlam = false,
  isAllComplete = false,
  dedupKey,
  t = (k) => k,
  onComplete,
}: QuestCompletionOptions) {
  // Prefer caller-supplied stable key (translation-independent) so language
  // switches don't defeat dedup. Fall back to composite of variant flags.
  const key = dedupKey ?? `${questName}:${isGrandSlam}:${isAllComplete}`;
  if (recentToasts.has(key)) return;
  recentToasts.add(key);
  setTimeout(() => recentToasts.delete(key), DEDUP_WINDOW_MS);

  // Dismiss only the previous quest toast (if any) so only one shows at a
  // time — prevents the stacked-toast bug when multiple missions complete
  // near-simultaneously. Don't use bare toast.dismiss() which dismisses ALL toasts.
  if (lastQuestToastId) {
    toast.dismiss(lastQuestToastId);
  }

  onComplete?.();

  // Fire confetti based on achievement tier
  if (isAllComplete) {
    fireFireworks(4, 2500);
  } else if (isGrandSlam) {
    fireFireworks(3, 2000);
  } else {
    fireVictoryConfetti();
  }

  const bgGradient = isAllComplete
    ? 'from-neo-lime/30 via-neo-navy to-neo-cyan/20'
    : isGrandSlam
      ? 'from-neo-pink/30 via-neo-navy to-neo-lime/15'
      : 'from-neo-lime/20 via-neo-navy to-neo-navy';

  const borderColor = isAllComplete
    ? 'border-neo-lime'
    : isGrandSlam
      ? 'border-neo-pink'
      : 'border-neo-lime';

  const iconBg = isAllComplete
    ? 'bg-neo-lime shadow-[0_0_24px_rgba(191,255,0,0.5)]'
    : isGrandSlam
      ? 'bg-neo-pink shadow-[0_0_24px_rgba(255,20,147,0.5)]'
      : 'bg-neo-lime shadow-[0_0_16px_rgba(191,255,0,0.3)]';

  const title = isAllComplete
    ? t('quests.allComplete')
    : isGrandSlam
      ? t('quests.completion.grandSlam')
      : t('quests.completion.title');

  const subtitle = isAllComplete
    ? t('quests.allCompleteDesc')
    : isGrandSlam
      ? t('quests.completion.grandSlamDesc')
      : questName;

  const rewardColor = isAllComplete ? 'text-neo-lime' : isGrandSlam ? 'text-neo-pink' : 'text-neo-lime';

  // Generate a stable toast ID
  const toastId = `quest-toast-${dedupKey || key}-${Date.now()}`;

  toast.custom(
    (toastInstance) => (
      <div
        className={cn(
          'relative overflow-hidden',
          'w-full max-w-md mx-auto',
          'rounded-neo-lg border-3 border-neo-black',
          'shadow-hard-lg',
          'bg-linear-to-br',
          bgGradient,
          borderColor,
          toastInstance.visible
            ? 'animate-[celebrationPop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_forwards]'
            : 'opacity-0 scale-50',
          'transition-all duration-300',
        )}
        role="status"
        aria-live="assertive"
      >
        {/* Close button */}
        <button
          onClick={() => toast.dismiss(toastInstance.id)}
          className="absolute top-2 inset-e-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-neo-black/40 hover:bg-neo-black/60 text-neo-white hover:text-neo-white transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 bg-linear-to-r from-transparent via-neo-white/8 to-transparent animate-shimmer pointer-events-none"
          aria-hidden="true"
        />

        {/* Particle burst decorations */}
        <div className="absolute top-2 inset-s-4 w-2.5 h-2.5 rounded-full bg-neo-lime animate-burst" aria-hidden="true" />
        <div className="absolute top-5 inset-e-6 w-2 h-2 rounded-full bg-neo-pink animate-burst [animation-delay:0.1s]" aria-hidden="true" />
        <div className="absolute bottom-4 inset-s-8 w-1.5 h-1.5 rounded-full bg-neo-cyan animate-burst [animation-delay:0.2s]" aria-hidden="true" />
        <div className="absolute top-8 inset-e-10 w-2 h-2 rounded-full bg-neo-lime animate-burst [animation-delay:0.15s]" aria-hidden="true" />
        <div className="absolute bottom-2 inset-e-4 w-1.5 h-1.5 rounded-full bg-neo-pink animate-burst [animation-delay:0.25s]" aria-hidden="true" />

        <div className="relative flex flex-col items-center text-center gap-3 p-6">
          {/* Icon — larger and more prominent */}
          <div
            className={cn(
              'w-16 h-16 flex items-center justify-center',
              'rounded-full border-3 border-neo-black',
              iconBg,
              'animate-[iconBounce_0.6s_ease-out_0.2s_both]',
            )}
          >
            {isAllComplete ? (
              <Crown className="w-8 h-8 text-neo-black" aria-hidden="true" />
            ) : isGrandSlam ? (
              <Sparkles className="w-8 h-8 text-neo-black" aria-hidden="true" />
            ) : (
              <Trophy className="w-8 h-8 text-neo-black" aria-hidden="true" />
            )}
          </div>

          {/* Title */}
          <div>
            <p className="font-neo-display text-xl font-black text-neo-white leading-tight">
              {title}
            </p>
            {subtitle && (
              <p className="font-neo-body text-sm text-neo-white mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Rewards row */}
          <div className="flex items-center justify-center gap-4 mt-1">
            {/* XP reward */}
            <div
              className={cn(
                'flex items-center gap-1.5',
                'px-3 py-1.5 rounded-full',
                'bg-neo-black/30 border-2 border-neo-black',
                'font-neo-display text-sm font-black',
                rewardColor,
                'animate-[rewardSlide_0.4s_ease-out_0.4s_both]',
              )}
            >
              <Star className="w-4 h-4" aria-hidden="true" />
              {t('quests.completion.xpReward', { xp: xpReward })}
            </div>
            {/* Gold reward */}
            {goldReward && goldReward > 0 && (
              <div
                className={cn(
                  'flex items-center gap-1.5',
                  'px-3 py-1.5 rounded-full',
                  'bg-neo-black/30 border-2 border-neo-black',
                  'font-neo-display text-sm font-black text-yellow-400',
                  'animate-[rewardSlide_0.4s_ease-out_0.5s_both]',
                )}
              >
                <Coins className="w-4 h-4" aria-hidden="true" />
                {t('quests.completion.goldReward', { gold: goldReward })}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      id: toastId,
      duration: isAllComplete ? 6000 : isGrandSlam ? 5000 : 4000,
      position: 'top-center',
    },
  );

  // Remember this toast ID so next call can dismiss it specifically
  lastQuestToastId = toastId;
}
